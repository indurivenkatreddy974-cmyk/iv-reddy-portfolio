"use client";
import { ShieldCheck } from "lucide-react";
import type { PublicRecord } from "@/lib/blockchain/chains";
import { chainInfo } from "@/lib/blockchain/chains";

/**
 * Compact "Blockchain Verified" pill. Opens the full verification panel.
 * Renders nothing when the item has no confirmed anchor.
 */
export function VerifiedBadge({
  record,
  onOpen,
  compact = false,
  className = "",
}: {
  record: PublicRecord | undefined;
  onOpen?: (record: PublicRecord) => void;
  compact?: boolean;
  className?: string;
}) {
  if (!record || record.status !== "confirmed") return null;
  const info = chainInfo(record.chain_id);
  const label = compact ? "Verified" : "Blockchain Verified";

  const content = (
    <>
      <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </>
  );

  const style = {
    background: "rgba(16,185,129,0.12)",
    border: "1px solid rgba(16,185,129,0.35)",
    color: "#6ee7b7",
  } as const;

  const base = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${className}`;

  if (!onOpen) {
    return (
      <span className={base} style={style} title={`Anchored on ${info.label}`}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(record);
      }}
      className={`${base} transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0C0C]`}
      style={style}
      aria-label={`${label} on ${info.label}. Open verification details.`}
    >
      {content}
    </button>
  );
}
