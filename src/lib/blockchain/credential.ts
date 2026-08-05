/**
 * W3C Verifiable Credential (JSON-LD) builders for anchored portfolio documents.
 * Client-safe: pure data mapping, no secrets and no server imports.
 */
import { chainInfo, ipfsUrl, SUBJECT_LABELS, txUrl, type PublicRecord } from "./chains";

export const SITE_ORIGIN = "https://iv-reddy-showcase.lovable.app";
export const ISSUER_ID = `${SITE_ORIGIN}/#person`;
export const ISSUER_NAME = "Induri Venkata Reddy";

export function credentialUrl(recordId: string, origin: string = SITE_ORIGIN) {
  return `${origin}/api/public/credential/${recordId}`;
}

export function verifyPageUrl(record?: Pick<PublicRecord, "sha256"> | null, origin: string = SITE_ORIGIN) {
  return record ? `${origin}/verify#${record.sha256}` : `${origin}/verify`;
}

/** A single W3C VerifiableCredential describing one on-chain anchored document. */
export function buildVerifiableCredential(record: PublicRecord, origin: string = SITE_ORIGIN) {
  const info = chainInfo(record.chain_id);
  const gateway = record.ipfs_url || (record.ipfs_cid ? ipfsUrl(record.ipfs_cid) : null);

  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/security/suites/blockchain-2021/v1",
    ],
    id: credentialUrl(record.id, origin),
    type: ["VerifiableCredential", "PortfolioDocumentCredential"],
    issuer: { id: ISSUER_ID, name: ISSUER_NAME, url: origin },
    issuanceDate: record.registered_at ?? undefined,
    name: record.title,
    description: `${SUBJECT_LABELS[record.subject_type] ?? "Document"} anchored on ${info.label} and pinned to IPFS.`,
    credentialSubject: {
      id: `${origin}/verify#${record.sha256}`,
      type: SUBJECT_LABELS[record.subject_type] ?? "Document",
      name: record.title,
      reference: record.subject_ref ?? undefined,
      digestSRI: `sha256-${record.sha256}`,
      digestAlgorithm: "SHA-256",
      digestValue: record.sha256,
      fileName: record.file_name ?? undefined,
      ipfsCid: record.ipfs_cid ?? undefined,
      url: gateway ?? record.fallback_url ?? undefined,
    },
    proof: record.tx_hash
      ? {
          type: "EthereumBlockchainAnchor2021",
          created: record.registered_at ?? undefined,
          chainId: record.chain_id,
          network: info.label,
          contractAddress: record.contract_address ?? undefined,
          transactionHash: record.tx_hash,
          blockNumber: record.block_number ?? undefined,
          verificationMethod: record.wallet_address ?? undefined,
          explorerUrl: txUrl(record.chain_id, record.tx_hash),
        }
      : undefined,
    credentialStatus: {
      type: "BlockchainRegistryStatus",
      status: record.status,
    },
  };
}

/** schema.org projection so search engines can index the verification page. */
export function buildCredentialSchema(record: PublicRecord, origin: string = SITE_ORIGIN) {
  const info = chainInfo(record.chain_id);
  return {
    "@type": "CreativeWork",
    "@id": `${origin}/verify#${record.sha256}`,
    name: record.title,
    url: `${origin}/verify#${record.sha256}`,
    creator: { "@id": ISSUER_ID },
    dateCreated: record.registered_at ?? undefined,
    additionalType: SUBJECT_LABELS[record.subject_type] ?? "Document",
    identifier: [
      { "@type": "PropertyValue", name: "SHA-256", value: record.sha256 },
      ...(record.ipfs_cid ? [{ "@type": "PropertyValue", name: "IPFS CID", value: record.ipfs_cid }] : []),
      ...(record.tx_hash
        ? [{ "@type": "PropertyValue", name: `${info.label} transaction`, value: record.tx_hash }]
        : []),
    ],
    subjectOf: { "@type": "WebPage", url: credentialUrl(record.id, origin), encodingFormat: "application/ld+json" },
  };
}

export function buildVerificationPageGraph(records: PublicRecord[], origin: string = SITE_ORIGIN) {
  const confirmed = records.filter((r) => r.status === "confirmed");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${origin}/verify#page`,
        url: `${origin}/verify`,
        name: "Blockchain Verified Credentials",
        description:
          "Independently verifiable, blockchain-anchored records of resume, certificates, internship letters and projects.",
        about: { "@id": ISSUER_ID },
        hasPart: confirmed.map((r) => buildCredentialSchema(r, origin)),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Verification", item: `${origin}/verify` },
        ],
      },
    ],
  };
}
