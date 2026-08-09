import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileJson, Gem, ShieldCheck, ExternalLink } from "lucide-react";
import { getVerificationState } from "@/lib/blockchain.functions";
import type { PublicRecord, PublicSettings, PublicToken } from "@/lib/blockchain/chains";
import {
  addressUrl,
  chainInfo,
  formatVerifiedDate,
  ipfsUrl,
  shortHash,
  SUBJECT_LABELS,
  tokenUrl,
  txUrl,
} from "@/lib/blockchain/chains";
import {
  buildOwnershipPageGraph,
  credentialUrl,
  SITE_ORIGIN,
  tokenCredentialUrl,
} from "@/lib/blockchain/credential";
import { VerificationDialog } from "@/components/blockchain/VerificationDialog";
import { WalletConnect } from "@/components/blockchain/WalletConnect";

type OwnershipData = {
  records: PublicRecord[];
  tokens: PublicToken[];
  settings: PublicSettings | null;
};

async function loadOwnership(): Promise<OwnershipData> {
  try {
    const state = await getVerificationState();
    return {
      records: (state.records ?? []) as unknown as PublicRecord[],
      tokens: (state.tokens ?? []) as unknown as PublicToken[],
      settings: (state.settings ?? null) as unknown as PublicSettings | null,
    };
  } catch {
    return { records: [], tokens: [], settings: null };
  }
}

const TITLE = "Digital Ownership & Verification — IV Reddy";
const DESCRIPTION =
  "A live summary of blockchain-anchored resume, certificates and projects, ERC-721 digital ownership tokens, and the full on-chain verification history.";

export const Route = createFileRoute("/ownership")({
  loader: () => loadOwnership(),
  head: ({ loaderData }) => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_ORIGIN}/ownership` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_ORIGIN}/ownership` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          buildOwnershipPageGraph(loaderData?.records ?? [], loaderData?.tokens ?? [], SITE_ORIGIN),
        ),
      },
    ],
  }),
  component: OwnershipPage,
});

const CARD = {
  background: "linear-gradient(160deg, rgba(20,22,38,0.75), rgba(12,12,12,0.75))",
  border: "1px solid rgba(215,226,234,0.1)",
} as const;

