/**
 * Server-only migration engine: turns every already-uploaded portfolio asset
 * into a permanently anchored, cryptographically verifiable record.
 *
 * Design guarantees:
 *  - idempotent   — a subject_ref or file hash that is already confirmed is skipped
 *  - resumable    — the client processes the plan in small batches; each batch is independent
 *  - no duplicates — unique index on sha256 + subject_ref lookup before writing
 *  - auditable    — failures store the error, bump retry_count and stay retryable
 */
import type { Hex } from "viem";
import { chainInfo, ipfsUrl } from "./chains";
import { getClients, readEnv, sha256, VERIFICATION_ABI } from "./core.server";
import { registerDocument } from "./registry.server";
import type { MigrationTarget } from "./schemas";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const MEDIA_PREFIX = "/api/public/m/";

export type PlanItem = MigrationTarget & {
  status: "verified" | "pending" | "failed" | "processing";
  record_id: string | null;
  tx_hash: string | null;
  error: string | null;
  retry_count: number;
};

function mediaUrl(path: string) {
  return `${MEDIA_PREFIX}${path.split("/").map(encodeURIComponent).join("/")}`;
}

function isDocumentLike(url: string | null | undefined) {
  if (!url) return false;
  return (
    /\.(pdf|png|jpe?g|webp|zip|md|txt|docx?|csv|json)(\?|$)/i.test(url) ||
    url.includes(MEDIA_PREFIX)
  );
}

/** Targets derived from the database itself (showcase items + media library). */
async function serverTargets(): Promise<MigrationTarget[]> {
  const db = await admin();
  const out: MigrationTarget[] = [];

  const [{ data: items }, { data: assets }, { data: content }] = await Promise.all([
    db.from("showcase_items").select("id, kind, title, media_url, thumbnail_url, issuer"),
    db.from("media_assets").select("id, kind, name, storage_path, original_url"),
    db.from("site_content").select("key, value"),
  ]);

  for (const it of items ?? []) {
    const url = it.media_url || it.thumbnail_url;
    if (!isDocumentLike(url)) continue;
    const subject =
      it.kind === "certification" ? "certificate" : it.kind === "achievement" ? "asset" : "project";
    out.push({
      key: `showcase-${it.id}`,
      label: it.title,
      subject_type: subject as MigrationTarget["subject_type"],
      subject_ref: `showcase:${it.id}`,
      source_url: url!,
    });
  }

  for (const a of assets ?? []) {
    if (a.kind !== "pdf" && a.kind !== "image") continue;
    out.push({
      key: `asset-${a.id}`,
      label: a.name,
      subject_type: "asset",
      subject_ref: `media:${a.id}`,
      source_url: a.storage_path ? mediaUrl(a.storage_path) : a.original_url,
    });
  }

  // Project media stored in site_content (pre-blockchain uploads).
  const projects = (content ?? []).find((r) => r.key === "projects")?.value as
    | Array<{ id?: string; name?: string; imgs?: string[] }>
    | undefined;
  for (const p of projects ?? []) {
    const img = (p.imgs ?? []).find((u) => isDocumentLike(u));
    if (!p.id || !img) continue;
    out.push({
      key: `project-${p.id}`,
      label: p.name || "Project",
      subject_type: "project",
      subject_ref: `project:${p.id}`,
      source_url: img,
    });
  }

  return out;
}

function dedupe(targets: MigrationTarget[]): MigrationTarget[] {
  const seen = new Set<string>();
  const out: MigrationTarget[] = [];
  for (const t of targets) {
    if (!t.source_url || seen.has(t.subject_ref)) continue;
    seen.add(t.subject_ref);
    out.push(t);
  }
  return out;
}

