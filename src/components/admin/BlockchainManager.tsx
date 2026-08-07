"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Rocket,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  ExternalLink,
  Anchor,
  Gem,
  RefreshCw,
} from "lucide-react";
import {
  deleteVerificationRecord,
  deployVerificationContracts,
  getSystemDiagnostics,
  getVerificationState,
  getWalletStatus,
  mintOwnershipToken,
  planExistingMigration,
  revalidateVerificationRecord,
  runMigrationBatch,
  setVerificationPaused,
  updateBlockchainSettings,
} from "@/lib/blockchain.functions";
import { verificationRef } from "@/lib/blockchain/useVerification";
import {
  addressUrl,
  chainInfo,
  formatVerifiedDate,
  shortHash,
  SUBJECT_LABELS,
  txUrl,
  type PublicRecord,
  type PublicSettings,
  type PublicToken,
  type VerificationSubject,
} from "@/lib/blockchain/chains";
import { useContent } from "@/lib/content-store";
import { normalizeUrl } from "@/lib/document-utils";

type AnchorTask = {
  key: string;
  label: string;
  subject_type: VerificationSubject;
  subject_ref: string;
  source_url: string;
};

type PlanItem = AnchorTask & {
  status: "verified" | "pending" | "failed" | "processing";
  record_id: string | null;
  tx_hash: string | null;
  error: string | null;
  retry_count: number;
};