function OwnershipPage() {
  const { records, tokens, settings } = Route.useLoaderData() as OwnershipData;
  const [active, setActive] = useState<PublicRecord | null>(null);

  const confirmed = records.filter((r) => r.status === "confirmed");
  const minted = tokens.filter((t) => t.status === "confirmed" && t.token_id);
  const resume = confirmed.filter((r) => r.subject_type === "resume");
  const certificates = confirmed.filter((r) =>
    ["certificate", "completion_certificate", "offer_letter"].includes(r.subject_type),
  );
  const projects = confirmed.filter((r) => r.subject_type === "project");
  const info = chainInfo(settings?.chain_id);

  return (
    <main
      className="min-h-screen px-5 sm:px-8 md:px-10 py-16 sm:py-24"
      style={{ background: "#0C0C0C" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#D7E2EA]/70 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff] rounded-full px-3 py-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to portfolio
          </Link>
          <WalletConnect />
        </div>

        <h1
          className="hero-heading font-black uppercase leading-none tracking-tight mb-6"
          style={{ fontSize: "clamp(2.2rem, 8vw, 96px)" }}
        >
          Digital Ownership
        </h1>
        <p className="text-[#D7E2EA]/70 font-light leading-relaxed max-w-2xl mb-12">
          {DESCRIPTION}
        </p>

        {/* Summary */}
        <section aria-labelledby="summary-heading" className="mb-16">
          <h2 id="summary-heading" className="sr-only">
            Verification summary
          </h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Resume anchors" value={resume.length} />
            <Stat label="Certificates & letters" value={certificates.length} />
            <Stat label="Verified projects" value={projects.length} />
            <Stat label="Ownership tokens" value={minted.length} />
          </dl>
        </section>

        {/* Chain status */}
        <section aria-labelledby="chain-heading" className="mb-16">
          <h2
            id="chain-heading"
            className="text-[11px] uppercase tracking-[0.3em] text-[#4a9eff] mb-4"
          >
            Blockchain status
          </h2>
          <div
            className="rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]"
            style={CARD}
          >
            <Field label="Network" value={info.label} />
            <Field
              label="Layer"
              value={settings?.enabled ? "Active — anchoring enabled" : "Idle — anchoring disabled"}
            />
            <Field
              label="Verification contract"
              value={settings?.verification_contract ?? "Not deployed"}
              href={
                settings?.verification_contract
                  ? addressUrl(settings.chain_id, settings.verification_contract)
                  : undefined
              }
              mono
            />
            <Field
              label="Ownership contract (ERC-721)"
              value={settings?.nft_contract ?? "Not deployed"}
              href={
                settings?.nft_contract
                  ? addressUrl(settings.chain_id, settings.nft_contract)
                  : undefined
              }
              mono
            />
          </div>
        </section>

        {/* Ownership tokens */}
        <section aria-labelledby="tokens-heading" className="mb-16">
          <h2
            id="tokens-heading"
            className="text-[11px] uppercase tracking-[0.3em] text-[#4a9eff] mb-4"
          >
            ERC-721 ownership tokens
          </h2>
          {minted.length === 0 ? (
            <p className="text-[#D7E2EA]/50 font-light text-sm">
              No projects have been minted yet.
            </p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0">
              {minted.map((t) => (
                <li key={t.id} id={`token-${t.id}`}>
                  <article className="rounded-3xl p-6 h-full flex flex-col gap-3" style={CARD}>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#D7E2EA]/50">
                      <Gem className="w-3.5 h-3.5 text-[#7621B0]" aria-hidden="true" /> Minted ·{" "}
                      {chainInfo(t.chain_id).label}
                    </div>
                    <h3 className="font-medium uppercase tracking-wide text-[#D7E2EA] text-lg leading-tight">
                      {t.project_name}
                    </h3>
                    {t.description && (
                      <p className="text-sm text-[#D7E2EA]/60 font-light line-clamp-3">
                        {t.description}
                      </p>
                    )}
                    <dl className="grid grid-cols-1 gap-1.5 text-[11px] mt-1">
                      <Field label="Token ID" value={`#${t.token_id}`} mono />
                      <Field label="Minted" value={formatVerifiedDate(t.minted_at) || "—"} />
                      {t.metadata_cid && (
                        <Field
                          label="Metadata (IPFS)"
                          value={shortHash(t.metadata_cid, 12, 8)}
                          href={ipfsUrl(t.metadata_cid, settings?.ipfs_gateway)}
                          mono
                        />
                      )}
                    </dl>
                    <div className="flex flex-wrap gap-2 mt-auto pt-3">
                      {t.contract_address && t.token_id && (
                        <Pill href={tokenUrl(t.chain_id, t.contract_address, t.token_id)}>
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Explorer
                        </Pill>
                      )}
                      <Pill href={tokenCredentialUrl(t.id, SITE_ORIGIN)}>
                        <FileJson className="w-3.5 h-3.5" aria-hidden="true" /> Credential
                      </Pill>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Verification history */}
        <section aria-labelledby="history-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2
              id="history-heading"
              className="text-[11px] uppercase tracking-[0.3em] text-[#4a9eff]"
            >
              Verification history
            </h2>
            <a
              href={`${SITE_ORIGIN}/api/public/credentials`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/80 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
            >
              <FileJson className="w-3.5 h-3.5" aria-hidden="true" /> All credentials (JSON-LD)
            </a>
          </div>

          {confirmed.length === 0 ? (
            <p className="text-[#D7E2EA]/50 font-light text-sm">
              No documents have been anchored on-chain yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3 list-none p-0">
              {confirmed.map((r) => (
                <li key={r.id}>
                  <article
                    className="rounded-2xl p-4 sm:p-5 flex flex-wrap items-center gap-x-6 gap-y-3"
                    style={CARD}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-[#D7E2EA]/40">
                        {SUBJECT_LABELS[r.subject_type] ?? "Document"}
                      </div>
                      <div className="text-[#D7E2EA] text-sm font-medium truncate">{r.title}</div>
                      <div
                        className="font-mono text-[11px] text-[#D7E2EA]/50 truncate"
                        title={r.sha256}
                      >
                        {shortHash(r.sha256, 18, 10)}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#D7E2EA]/60">
                      {formatVerifiedDate(r.registered_at)} · {chainInfo(r.chain_id).label}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActive(r)}
                        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2 rounded-full text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
                        style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Verify
                      </button>
                      {r.tx_hash && (
                        <Pill href={txUrl(r.chain_id, r.tx_hash)}>
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Explorer
                        </Pill>
                      )}
                      <Pill href={credentialUrl(r.id, SITE_ORIGIN)}>
                        <FileJson className="w-3.5 h-3.5" aria-hidden="true" /> Credential
                      </Pill>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <VerificationDialog record={active} onClose={() => setActive(null)} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl p-5" style={CARD}>
      <dt className="text-[10px] uppercase tracking-[0.25em] text-[#D7E2EA]/40">{label}</dt>
      <dd className="text-3xl font-black text-[#D7E2EA] mt-1">{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  href,
  mono = false,
}: {
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="uppercase tracking-[0.2em] text-[#D7E2EA]/40">{label}</dt>
      <dd className={`truncate text-[#D7E2EA]/85 ${mono ? "font-mono" : ""}`} title={value}>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff] rounded"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function Pill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/80 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
    >
      {children}
    </a>
  );
}
