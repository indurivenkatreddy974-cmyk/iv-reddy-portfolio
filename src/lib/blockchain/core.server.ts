/**
 * Server-only blockchain + IPFS core.
 * Reads secrets from process.env at CALL TIME (never at module scope).
 * This file must never be imported from client-reachable module scope.
 */
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAINS, DEFAULT_CHAIN_ID, chainInfo } from "./chains";
import { VERIFICATION_ABI, OWNERSHIP_ABI } from "./artifacts";

export type Env = {
  rpcUrl: string;
  privateKey: Hex;
  pinataJwt: string;
};

export function readEnv(): Env {
  const rpcUrl = process.env["POLYGON_RPC_URL"];
  const rawKey = process.env["BLOCKCHAIN_PRIVATE_KEY"];
  const pinataJwt = process.env["PINATA_JWT"];
  const missing = [
    !rpcUrl && "POLYGON_RPC_URL",
    !rawKey && "BLOCKCHAIN_PRIVATE_KEY",
    !pinataJwt && "PINATA_JWT",
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(`Blockchain layer not configured. Missing: ${missing.join(", ")}`);
  }
  const privateKey = (rawKey!.startsWith("0x") ? rawKey! : `0x${rawKey!}`) as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("BLOCKCHAIN_PRIVATE_KEY is not a valid 32-byte hex key.");
  }
  return { rpcUrl: rpcUrl!, privateKey, pinataJwt: pinataJwt! };
}

function viemChain(chainId: number, rpcUrl: string) {
  const info = chainInfo(chainId);
  return defineChain({
    id: chainId,
    name: info.label,
    nativeCurrency: { name: info.currency, symbol: info.currency, decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: { default: { name: "Explorer", url: info.explorer } },
    testnet: info.testnet,
  });
}

/** Resolves the chain from the configured RPC endpoint itself — no guessing. */
export async function getClients() {
  const env = readEnv();
  const probe = createPublicClient({ transport: http(env.rpcUrl) });
  const chainId = await probe.getChainId();
  if (!CHAINS[chainId]) {
    throw new Error(
      `RPC endpoint reports unsupported chain ${chainId}. Supported: ${Object.keys(CHAINS).join(", ")}`,
    );
  }
  const chain = viemChain(chainId, env.rpcUrl);
  const account = privateKeyToAccount(env.privateKey);
  return {
    chainId: chainId || DEFAULT_CHAIN_ID,
    account,
    publicClient: createPublicClient({ chain, transport: http(env.rpcUrl) }),
    walletClient: createWalletClient({ account, chain, transport: http(env.rpcUrl) }),
  };
}

// ---------------------------------------------------------------- IPFS

const PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

export async function pinFile(
  bytes: Uint8Array,
  fileName: string,
  mime: string,
): Promise<{ cid: string; size: number }> {
  const { pinataJwt } = readEnv();
  const form = new FormData();
  form.append("file", new Blob([bytes as unknown as BlobPart], { type: mime || "application/octet-stream" }), fileName);
  form.append("pinataMetadata", JSON.stringify({ name: fileName }));
  const res = await fetch(PINATA_FILE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`IPFS pin failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { IpfsHash: string; PinSize: number };
  return { cid: json.IpfsHash, size: json.PinSize };
}

export async function pinJson(payload: unknown, name: string): Promise<string> {
  const { pinataJwt } = readEnv();
  const res = await fetch(PINATA_JSON_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pinataContent: payload, pinataMetadata: { name } }),
  });
  if (!res.ok) {
    throw new Error(`IPFS JSON pin failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return ((await res.json()) as { IpfsHash: string }).IpfsHash;
}

// ---------------------------------------------------------------- hashing

export async function sha256(bytes: Uint8Array): Promise<string> {
  const view = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", view.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export { VERIFICATION_ABI, OWNERSHIP_ABI };
