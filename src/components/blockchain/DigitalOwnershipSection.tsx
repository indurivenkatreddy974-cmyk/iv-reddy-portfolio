"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Gem, ExternalLink } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { useVerification } from "@/lib/blockchain/useVerification";
import { chainInfo, formatVerifiedDate, shortHash, tokenUrl, txUrl } from "@/lib/blockchain/chains";

export function DigitalOwnershipSection() {
  const { tokens, enabled } = useVerification();
  const minted = tokens.filter((t) => t.status === "confirmed" && t.token_id);

  if (!enabled || minted.length === 0) return null;

  return (
    <section
      id="digital-ownership"
      aria-labelledby="digital-ownership-heading"
      className="px-5 sm:px-8 md:px-10 py-24 sm:py-32 relative"
      style={{ background: "#0C0C0C" }}
    >
      <FadeIn delay={0} y={40} className="text-center mb-6">
        <h2
          id="digital-ownership-heading"
          className="hero-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.25rem, 9vw, 130px)" }}
        >
          Digital Ownership
        </h2>
      </FadeIn>

      <FadeIn delay={0.15} y={20} className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
        <p
          className="text-[#D7E2EA]/70 font-light leading-relaxed"
          style={{ fontSize: "clamp(0.95rem, 1.4vw, 1.15rem)" }}
        >
          Selected flagship projects minted as on-chain ownership records — cryptographic proof of
          authorship, independently verifiable on a public explorer.
        </p>
      </FadeIn>

      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto list-none p-0">
        {minted.map((t, i) => (
          <li key={t.id}>
            <FadeIn delay={i * 0.1} y={40}>
              <TokenCard token={t} />
            </FadeIn>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TokenCard({ token }: { token: ReturnType<typeof useVerification>["tokens"][number] }) {
  const [imgFailed, setImgFailed] = useState(false);
  const info = chainInfo(token.chain_id);
  const explorer =
    token.contract_address && token.token_id
      ? tokenUrl(token.chain_id, token.contract_address, token.token_id)
      : token.mint_tx_hash
        ? txUrl(token.chain_id, token.mint_tx_hash)
        : null;

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-3xl overflow-hidden flex flex-col h-full"
      style={{
        background: "linear-gradient(160deg, rgba(20,22,38,0.75), rgba(12,12,12,0.75))",
        border: "1px solid rgba(215,226,234,0.1)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(118,33,176,0.45), 0 25px 60px -20px rgba(118,33,176,0.4)",
        }}
        aria-hidden="true"
      />

      <div className="relative aspect-square overflow-hidden bg-[#0a0a0a]">
        {token.artwork_url && !imgFailed ? (
          <img
            src={token.artwork_url}
            alt={`Artwork for ${token.project_name}`}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(118,33,176,0.24), transparent 60%), radial-gradient(circle at 80% 80%, rgba(74,158,255,0.2), transparent 60%)",
            }}
          >
            <Gem className="w-20 h-20 text-[#D7E2EA]/25" aria-hidden="true" />
          </div>
        )}
        <div
          className="absolute top-3 left-3 text-[10px] uppercase tracking-widest text-white px-2.5 py-1 rounded-full"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {info.label}
        </div>
      </div>

      <div className="p-6 flex flex-col gap-3 flex-1">
        <h3 className="font-medium uppercase tracking-wide text-[#D7E2EA] text-lg leading-tight">
          {token.project_name}
        </h3>
        {token.description && (
          <p className="text-sm text-[#D7E2EA]/60 font-light leading-relaxed line-clamp-3">
            {token.description}
          </p>
        )}

        <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          <div>
            <dt className="uppercase tracking-[0.2em] text-[#D7E2EA]/40">Token ID</dt>
            <dd className="font-mono text-[#D7E2EA]/85">#{token.token_id}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.2em] text-[#D7E2EA]/40">Minted</dt>
            <dd className="text-[#D7E2EA]/85">{formatVerifiedDate(token.minted_at)}</dd>
          </div>
          {token.owner_wallet && (
            <div className="col-span-2 min-w-0">
              <dt className="uppercase tracking-[0.2em] text-[#D7E2EA]/40">Owner Wallet</dt>
              <dd className="font-mono text-[#D7E2EA]/85 truncate" title={token.owner_wallet}>
                {shortHash(token.owner_wallet, 10, 6)}
              </dd>
            </div>
          )}
        </dl>

        {explorer && (
          <a
            href={explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto pt-3 inline-flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/85 hover:text-white hover:border-[#7621B0]/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            View on Explorer
          </a>
        )}
      </div>
    </motion.article>
  );
}