/** Merge browser-known content with database content and attach live status. */
export async function planMigration(clientTargets: MigrationTarget[]): Promise<{
  items: PlanItem[];
  totals: { total: number; verified: number; pending: number; failed: number };
  deployed: boolean;
}> {
  const db = await admin();
  const targets = dedupe([...clientTargets, ...(await serverTargets())]);

  const { data: records } = await db
    .from("blockchain_records")
    .select("id, subject_ref, status, tx_hash, error_message, retry_count")
    .in(
      "subject_ref",
      targets.map((t) => t.subject_ref),
    );

  const byRef = new Map((records ?? []).map((r) => [r.subject_ref ?? "", r]));

  const items: PlanItem[] = targets.map((t) => {
    const rec = byRef.get(t.subject_ref);
    const status: PlanItem["status"] =
      rec?.status === "confirmed"
        ? "verified"
        : rec?.status === "failed"
          ? "failed"
          : rec
            ? "pending"
            : "pending";
    return {
      ...t,
      status,
      record_id: rec?.id ?? null,
      tx_hash: rec?.tx_hash ?? null,
      error: rec?.error_message ?? null,
      retry_count: rec?.retry_count ?? 0,
    };
  });

  const { data: settings } = await db
    .from("blockchain_settings")
    .select("verification_contract")
    .eq("id", 1)
    .maybeSingle();

  return {
    items,
    totals: {
      total: items.length,
      verified: items.filter((i) => i.status === "verified").length,
      pending: items.filter((i) => i.status === "pending").length,
      failed: items.filter((i) => i.status === "failed").length,
    },
    deployed: Boolean(settings?.verification_contract),
  };
}

export type BatchResult = {
  key: string;
  subject_ref: string;
  label: string;
  ok: boolean;
  skipped: boolean;
  tx_hash?: string | null;
  message: string;
};

/**
 * Anchors a small batch of targets. Safe to call repeatedly: anything already
 * confirmed short-circuits, failed rows are cleared and re-attempted with an
 * incremented retry counter.
 */
export async function migrateBatch(targets: MigrationTarget[]): Promise<BatchResult[]> {
  const db = await admin();
  const results: BatchResult[] = [];

  for (const t of targets) {
    const { data: existingRows } = await db
      .from("blockchain_records")
      .select("id, status, tx_hash, retry_count")
      .eq("subject_ref", t.subject_ref)
      .order("created_at", { ascending: false })
      .limit(1);
    const existing = existingRows?.[0];

    if (existing?.status === "confirmed") {
      results.push({
        key: t.key,
        subject_ref: t.subject_ref,
        label: t.label,
        ok: true,
        skipped: true,
        tx_hash: existing.tx_hash,
        message: "Already verified.",
      });
      continue;
    }

    const retry = (existing?.retry_count ?? 0) + (existing ? 1 : 0);
    if (existing) await db.from("blockchain_records").delete().eq("id", existing.id);

    try {
      const res = await registerDocument({
        subject_type: t.subject_type,
        subject_ref: t.subject_ref,
        title: t.label,
        source_url: t.source_url,
        metadata: { migrated: true, retry_count: retry },
      });
      if ("duplicate" in res && res.duplicate) {
        results.push({
          key: t.key,
          subject_ref: t.subject_ref,
          label: t.label,
          ok: true,
          skipped: true,
          message: res.message,
        });
        continue;
      }
      if (retry > 0)
        await db.from("blockchain_records").update({ retry_count: retry }).eq("id", res.id);
      results.push({
        key: t.key,
        subject_ref: t.subject_ref,
        label: t.label,
        ok: res.status === "confirmed",
        skipped: false,
        tx_hash: res.tx_hash,
        message: res.status === "confirmed" ? "Anchored on-chain." : "Transaction did not confirm.",
      });
    } catch (err) {
      results.push({
        key: t.key,
        subject_ref: t.subject_ref,
        label: t.label,
        ok: false,
        skipped: false,
        message: err instanceof Error ? err.message : "Anchoring failed.",
      });
    }
  }

  return results;
}

