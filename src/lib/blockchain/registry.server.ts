/**
 * Server-only orchestration for the verification layer:
 * fetch bytes -> SHA-256 -> IPFS pin -> on-chain anchor -> database record.
 */
import { keccak256, toHex, type Hex } from "viem";
import {
  getClients,
  pinFile,
  pinJson,
  sha256,
  readEnv,
  VERIFICATION_ABI,
  OWNERSHIP_ABI,
} from "./core.server";
import { VERIFICATION_BYTECODE, OWNERSHIP_BYTECODE } from "./artifacts";
import { chainInfo, ipfsUrl } from "./chains";
import type { MintTokenPayload, RegisterDocumentPayload } from "./schemas";

const STORAGE_BUCKET = "showcase-media";
const MEDIA_PREFIX = "/api/public/m/";
const MAX_BYTES = 25 * 1024 * 1024;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function assertAdmin(userId: string) {
  const db = await admin();
  const { data, error } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

// ------------------------------------------------------------ public reads

export async function readPublicState() {
  const db = await admin();
  const [records, tokens, settings] = await Promise.all([
    db
      .from("blockchain_records")
      .select(
        "id, subject_type, subject_ref, title, file_name, sha256, ipfs_cid, ipfs_url, fallback_url, network, chain_id, contract_address, tx_hash, block_number, wallet_address, status, registered_at, metadata",
      )
      .order("registered_at", { ascending: false, nullsFirst: false }),
    db
      .from("nft_tokens")
      .select(
        "id, project_ref, project_name, description, artwork_url, metadata_cid, token_id, contract_address, network, chain_id, mint_tx_hash, owner_wallet, minted_at, status",
      )
      .eq("featured", true)
      .order("sort_order", { ascending: true }),
    db.from("blockchain_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  return {
    records: records.data ?? [],
    tokens: tokens.data ?? [],
    settings: settings.data ?? null,
  };
}

// ------------------------------------------------------------ source bytes

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function loadBytes(
  payload: RegisterDocumentPayload,
): Promise<{ bytes: Uint8Array; mime: string; name: string }> {
  const fallbackName = payload.file_name || `${payload.subject_type}-${Date.now()}`;
  if (payload.file_base64) {
    const bytes = base64ToBytes(payload.file_base64);
    if (bytes.byteLength === 0) throw new Error("Uploaded file is empty.");
    if (bytes.byteLength > MAX_BYTES) throw new Error("File exceeds the 25 MB verification limit.");
    return { bytes, mime: payload.mime || "application/octet-stream", name: fallbackName };
  }

  const src = payload.source_url!.trim();

  // App-hosted media -> read straight out of storage (no network round-trip).
  if (src.startsWith(MEDIA_PREFIX) || src.includes(MEDIA_PREFIX)) {
    const path = decodeURIComponent(
      src.slice(src.indexOf(MEDIA_PREFIX) + MEDIA_PREFIX.length).split("?")[0]!,
    );
    const db = await admin();
    const { data, error } = await db.storage.from(STORAGE_BUCKET).download(path);
    if (error || !data)
      throw new Error(`Could not read stored file: ${error?.message ?? "not found"}`);
    const buf = new Uint8Array(await data.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) throw new Error("File exceeds the 25 MB verification limit.");
    return {
      bytes: buf,
      mime: data.type || payload.mime || "application/octet-stream",
      name: path.split("/").pop() || fallbackName,
    };
  }

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    throw new Error("source_url must be an absolute https URL or an app media path.");
  }
  if (url.protocol !== "https:") throw new Error("Only https sources can be verified.");
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Could not download source (${res.status}).`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0) throw new Error("Source file is empty.");
  if (buf.byteLength > MAX_BYTES) throw new Error("File exceeds the 25 MB verification limit.");
  return {
    bytes: buf,
    mime: res.headers.get("content-type") || payload.mime || "application/octet-stream",
    name: url.pathname.split("/").pop() || fallbackName,
  };
}

// ------------------------------------------------------------ settings

async function currentSettings() {
  const db = await admin();
  const { data } = await db.from("blockchain_settings").select("*").eq("id", 1).maybeSingle();
  return data;
}

export async function deployContracts() {
  const { walletClient, publicClient, account, chainId } = await getClients();
  const info = chainInfo(chainId);
  const db = await admin();
  const existing = await currentSettings();

  const balance = await publicClient.getBalance({ address: account.address });
  if (balance === 0n) {
    throw new Error(
      `Deployer wallet ${account.address} has no ${info.currency} on ${info.label}. Fund it, then deploy again.`,
    );
  }

  let verification = existing?.verification_contract ?? null;
  let nft = existing?.nft_contract ?? null;

  if (!verification) {
    const hash = await walletClient.deployContract({
      abi: VERIFICATION_ABI,
      bytecode: VERIFICATION_BYTECODE,
      args: [account.address],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress)
      throw new Error("Verification contract deployment produced no address.");
    verification = receipt.contractAddress;
  }

  if (!nft) {
    const hash = await walletClient.deployContract({
      abi: OWNERSHIP_ABI,
      bytecode: OWNERSHIP_BYTECODE,
      args: ["Portfolio Digital Ownership", "PDO", account.address],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress)
      throw new Error("Ownership contract deployment produced no address.");
    nft = receipt.contractAddress;
  }

  const { error } = await db
    .from("blockchain_settings")
    .update({
      enabled: true,
      network: info.network,
      chain_id: chainId,
      explorer_base: info.explorer,
      verification_contract: verification,
      nft_contract: nft,
      wallet_address: account.address,
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);

  return {
    verification_contract: verification,
    nft_contract: nft,
    wallet_address: account.address,
    chain_id: chainId,
    network: info.network,
  };
}

// ------------------------------------------------------------ registration

export async function registerDocument(payload: RegisterDocumentPayload) {
  readEnv();
  const db = await admin();
  const settings = await currentSettings();
  if (!settings?.verification_contract) {
    throw new Error(
      "Verification contract is not deployed yet. Deploy it from the Blockchain tab first.",
    );
  }

  const { bytes, mime, name } = await loadBytes(payload);
  const digest = await sha256(bytes);

  const { data: dupe } = await db
    .from("blockchain_records")
    .select("id, title, tx_hash, status")
    .eq("sha256", digest)
    .maybeSingle();
  if (dupe) {
    return {
      duplicate: true as const,
      id: dupe.id,
      sha256: digest,
      message: `Already anchored as "${dupe.title}".`,
    };
  }

  const { cid } = await pinFile(bytes, name, mime);
  const gateway = settings.ipfs_gateway || "https://gateway.pinata.cloud/ipfs/";

  const { chainId, publicClient, walletClient, account } = await getClients();
  const info = chainInfo(chainId);

  const { data: inserted, error: insertError } = await db
    .from("blockchain_records")
    .insert({
      subject_type: payload.subject_type,
      subject_ref: payload.subject_ref || null,
      title: payload.title,
      file_name: name,
      mime,
      size_bytes: bytes.byteLength,
      sha256: digest,
      ipfs_cid: cid,
      ipfs_url: ipfsUrl(cid, gateway),
      fallback_url: payload.source_url || null,
      network: info.network,
      chain_id: chainId,
      contract_address: settings.verification_contract,
      wallet_address: account.address,
      status: "pending",
      metadata: (payload.metadata ?? {}) as never,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: settings.verification_contract as Hex,
      abi: VERIFICATION_ABI,
      functionName: "registerDocument",
      args: [`0x${digest}` as Hex, cid, payload.subject_type, payload.subject_ref || payload.title],
    });
    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    await db
      .from("blockchain_records")
      .update({
        tx_hash: hash,
        block_number: Number(receipt.blockNumber),
        status: receipt.status === "success" ? "confirmed" : "failed",
        registered_at: new Date().toISOString(),
      })
      .eq("id", inserted.id);

    return {
      duplicate: false as const,
      id: inserted.id,
      sha256: digest,
      ipfs_cid: cid,
      tx_hash: hash,
      chain_id: chainId,
      network: info.network,
      status: receipt.status === "success" ? "confirmed" : "failed",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Blockchain write failed";
    await db
      .from("blockchain_records")
      .update({ status: "failed", error_message: message.slice(0, 500) })
      .eq("id", inserted.id);
    throw new Error(message);
  }
}

// ------------------------------------------------------------ verification

export async function verifyDigest(digest: string) {
  const db = await admin();
  const lower = digest.toLowerCase();
  const { data: record } = await db
    .from("blockchain_records")
    .select("*")
    .eq("sha256", lower)
    .maybeSingle();

  const settings = await currentSettings();
  let onChain: {
    authentic: boolean;
    timestamp: string | null;
    version: number | null;
    issuer: string | null;
    ipfs_cid: string | null;
  } = {
    authentic: false,
    timestamp: null,
    version: null,
    issuer: null,
    ipfs_cid: null,
  };

  if (settings?.verification_contract) {
    try {
      const { publicClient } = await getClients();
      const result = (await publicClient.readContract({
        address: settings.verification_contract as Hex,
        abi: VERIFICATION_ABI,
        functionName: "verify",
        args: [`0x${lower}` as Hex],
      })) as readonly [
        boolean,
        { timestamp: bigint; version: number; issuer: string; ipfsCid: string },
      ];
      const [authentic, rec] = result;
      onChain = {
        authentic,
        timestamp: authentic ? new Date(Number(rec.timestamp) * 1000).toISOString() : null,
        version: authentic ? Number(rec.version) : null,
        issuer: authentic ? rec.issuer : null,
        ipfs_cid: authentic ? rec.ipfsCid : null,
      };
    } catch {
      // RPC hiccup: fall back to the database record below.
    }
  }

  return {
    sha256: lower,
    authentic: onChain.authentic || record?.status === "confirmed",
    on_chain: onChain,
    record: record ?? null,
    explorer: record?.tx_hash
      ? `${chainInfo(record.chain_id).explorer}/tx/${record.tx_hash}`
      : null,
  };
}

// ------------------------------------------------------------ NFT minting

export async function mintProjectToken(payload: MintTokenPayload) {
  const db = await admin();
  const settings = await currentSettings();
  if (!settings?.nft_contract) {
    throw new Error(
      "Ownership contract is not deployed yet. Deploy it from the Blockchain tab first.",
    );
  }

  const { data: existing } = await db
    .from("nft_tokens")
    .select("id, token_id")
    .eq("project_ref", payload.project_ref)
    .maybeSingle();
  if (existing?.token_id) {
    return { duplicate: true as const, id: existing.id, token_id: existing.token_id };
  }

  const { chainId, publicClient, walletClient, account } = await getClients();
  const info = chainInfo(chainId);
  const owner = (payload.owner_wallet || account.address) as Hex;

  const metadataCid = await pinJson(
    {
      name: payload.project_name,
      description: payload.description ?? `Verified ownership record for ${payload.project_name}.`,
      image: payload.artwork_url ?? undefined,
      external_url: payload.artwork_url ?? undefined,
      attributes: [
        { trait_type: "Project Ref", value: payload.project_ref },
        { trait_type: "Network", value: info.label },
        { trait_type: "Issued", value: new Date().toISOString() },
      ],
    },
    `${payload.project_ref}-metadata`,
  );
  const tokenUri = `ipfs://${metadataCid}`;

  const rowId =
    existing?.id ??
    (
      await db
        .from("nft_tokens")
        .insert({
          project_ref: payload.project_ref,
          project_name: payload.project_name,
          description: payload.description ?? null,
          artwork_url: payload.artwork_url ?? null,
          metadata_cid: metadataCid,
          contract_address: settings.nft_contract,
          network: info.network,
          chain_id: chainId,
          owner_wallet: owner,
          sort_order: payload.sort_order,
          status: "pending",
        })
        .select("id")
        .single()
    ).data?.id;
  if (!rowId) throw new Error("Could not create the ownership record.");

  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: settings.nft_contract as Hex,
      abi: OWNERSHIP_ABI,
      functionName: "mintProject",
      args: [owner, payload.project_ref, tokenUri],
    });
    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const tokenId = (await publicClient.readContract({
      address: settings.nft_contract as Hex,
      abi: OWNERSHIP_ABI,
      functionName: "tokenOfProject",
      args: [payload.project_ref],
    })) as bigint;

    await db
      .from("nft_tokens")
      .update({
        token_id: tokenId.toString(),
        metadata_cid: metadataCid,
        mint_tx_hash: hash,
        minted_at: new Date().toISOString(),
        status: receipt.status === "success" ? "confirmed" : "failed",
      })
      .eq("id", rowId);

    return {
      duplicate: false as const,
      id: rowId,
      token_id: tokenId.toString(),
      tx_hash: hash,
      chain_id: chainId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mint failed";
    await db
      .from("nft_tokens")
      .update({ status: "failed", error_message: message.slice(0, 500) })
      .eq("id", rowId);
    throw new Error(message);
  }
}

