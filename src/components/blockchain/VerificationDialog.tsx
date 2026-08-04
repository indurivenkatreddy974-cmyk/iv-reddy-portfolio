"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  X,
  ExternalLink,
  Download,
  RefreshCw,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import {
  addressUrl,
  chainInfo,
  formatVerifiedDate,
  ipfsUrl,
  sha256Hex,
  shortHash,
  SUBJECT_LABELS,
  txUrl,
  type PublicRecord,
} from "@/lib/blockchain/chains";
import { verifyDocumentHash } from "@/lib/blockchain.functions";
import { triggerDocumentDownload } from "@/lib/document-utils";

type CheckState =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "authentic"; hash: string }
  | { phase: "modified"; hash: string }
  | { phase: "error"; message: string };

export function VerificationDialog({
  record,
  onClose,
}: {
  record: PublicRecord | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [check, setCheck] = useState<CheckState>({ phase: "idle" });
  const [copied, setCopied] = useState<string | null>(null);

  const open = Boolean(record);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    setCheck({ phase: "idle" });
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }, 40);
    return () => {
      window.clearTimeout(timer);
      restoreRef.current?.focus?.();
    };
  }, [open, record?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const copy = useCallback(async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }, []);

  const runCheck = useCallback(async () => {
    if (!record) return;
    setCheck({ phase: "running" });
    try {
      const source =
        record.ipfs_url ||
        (record.ipfs_cid ? ipfsUrl(record.ipfs_cid) : null) ||
        record.fallback_url;
      if (!source) throw new Error("No retrievable copy of this document.");
      const res = await fetch(source, { redirect: "follow" });
      if (!res.ok) throw new Error(`Could not retrieve the document (${res.status}).`);
      const hash = await sha256Hex(await res.arrayBuffer());
      const onChain = await verifyDocumentHash({ data: { sha256: hash } });
      const matches = hash.toLowerCase() === record.sha256.toLowerCase() && onChain.authentic;
      setCheck({ phase: matches ? "authentic" : "modified", hash });
    } catch (err) {
      setCheck({ phase: "error", message: err instanceof Error ? err.message : "Verification failed." });
    }
  }, [record]);

  return (
    <AnimatePresence>
      {open && record && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
          style={{ background: "rgba(4,4,8,0.82)", backdropFilter: "blur(14px)" }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-3xl p-6 sm:p-8 flex flex-col gap-5"
            style={{
              background: "linear-gradient(160deg, rgba(20,22,38,0.96), rgba(10,10,12,0.98))",
              border: "1px solid rgba(74,158,255,0.22)",
              boxShadow: "0 40px 120px -30px rgba(0,0,0,0.9)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-emerald-300/90">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  Blockchain Verified
                </div>
                <h2 id={titleId} className="mt-2 text-lg sm:text-xl font-medium text-[#D7E2EA] leading-snug break-words">
                  {record.title}
                </h2>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#D7E2EA]/45">
                  {SUBJECT_LABELS[record.subject_type] ?? record.subject_type}
                </p>
              </div>
              <button
                type="button"
                data-autofocus
                onClick={onClose}
                aria-label="Close verification details"
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border border-[#D7E2EA]/15 text-[#D7E2EA]/70 hover:text-white hover:border-[#4a9eff]/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <dl className="flex flex-col gap-3 text-sm">
              <Row label="Network" value={chainInfo(record.chain_id).label} />
              <Row
                label="Document Hash"
                value={shortHash(record.sha256, 12, 8)}
                full={record.sha256}
                onCopy={() => copy(record.sha256, "hash")}
                copied={copied === "hash"}
              />
              {record.ipfs_cid && (
                <Row
                  label="IPFS CID"
                  value={shortHash(record.ipfs_cid, 12, 6)}
                  full={record.ipfs_cid}
                  onCopy={() => copy(record.ipfs_cid!, "cid")}
                  copied={copied === "cid"}
                />
              )}
              {record.wallet_address && (
                <Row label="Wallet" value={shortHash(record.wallet_address, 10, 6)} full={record.wallet_address} />
              )}
              {record.tx_hash && (
                <Row label="Transaction" value={shortHash(record.tx_hash, 10, 8)} full={record.tx_hash} />
              )}
              {record.block_number != null && <Row label="Block" value={`#${record.block_number}`} />}
              <Row label="Verified" value={formatVerifiedDate(record.registered_at)} />
            </dl>

            <div
              className="rounded-2xl p-4 flex items-start gap-3 text-sm"
              style={{
                background:
                  check.phase === "modified" || check.phase === "error"
                    ? "rgba(239,68,68,0.09)"
                    : "rgba(16,185,129,0.08)",
                border:
                  check.phase === "modified" || check.phase === "error"
                    ? "1px solid rgba(239,68,68,0.3)"
                    : "1px solid rgba(16,185,129,0.25)",
              }}
              aria-live="polite"
            >
              {check.phase === "modified" || check.phase === "error" ? (
                <ShieldAlert className="w-4 h-4 mt-0.5 text-red-300 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-300 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                {check.phase === "idle" && (
                  <span className="text-[#D7E2EA]/70">
                    This fingerprint is anchored on {chainInfo(record.chain_id).label}. Run a live check to
                    re-download the file and compare its hash against the chain.
                  </span>
                )}
                {check.phase === "running" && <span className="text-[#D7E2EA]/70">Re-hashing the document…</span>}
                {check.phase === "authentic" && (
                  <span className="text-emerald-200">Authentic document — hash matches the on-chain record.</span>
                )}
                {check.phase === "modified" && (
                  <span className="text-red-200">
                    Document modified — the retrieved file does not match the anchored fingerprint.
                  </span>
                )}
                {check.phase === "error" && <span className="text-red-200">{check.message}</span>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runCheck()}
                disabled={check.phase === "running"}
                className="flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
                style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
              >
                {check.phase === "running" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                Verify Again
              </button>

              {record.tx_hash && (
                <a
                  href={txUrl(record.chain_id, record.tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/85 hover:text-white hover:border-[#4a9eff]/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Explorer
                </a>
              )}

              {(record.ipfs_url || record.fallback_url) && (
                <button
                  type="button"
                  onClick={() =>
                    void triggerDocumentDownload(
                      (record.ipfs_url || record.fallback_url)!,
                      record.file_name || record.title,
                    )
                  }
                  className="flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/85 hover:text-white hover:border-[#4a9eff]/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download
                </button>
              )}

              {record.wallet_address && (
                <a
                  href={addressUrl(record.chain_id, record.wallet_address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/85 hover:text-white hover:border-[#4a9eff]/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Wallet
                </a>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({
  label,
  value,
  full,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  full?: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#D7E2EA]/8 pb-2.5">
      <dt className="text-[10px] uppercase tracking-[0.25em] text-[#D7E2EA]/45 shrink-0">{label}</dt>
      <dd className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-xs text-[#D7E2EA]/85 truncate" title={full ?? value}>
          {value}
        </span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Copy ${label}`}
            className="shrink-0 text-[#D7E2EA]/50 hover:text-[#4a9eff] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff] rounded"
          >
            {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
        )}
      </dd>
    </div>
  );
}