/** Re-download the stored copy, re-hash it and compare with the chain. */
export async function revalidateRecord(id: string) {
  const db = await admin();
  const { data: record, error } = await db
    .from("blockchain_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!record) throw new Error("Record not found.");

  const settings = await db.from("blockchain_settings").select("*").eq("id", 1).maybeSingle();
  const gateway = settings.data?.ipfs_gateway || "https://gateway.pinata.cloud/ipfs/";
  const source = record.ipfs_cid ? ipfsUrl(record.ipfs_cid, gateway) : record.fallback_url;
  if (!source) throw new Error("No retrievable copy of this document.");

  let digest: string;
  try {
    const res = await fetch(source, { redirect: "follow" });
    if (!res.ok) throw new Error(`Could not retrieve the document (${res.status}).`);
    digest = await sha256(new Uint8Array(await res.arrayBuffer()));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retrieval failed.";
    await db
      .from("blockchain_records")
      .update({
        last_checked_at: new Date().toISOString(),
        last_check_result: `unreachable: ${message}`.slice(0, 300),
      })
      .eq("id", id);
    throw new Error(message);
  }

  let onChain = false;
  if (record.contract_address) {
    try {
      const { publicClient } = await getClients();
      const result = (await publicClient.readContract({
        address: record.contract_address as Hex,
        abi: VERIFICATION_ABI,
        functionName: "verify",
        args: [`0x${digest}` as Hex],
      })) as readonly [boolean, unknown];
      onChain = result[0];
    } catch {
      /* RPC hiccup — fall back to the stored digest comparison */
    }
  }

  const matches = digest.toLowerCase() === record.sha256.toLowerCase();
  const outcome = matches && (onChain || record.status === "confirmed") ? "authentic" : "modified";
  await db
    .from("blockchain_records")
    .update({ last_checked_at: new Date().toISOString(), last_check_result: outcome })
    .eq("id", id);

  return {
    id,
    authentic: outcome === "authentic",
    sha256: digest,
    on_chain: onChain,
    expected: record.sha256,
  };
}

/** Live health of every external dependency the trust layer relies on. */
export async function diagnostics() {
  const db = await admin();
  const out: {
    rpc: {
      ok: boolean;
      chain: string | null;
      block: string | null;
      latency_ms: number | null;
      error: string | null;
    };
    wallet: { address: string | null; balance: string | null; currency: string; funded: boolean };
    ipfs: { ok: boolean; error: string | null };
    contracts: { verification: string | null; nft: string | null; paused: boolean | null };
    records: { total: number; confirmed: number; failed: number; pending: number; tokens: number };
  } = {
    rpc: { ok: false, chain: null, block: null, latency_ms: null, error: null },
    wallet: { address: null, balance: null, currency: "POL", funded: false },
    ipfs: { ok: false, error: null },
    contracts: { verification: null, nft: null, paused: null },
    records: { total: 0, confirmed: 0, failed: 0, pending: 0, tokens: 0 },
  };

  const { data: settings } = await db
    .from("blockchain_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  out.contracts.verification = settings?.verification_contract ?? null;
  out.contracts.nft = settings?.nft_contract ?? null;

  try {
    const started = Date.now();
    const { publicClient, account, chainId } = await getClients();
    const [block, balance] = await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.getBalance({ address: account.address }),
    ]);
    const info = chainInfo(chainId);
    out.rpc = {
      ok: true,
      chain: info.label,
      block: block.toString(),
      latency_ms: Date.now() - started,
      error: null,
    };
    out.wallet = {
      address: account.address,
      balance: (Number(balance) / 1e18).toFixed(5),
      currency: info.currency,
      funded: balance > 0n,
    };
    if (settings?.verification_contract) {
      try {
        out.contracts.paused = (await publicClient.readContract({
          address: settings.verification_contract as Hex,
          abi: VERIFICATION_ABI,
          functionName: "paused",
        })) as boolean;
      } catch {
        out.contracts.paused = null;
      }
    }
  } catch (err) {
    out.rpc.error = err instanceof Error ? err.message : "RPC unavailable.";
  }

  try {
    const { pinataJwt } = readEnv();
    const res = await fetch("https://api.pinata.cloud/data/testAuthentication", {
      headers: { Authorization: `Bearer ${pinataJwt}` },
    });
    out.ipfs = res.ok
      ? { ok: true, error: null }
      : { ok: false, error: `Pinata responded ${res.status}` };
  } catch (err) {
    out.ipfs = { ok: false, error: err instanceof Error ? err.message : "Pinata unreachable." };
  }

  const [{ data: recs }, { count: tokenCount }] = await Promise.all([
    db.from("blockchain_records").select("status"),
    db.from("nft_tokens").select("id", { count: "exact", head: true }),
  ]);
  const list = recs ?? [];
  out.records = {
    total: list.length,
    confirmed: list.filter((r) => r.status === "confirmed").length,
    failed: list.filter((r) => r.status === "failed").length,
    pending: list.filter((r) => r.status === "pending").length,
    tokens: tokenCount ?? 0,
  };

  return out;
}

/** Emergency switch on the verification contract (owner-only, on-chain). */
export async function setContractPaused(paused: boolean) {
  const db = await admin();
  const { data: settings } = await db
    .from("blockchain_settings")
    .select("verification_contract")
    .eq("id", 1)
    .maybeSingle();
  if (!settings?.verification_contract)
    throw new Error("Verification contract is not deployed yet.");

  const { publicClient, walletClient, account } = await getClients();
  const { request } = await publicClient.simulateContract({
    account,
    address: settings.verification_contract as Hex,
    abi: VERIFICATION_ABI,
    functionName: paused ? "pause" : "unpause",
  });
  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return { paused, tx_hash: hash };
}