// ------------------------------------------------------------ misc

export async function walletStatus() {
  const { publicClient, account, chainId } = await getClients();
  const info = chainInfo(chainId);
  const balance = await publicClient.getBalance({ address: account.address });
  return {
    address: account.address,
    chain_id: chainId,
    network: info.network,
    label: info.label,
    currency: info.currency,
    balance: (Number(balance) / 1e18).toFixed(5),
    funded: balance > 0n,
  };
}

/** Deterministic idempotency key used to block replayed admin submissions. */
export function submissionKey(input: string) {
  return keccak256(toHex(input));
}

// ------------------------------------------------------------ auto anchoring

/**
 * Best-effort anchoring used by the admin upload pipeline. Never throws:
 * uploads must succeed even when the chain is disabled, undeployed or busy.
 */
export async function autoAnchor(payload: RegisterDocumentPayload) {
  const settings = await currentSettings();
  if (!settings?.enabled)
    return { anchored: false as const, reason: "Blockchain layer is disabled." };
  if (!settings.verification_contract) {
    return { anchored: false as const, reason: "Verification contract is not deployed yet." };
  }
  try {
    const result = await registerDocument(payload);
    if ("duplicate" in result && result.duplicate) {
      return { anchored: false as const, reason: result.message, duplicate: true as const };
    }
    return { anchored: true as const, ...result };
  } catch (err) {
    return {
      anchored: false as const,
      reason: err instanceof Error ? err.message : "Anchoring failed.",
    };
  }
}