export function BlockchainManager() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  const deploy = useServerFn(deployVerificationContracts);
  
  const mint = useServerFn(mintOwnershipToken);
  const removeRecord = useServerFn(deleteVerificationRecord);
  const saveSettings = useServerFn(updateBlockchainSettings);
  const readState = useServerFn(getVerificationState);
  const readWallet = useServerFn(getWalletStatus);
  const buildPlan = useServerFn(planExistingMigration);
  const migrate = useServerFn(runMigrationBatch);
  const diagnose = useServerFn(getSystemDiagnostics);
  const pauseContract = useServerFn(setVerificationPaused);
  const revalidate = useServerFn(revalidateVerificationRecord);


  const state = useQuery({
    queryKey: ["blockchain", "admin-state"],
    queryFn: () => readState(),
    refetchInterval: 30_000,
  });
  const wallet = useQuery({
    queryKey: ["blockchain", "wallet"],
    queryFn: () => readWallet(),
    retry: false,
    refetchInterval: 60_000,
  });

  const settings = (state.data?.settings ?? null) as PublicSettings | null;
  const records = (state.data?.records ?? []) as unknown as PublicRecord[];
  const tokens = (state.data?.tokens ?? []) as unknown as PublicToken[];
  const deployed = Boolean(settings?.verification_contract && settings?.nft_contract);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["blockchain"] });
  };

  const run = async (key: string, fn: () => Promise<unknown>, okText: string) => {
    setBusy(key);
    setMessage(null);
    try {
      await fn();
      setMessage({ tone: "ok", text: okText });
      refresh();
    } catch (err) {
      setMessage({ tone: "err", text: err instanceof Error ? err.message : "Operation failed." });
    } finally {
      setBusy(null);
    }
  };

  // ---- portfolio documents that can be anchored -------------------------
  const content = useContent();


  const tasks = useMemo<AnchorTask[]>(() => {
    const out: AnchorTask[] = [];
    const resume = normalizeUrl(content.media?.resumeUrl);
    if (resume) {
      out.push({
        key: "resume",
        label: "Resume",
        subject_type: "resume",
        subject_ref: verificationRef("resume", "main"),
        source_url: resume,
      });
    }
    for (const c of content.certifications ?? []) {
      const url = normalizeUrl(c.pdfUrl);
      if (!url) continue;
      out.push({
        key: `cert-${c.id}`,
        label: `${c.name} — ${c.issuer}`,
        subject_type: "certificate",
        subject_ref: verificationRef("certificate", c.id),
        source_url: url,
      });
    }
    for (const i of content.internships ?? []) {
      const cert = normalizeUrl(i.certificateUrl);
      if (cert) {
        out.push({
          key: `int-cert-${i.id}`,
          label: `${i.company} — Completion Certificate`,
          subject_type: "completion_certificate",
          subject_ref: verificationRef("internship", i.id, "certificate"),
          source_url: cert,
        });
      }
      const offer = normalizeUrl(i.offerLetterUrl);
      if (offer) {
        out.push({
          key: `int-offer-${i.id}`,
          label: `${i.company} — Offer Letter`,
          subject_type: "offer_letter",
          subject_ref: verificationRef("internship", i.id, "offer"),
          source_url: offer,
        });
      }
    }
    return out;
  }, [content]);

  const plan = useQuery({
    queryKey: ["blockchain", "migration-plan", tasks.map((t) => t.subject_ref).join("|")],
    queryFn: () => buildPlan({ data: { targets: tasks } }),
    retry: false,
  });
  const health = useQuery({
    queryKey: ["blockchain", "diagnostics"],
    queryFn: () => diagnose(),
    retry: false,
    refetchInterval: 60_000,
  });

  const planItems = (plan.data?.items ?? []) as PlanItem[];
  const planTotals = plan.data?.totals ?? { total: 0, verified: 0, pending: 0, failed: 0 };
  const migratable = planItems.filter((i) => i.status !== "verified");

  /** Batched, resumable migration loop with live progress + per-item results. */
  const runMigration = async (items: PlanItem[]) => {
    if (items.length === 0) return;
    const key = items.length === 1 ? `one-${items[0]!.key}` : items.some((i) => i.status === "failed") && items.length === planTotals.failed ? "migrate-failed" : "migrate";
    setBusy(key);
    setMessage(null);
    setProgress({ done: 0, total: items.length, current: items[0]!.label });

    let ok = 0;
    let failed = 0;
    for (let i = 0; i < items.length; i += 2) {
      const slice = items.slice(i, i + 2);
      setProgress({ done: i, total: items.length, current: slice.map((s) => s.label).join(", ") });
      try {
        const batch = await migrate({
          data: {
            targets: slice.map((t) => ({
              key: t.key,
              label: t.label,
              subject_type: t.subject_type,
              subject_ref: t.subject_ref,
              source_url: t.source_url,
            })),
          },
        });
        setResults((prev) => {
          const next = { ...prev };
          for (const r of batch) next[r.subject_ref] = { ok: r.ok, message: r.message };
          return next;
        });
        for (const r of batch) (r.ok ? ok++ : failed++);
      } catch (err) {
        failed += slice.length;
        const text = err instanceof Error ? err.message : "Batch failed.";
        setResults((prev) => {
          const next = { ...prev };
          for (const s of slice) next[s.subject_ref] = { ok: false, message: text };
          return next;
        });
      }
    }

    setProgress({ done: items.length, total: items.length, current: "Finished." });
    setBusy(null);
    setMessage({
      tone: failed === 0 ? "ok" : "err",
      text: `Migration finished — ${ok} verified${failed ? `, ${failed} failed (retryable)` : ""}.`,
    });
    refresh();
  };


  const info = chainInfo(settings?.chain_id ?? wallet.data?.chain_id);

  return (
    <div className="flex flex-col gap-6">
      {message && (
        <div
          role="status"
          className={`rounded-2xl px-5 py-4 text-sm ${message.tone === "ok" ? "text-emerald-300" : "text-rose-300"}`}
          style={{
            background: message.tone === "ok" ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)",
            border: `1px solid ${message.tone === "ok" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Deploy status */}
      <Panel title="Deployment Status">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Stat label="Network" value={info.label} />
          <Stat
            label="Layer"
            value={settings?.enabled ? "Enabled" : "Disabled"}
            tone={settings?.enabled ? "ok" : "warn"}
          />
          <Stat
            label="Verification contract"
            value={settings?.verification_contract ? shortHash(settings.verification_contract, 10, 8) : "Not deployed"}
            href={settings?.verification_contract ? addressUrl(info.chainId, settings.verification_contract) : undefined}
            tone={settings?.verification_contract ? "ok" : "warn"}
          />
          <Stat
            label="Ownership (NFT) contract"
            value={settings?.nft_contract ? shortHash(settings.nft_contract, 10, 8) : "Not deployed"}
            href={settings?.nft_contract ? addressUrl(info.chainId, settings.nft_contract) : undefined}
            tone={settings?.nft_contract ? "ok" : "warn"}
          />
        </div>

        <div className="flex flex-wrap gap-3 mt-2">
          <Action
            onClick={() => run("deploy", () => deploy(), "Contracts deployed and the layer is live.")}
            busy={busy === "deploy"}
            icon={Rocket}
            primary
            disabled={deployed}
          >
            {deployed ? "Contracts deployed" : "Deploy contracts"}
          </Action>
          <Action
            onClick={() =>
              run(
                "toggle",
                () => saveSettings({ data: { enabled: !settings?.enabled } }),
                settings?.enabled ? "Verification layer hidden from the site." : "Verification layer is live.",
              )
            }
            busy={busy === "toggle"}
            icon={settings?.enabled ? ShieldAlert : ShieldCheck}
          >
            {settings?.enabled ? "Disable public layer" : "Enable public layer"}
          </Action>
        </div>
      </Panel>

      {/* Wallet */}
      <Panel title="Signer Wallet">
        {wallet.isLoading ? (
          <Loading />
        ) : wallet.isError ? (
          <p className="text-sm text-rose-300">
            {wallet.error instanceof Error ? wallet.error.message : "Wallet unavailable."}
          </p>
        ) : wallet.data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Stat
              label="Address"
              value={shortHash(wallet.data.address, 10, 8)}
              href={addressUrl(wallet.data.chain_id, wallet.data.address)}
            />
            <Stat
              label="Balance"
              value={`${wallet.data.balance} ${wallet.data.currency}`}
              tone={wallet.data.funded ? "ok" : "warn"}
            />
            <Stat label="Chain" value={wallet.data.label} />
            <Stat
              label="Gas status"
              value={wallet.data.funded ? "Ready to sign" : "Needs funding"}
              tone={wallet.data.funded ? "ok" : "warn"}
            />
          </div>
        ) : null}
      </Panel>

      {/* Diagnostics */}
      <Panel title="System Diagnostics">
        {health.isLoading ? (
          <Loading />
        ) : health.isError ? (
          <p className="text-sm text-rose-300">
            {health.error instanceof Error ? health.error.message : "Diagnostics unavailable."}
          </p>
        ) : health.data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Stat
                label="RPC endpoint"
                value={health.data.rpc.ok ? `Online · ${health.data.rpc.latency_ms}ms` : health.data.rpc.error || "Offline"}
                tone={health.data.rpc.ok ? "ok" : "warn"}
              />
              <Stat label="Latest block" value={health.data.rpc.block ?? "—"} />
              <Stat
                label="IPFS (Pinata)"
                value={health.data.ipfs.ok ? "Authenticated" : health.data.ipfs.error || "Unavailable"}
                tone={health.data.ipfs.ok ? "ok" : "warn"}
              />
              <Stat
                label="Contract state"
                value={
                  health.data.contracts.paused === null
                    ? "Unknown"
                    : health.data.contracts.paused
                      ? "Paused"
                      : "Active"
                }
                tone={health.data.contracts.paused ? "warn" : "ok"}
              />
              <Stat
                label="Anchored / failed"
                value={`${health.data.records.confirmed} confirmed · ${health.data.records.failed} failed`}
                tone={health.data.records.failed > 0 ? "warn" : "ok"}
              />
              <Stat label="Ownership tokens" value={String(health.data.records.tokens)} />
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              <Action
                onClick={() =>
                  run(
                    "pause",
                    () => pauseContract({ data: { paused: !health.data?.contracts.paused } }),
                    health.data?.contracts.paused ? "Contract resumed." : "Contract paused.",
                  )
                }
                busy={busy === "pause"}
                icon={health.data.contracts.paused ? ShieldCheck : ShieldAlert}
                disabled={!settings?.verification_contract}
              >
                {health.data.contracts.paused ? "Resume contract" : "Pause contract"}
              </Action>
              <Action onClick={() => void health.refetch()} busy={health.isFetching} icon={RefreshCw}>
                Refresh diagnostics
              </Action>
            </div>
          </>
        ) : null}
      </Panel>

      {/* Migration */}
      <Panel title="Verify Existing Files">
        <p className="text-sm text-[#D7E2EA]/60 font-light leading-relaxed">
          Every file uploaded before the trust layer existed can be anchored in one pass — each is
          downloaded, hashed with SHA-256, pinned to IPFS and written to the verification contract.
          The run is idempotent and resumable: already-verified files are skipped and failures stay
          retryable.
        </p>

        {plan.isLoading ? (
          <Loading />
        ) : plan.isError ? (
          <p className="text-sm text-rose-300">
            {plan.error instanceof Error ? plan.error.message : "Could not build the migration plan."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="Discovered" value={String(planItems.length)} />
              <Stat label="Verified" value={String(planTotals.verified)} tone="ok" />
              <Stat label="Pending" value={String(planTotals.pending)} tone={planTotals.pending ? "warn" : "ok"} />
              <Stat label="Failed" value={String(planTotals.failed)} tone={planTotals.failed ? "warn" : "ok"} />
            </div>

            {progress && (
              <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#D7E2EA]/60 mb-2">
                  <span>{progress.done === progress.total ? "Migration complete" : "Migrating…"}</span>
                  <span>
                    {progress.done}/{progress.total}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                  aria-valuenow={progress.done}
                  aria-label="Blockchain migration progress"
                  className="h-1.5 w-full rounded-full overflow-hidden"
                  style={{ background: "rgba(215,226,234,0.12)" }}
                >
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                      background: "linear-gradient(90deg, #4a9eff, #6ee7b7)",
                    }}
                  />
                </div>
                <p className="text-xs text-[#D7E2EA]/50 mt-2 truncate" aria-live="polite">
                  {progress.current}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Action
                onClick={() => runMigration(migratable)}
                busy={busy === "migrate"}
                icon={Anchor}
                primary
                disabled={!deployed || migratable.length === 0}
              >
                Verify all existing files ({migratable.length})
              </Action>
              <Action
                onClick={() => runMigration(planItems.filter((i) => i.status === "failed"))}
                busy={busy === "migrate-failed"}
                icon={RefreshCw}
                disabled={!deployed || planTotals.failed === 0}
              >
                Retry failed ({planTotals.failed})
              </Action>
            </div>

            <ul className="flex flex-col gap-2 list-none p-0 mt-2 max-h-[26rem] overflow-y-auto">
              {planItems.map((t) => {
                const result = results[t.subject_ref];
                return (
                  <li
                    key={t.key}
                    className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(215,226,234,0.08)" }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-[#D7E2EA]/90 truncate">{t.label}</div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-[#D7E2EA]/40">
                        {SUBJECT_LABELS[t.subject_type]}
                        {t.retry_count > 0 ? ` · ${t.retry_count} retries` : ""}
                      </div>
                      {(result?.message || t.error) && (
                        <div
                          className={`text-[11px] mt-1 truncate ${result?.ok === false || (!result && t.error) ? "text-rose-300" : "text-emerald-300/80"}`}
                        >
                          {result?.message || t.error}
                        </div>
                      )}
                    </div>
                    {t.status === "verified" || result?.ok ? (
                      <span className="text-[10px] uppercase tracking-widest text-emerald-300 shrink-0">Verified</span>
                    ) : (
                      <Action onClick={() => runMigration([t])} busy={busy === `one-${t.key}`} icon={Anchor} disabled={!deployed}>
                        Verify
                      </Action>
                    )}
                  </li>
                );
              })}
              {planItems.length === 0 && (
                <li className="text-sm text-[#D7E2EA]/50">No portfolio files found to verify yet.</li>
              )}
            </ul>
          </>
        )}
      </Panel>


      {/* Records */}
      <Panel title={`Anchored Records (${records.length})`}>
        {state.isLoading ? (
          <Loading />
        ) : records.length === 0 ? (
          <p className="text-sm text-[#D7E2EA]/50">Nothing anchored yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 list-none p-0">
            {records.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-2xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(215,226,234,0.08)" }}
              >
                <div className="min-w-0">
                  <div className="text-sm text-[#D7E2EA]/90 truncate">{r.title}</div>
                  <div className="text-[10px] font-mono text-[#D7E2EA]/45 truncate">{shortHash(r.sha256, 18, 10)}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#D7E2EA]/40">
                    {r.status} · {formatVerifiedDate(r.registered_at) || "not confirmed"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.tx_hash && (
                    <a
                      href={txUrl(r.chain_id, r.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${r.title} on the block explorer`}
                      className="p-2 rounded-full border border-[#D7E2EA]/15 text-[#D7E2EA]/70 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                  <button
                    type="button"
                    aria-label={`Re-verify ${r.title} against the blockchain`}
                    onClick={() =>
                      run(
                        `re-${r.id}`,
                        async () => {
                          const res = await revalidate({ data: { id: r.id } });
                          if (!res.authentic) throw new Error(`"${r.title}" no longer matches its on-chain fingerprint.`);
                        },
                        `"${r.title}" is authentic — hash matches the chain.`,
                      )
                    }
                    className="p-2 rounded-full border border-[#D7E2EA]/15 text-[#D7E2EA]/70 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
                  >
                    {busy === `re-${r.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>

                  <button
                    type="button"
                    aria-label={`Delete record ${r.title}`}
                    onClick={() => run(`del-${r.id}`, () => removeRecord({ data: { id: r.id } }), "Record removed.")}
                    className="p-2 rounded-full border border-rose-400/25 text-rose-300 hover:bg-rose-500/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    {busy === `del-${r.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Mint */}
      <Panel title={`Digital Ownership Tokens (${tokens.length})`}>
        <MintForm
          disabled={!deployed}
          busy={busy === "mint"}
          onMint={(payload) => run("mint", () => mint({ data: payload }), `Minted "${payload.project_name}".`)}
        />
        <ul className="flex flex-col gap-2 list-none p-0 mt-2">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(215,226,234,0.08)" }}
            >
              <div className="min-w-0">
                <div className="text-sm text-[#D7E2EA]/90 truncate">{t.project_name}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#D7E2EA]/40">
                  {t.status}
                  {t.token_id ? ` · #${t.token_id}` : ""}
                </div>
              </div>
              {t.mint_tx_hash && (
                <a
                  href={txUrl(t.chain_id, t.mint_tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View mint transaction for ${t.project_name}`}
                  className="p-2 rounded-full border border-[#D7E2EA]/15 text-[#D7E2EA]/70 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------ primitives */

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-3xl p-6 md:p-8"
      style={{
        background: "linear-gradient(160deg, rgba(20,22,38,0.7), rgba(12,12,12,0.7))",
        border: "1px solid rgba(215,226,234,0.1)",
        backdropFilter: "blur(20px)",
      }}
    >
      <h2 className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60 mb-5">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: string;
  href?: string;
  tone?: "ok" | "warn";
}) {
  const color = tone === "ok" ? "#6ee7b7" : tone === "warn" ? "#fbbf24" : "#D7E2EA";
  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="text-[10px] uppercase tracking-[0.25em] text-[#D7E2EA]/40">{label}</div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-mono truncate block hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff] rounded"
          style={{ color }}
        >
          {value}
        </a>
      ) : (
        <div className="text-sm truncate" style={{ color }}>
          {value}
        </div>
      )}
    </div>
  );
}

function Action({
  children,
  onClick,
  busy,
  icon: Icon,
  primary,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  icon: typeof Rocket;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full transition disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff] ${
        primary ? "text-white" : "border border-[#D7E2EA]/20 text-[#D7E2EA]/85 hover:text-white"
      }`}
      style={primary ? { background: "linear-gradient(135deg, #4a9eff, #7621B0)" } : undefined}
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 text-sm text-[#D7E2EA]/50">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading…
    </div>
  );
}

function MintForm({
  disabled,
  busy,
  onMint,
}: {
  disabled: boolean;
  busy: boolean;
  onMint: (payload: {
    project_ref: string;
    project_name: string;
    description?: string;
    artwork_url?: string;
    sort_order: number;
  }) => void;
}) {
  const projects = useContent((s) => s.projects);
  const [ref, setRef] = useState("");
  const selected = projects.find((p) => p.id === ref);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <label className="flex-1">
        <span className="sr-only">Project to mint</span>
        <select
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          className="w-full rounded-full px-4 py-2.5 text-sm bg-transparent border border-[#D7E2EA]/20 text-[#D7E2EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
        >
          <option value="" style={{ background: "#0C0C0C" }}>
            Select a flagship project…
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id} style={{ background: "#0C0C0C" }}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <Action
        onClick={() => {
          if (!selected) return;
          onMint({
            project_ref: verificationRef("project", selected.id),
            project_name: selected.name,
            description: selected.desc || undefined,
            artwork_url: selected.imgs?.[0] || undefined,
            sort_order: 0,
          });
        }}
        busy={busy}
        icon={Gem}
        primary
        disabled={disabled || !selected}
      >
        Mint ownership token
      </Action>
    </div>
  );
}
