/**
 * W3C Verifiable Credential (JSON-LD) builders for anchored portfolio documents.
 * Client-safe: pure data mapping, no secrets and no server imports.
 */
import {
  chainInfo,
  ipfsUrl,
  SUBJECT_LABELS,
  txUrl,
  type PublicRecord,
  type PublicToken,
} from "./chains";

export const SITE_ORIGIN = "https://iv-reddy-showcase.lovable.app";
export const ISSUER_ID = `${SITE_ORIGIN}/#person`;
export const ISSUER_NAME = "Induri Venkata Reddy";

export function credentialUrl(recordId: string, origin: string = SITE_ORIGIN) {
  return `${origin}/api/public/credential/${recordId}`;
}

export function verifyPageUrl(
  record?: Pick<PublicRecord, "sha256"> | null,
  origin: string = SITE_ORIGIN,
) {
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
      ...(record.ipfs_cid
        ? [{ "@type": "PropertyValue", name: "IPFS CID", value: record.ipfs_cid }]
        : []),
      ...(record.tx_hash
        ? [{ "@type": "PropertyValue", name: `${info.label} transaction`, value: record.tx_hash }]
        : []),
    ],
    subjectOf: {
      "@type": "WebPage",
      url: credentialUrl(record.id, origin),
      encodingFormat: "application/ld+json",
    },
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

// ---------------------------------------------------------------- ownership

export function tokenCredentialUrl(tokenRowId: string, origin: string = SITE_ORIGIN) {
  return `${origin}/api/public/credential/token/${tokenRowId}`;
}

/** W3C VerifiableCredential describing an ERC-721 digital ownership token. */
export function buildOwnershipCredential(token: PublicToken, origin: string = SITE_ORIGIN) {
  const info = chainInfo(token.chain_id);
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/security/suites/blockchain-2021/v1",
    ],
    id: tokenCredentialUrl(token.id, origin),
    type: ["VerifiableCredential", "DigitalOwnershipCredential"],
    issuer: { id: ISSUER_ID, name: ISSUER_NAME, url: origin },
    issuanceDate: token.minted_at ?? undefined,
    name: token.project_name,
    description:
      token.description ?? `ERC-721 ownership record for ${token.project_name} on ${info.label}.`,
    credentialSubject: {
      id: `${origin}/ownership#token-${token.id}`,
      type: "CreativeWork",
      name: token.project_name,
      reference: token.project_ref ?? undefined,
      image: token.artwork_url ?? undefined,
      tokenStandard: "ERC-721",
      tokenId: token.token_id ?? undefined,
      contractAddress: token.contract_address ?? undefined,
      metadataUri: token.metadata_cid ? `ipfs://${token.metadata_cid}` : undefined,
      metadataUrl: token.metadata_cid ? ipfsUrl(token.metadata_cid) : undefined,
      owner: token.owner_wallet ?? undefined,
    },
    proof: token.mint_tx_hash
      ? {
          type: "EthereumBlockchainAnchor2021",
          created: token.minted_at ?? undefined,
          chainId: token.chain_id,
          network: info.label,
          contractAddress: token.contract_address ?? undefined,
          transactionHash: token.mint_tx_hash,
          verificationMethod: token.owner_wallet ?? undefined,
          explorerUrl: txUrl(token.chain_id, token.mint_tx_hash),
        }
      : undefined,
    credentialStatus: { type: "BlockchainRegistryStatus", status: token.status },
  };
}

export function buildTokenSchema(token: PublicToken, origin: string = SITE_ORIGIN) {
  const info = chainInfo(token.chain_id);
  return {
    "@type": "CreativeWork",
    "@id": `${origin}/ownership#token-${token.id}`,
    name: token.project_name,
    description: token.description ?? undefined,
    url: `${origin}/ownership`,
    image: token.artwork_url ?? undefined,
    creator: { "@id": ISSUER_ID },
    dateCreated: token.minted_at ?? undefined,
    additionalType: "DigitalOwnershipToken",
    identifier: [
      ...(token.token_id
        ? [{ "@type": "PropertyValue", name: "ERC-721 Token ID", value: token.token_id }]
        : []),
      ...(token.contract_address
        ? [
            {
              "@type": "PropertyValue",
              name: `${info.label} contract`,
              value: token.contract_address,
            },
          ]
        : []),
      ...(token.metadata_cid
        ? [{ "@type": "PropertyValue", name: "Metadata CID", value: token.metadata_cid }]
        : []),
    ],
    subjectOf: {
      "@type": "WebPage",
      url: tokenCredentialUrl(token.id, origin),
      encodingFormat: "application/ld+json",
    },
  };
}

/** Structured data for the Digital Ownership summary page. */
export function buildOwnershipPageGraph(
  records: PublicRecord[],
  tokens: PublicToken[],
  origin: string = SITE_ORIGIN,
) {
  const confirmedRecords = records.filter((r) => r.status === "confirmed");
  const mintedTokens = tokens.filter((t) => t.status === "confirmed" && t.token_id);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${origin}/ownership#page`,
        url: `${origin}/ownership`,
        name: "Digital Ownership & Verification Summary",
        description:
          "Blockchain-anchored resume, certificates and projects plus ERC-721 digital ownership tokens, with a full verification history.",
        about: { "@id": ISSUER_ID },
        hasPart: [
          ...mintedTokens.map((t) => buildTokenSchema(t, origin)),
          ...confirmedRecords.map((r) => buildCredentialSchema(r, origin)),
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: "Digital Ownership",
            item: `${origin}/ownership`,
          },
        ],
      },
    ],
  };
}
