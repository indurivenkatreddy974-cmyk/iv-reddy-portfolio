import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowLeft, FileJson } from "lucide-react";
import { getVerificationState } from "@/lib/blockchain.functions";
import type { PublicRecord } from "@/lib/blockchain/chains";
import {
  chainInfo,
  formatVerifiedDate,
  shortHash,
  SUBJECT_LABELS,
  txUrl,
} from "@/lib/blockchain/chains";
import {
  buildVerificationPageGraph,
  credentialUrl,
  SITE_ORIGIN,
} from "@/lib/blockchain/credential";
import { VerificationDialog } from "@/components/blockchain/VerificationDialog";
import { VerifiedBadge } from "@/components/blockchain/VerifiedBadge";
import { WalletConnect } from "@/components/blockchain/WalletConnect";

async function loadRecords(): Promise<{ records: PublicRecord[] }> {
  try {
    const state = await getVerificationState();
    return { records: (state.records ?? []) as unknown as PublicRecord[] };
  } catch {
    return { records: [] as PublicRecord[] };
  }
}

const TITLE = "Blockchain Verified Credentials — IV Reddy";
const DESCRIPTION =
  "Every resume, certificate, internship letter and flagship project is fingerprinted with SHA-256, pinned to IPFS and anchored on-chain. Verify independently — no wallet required.";

export const Route = createFileRoute("/verify")({
  loader: () => loadRecords(),
  head: ({ loaderData }) => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_ORIGIN}/verify` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_ORIGIN}/verify` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          buildVerificationPageGraph(loaderData?.records ?? [], SITE_ORIGIN),
        ),
      },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { records } = Route.useLoaderData() as { records: PublicRecord[] };
  const [active, setActive] = useState<PublicRecord | null>(null);
  const confirmed = records.filter((r) => r.status === "confirmed");

  return (
    <main
      className="min-h-screen px-5 sm:px-8 md:px-10 py-16 sm:py-24"
      style={{ background: "#0C0C0C" }}
    >
      <div className="max-w-5xl mx-auto">
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
          Verified Credentials
        </h1>
        <p className="text-[#D7E2EA]/70 font-light leading-relaxed max-w-2xl mb-14">
          {DESCRIPTION}
        </p>

        {confirmed.length === 0 ? (
          <p className="text-[#D7E2EA]/50 font-light">
            No documents have been anchored on-chain yet. Check back shortly.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 list-none p-0">
            {confirmed.map((r) => (
              <li key={r.id} id={r.sha256}>
                <article
                  className="rounded-3xl p-6 h-full flex flex-col gap-3"
                  style={{
                    background: "linear-gradient(160deg, rgba(20,22,38,0.75), rgba(12,12,12,0.75))",
                    border: "1px solid rgba(215,226,234,0.1)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#4a9eff]">
                      {SUBJECT_LABELS[r.subject_type] ?? "Document"}
                    </span>
                    <VerifiedBadge record={r} compact onOpen={setActive} />
                  </div>
                  <h2 className="font-medium uppercase tracking-wide text-[#D7E2EA] text-lg leading-tight">
                    {r.title}
                  </h2>
                  <dl className="grid grid-cols-1 gap-1.5 text-[11px] mt-1">
                    <div className="min-w-0">
                      <dt className="uppercase tracking-[0.2em] text-[#D7E2EA]/40">SHA-256</dt>
                      <dd className="font-mono text-[#D7E2EA]/85 truncate" title={r.sha256}>
                        {shortHash(r.sha256, 16, 10)}
                      </dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-[0.2em] text-[#D7E2EA]/40">Anchored</dt>
                      <dd className="text-[#D7E2EA]/85">
                        {formatVerifiedDate(r.registered_at)} · {chainInfo(r.chain_id).label}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap items-center gap-2 mt-auto pt-3">
                    <button
                      type="button"
                      onClick={() => setActive(r)}
                      className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
                      style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Verify
                    </button>
                    {r.tx_hash && (
                      <a
                        href={txUrl(r.chain_id, r.tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/80 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
                      >
                        Explorer
                      </a>
                    )}
                    <a
                      href={credentialUrl(r.id, SITE_ORIGIN)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/80 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
                    >
                      <FileJson className="w-3.5 h-3.5" aria-hidden="true" /> Credential
                    </a>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      <VerificationDialog record={active} onClose={() => setActive(null)} />
    </main>
  );
}
