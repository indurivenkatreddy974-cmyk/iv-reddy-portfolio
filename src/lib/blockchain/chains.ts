/**
 * Client-safe blockchain constants and helpers.
 * No secrets, no node/viem imports — safe to ship in the browser bundle.
 */

export type ChainInfo = {
  chainId: number;
  network: string;
  label: string;
  explorer: string;
  currency: string;
  testnet: boolean;
};

export const CHAINS: Record<number, ChainInfo> = {
  137: {
    chainId: 137,
    network: "polygon",
    label: "Polygon Mainnet",
    explorer: "https://polygonscan.com",
    currency: "POL",
    testnet: false,
  },
  80002: {
    chainId: 80002,
    network: "polygon-amoy",
    label: "Polygon Amoy",
    explorer: "https://amoy.polygonscan.com",
    currency: "POL",
    testnet: true,
  },
  1: {
    chainId: 1,
    network: "ethereum",
    label: "Ethereum Mainnet",
    explorer: "https://etherscan.io",
    currency: "ETH",
    testnet: false,
  },
  11155111: {
    chainId: 11155111,
    network: "sepolia",
    label: "Ethereum Sepolia",
    explorer: "https://sepolia.etherscan.io",
    currency: "ETH",
    testnet: true,
  },
};

export const DEFAULT_CHAIN_ID = 80002;

export function chainInfo(chainId: number | null | undefined): ChainInfo {
  return CHAINS[chainId ?? DEFAULT_CHAIN_ID] ?? CHAINS[DEFAULT_CHAIN_ID]!;
}

export function txUrl(chainId: number | null | undefined, txHash: string) {
  return `${chainInfo(chainId).explorer}/tx/${txHash}`;
}

export function addressUrl(chainId: number | null | undefined, address: string) {
  return `${chainInfo(chainId).explorer}/address/${address}`;
}

export function tokenUrl(chainId: number | null | undefined, contract: string, tokenId: string) {
  return `${chainInfo(chainId).explorer}/nft/${contract}/${tokenId}`;
}

export function ipfsUrl(cid: string, gateway = "https://gateway.pinata.cloud/ipfs/") {
  const clean = cid.replace(/^ipfs:\/\//, "");
  return `${gateway.replace(/\/?$/, "/")}${clean}`;
}

export function shortHash(value: string | null | undefined, lead = 8, tail = 6) {
  if (!value) return "";
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

export function formatVerifiedDate(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return (
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(new Date(iso)) + " UTC"
    );
  } catch {
    return iso;
  }
}

export type VerificationSubject =
  | "resume"
  | "certificate"
  | "offer_letter"
  | "completion_certificate"
  | "project"
  | "research_paper"
  | "asset";

export const SUBJECT_LABELS: Record<VerificationSubject, string> = {
  resume: "Resume",
  certificate: "Certificate",
  offer_letter: "Offer Letter",
  completion_certificate: "Completion Certificate",
  project: "Project",
  research_paper: "Research Paper",
  asset: "Portfolio Asset",
};

export type PublicRecord = {
  id: string;
  subject_type: VerificationSubject;
  subject_ref: string | null;
  title: string;
  file_name: string | null;
  sha256: string;
  ipfs_cid: string | null;
  ipfs_url: string | null;
  fallback_url: string | null;
  network: string;
  chain_id: number;
  contract_address: string | null;
  tx_hash: string | null;
  block_number: number | null;
  wallet_address: string | null;
  status: "pending" | "confirmed" | "failed";
  registered_at: string | null;
  metadata: Record<string, unknown>;
};

export type PublicToken = {
  id: string;
  project_ref: string | null;
  project_name: string;
  description: string | null;
  artwork_url: string | null;
  metadata_cid: string | null;
  token_id: string | null;
  contract_address: string | null;
  network: string;
  chain_id: number;
  mint_tx_hash: string | null;
  owner_wallet: string | null;
  minted_at: string | null;
  status: "pending" | "confirmed" | "failed";
};

export type PublicSettings = {
  enabled: boolean;
  network: string;
  chain_id: number;
  explorer_base: string;
  verification_contract: string | null;
  nft_contract: string | null;
  wallet_address: string | null;
  ipfs_gateway: string;
};

/** Browser-side SHA-256 of an ArrayBuffer, hex encoded. */
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
