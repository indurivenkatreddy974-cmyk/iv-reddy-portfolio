"use client";
import { useState } from "react";
import { Wallet, LogOut, Loader2, ChevronDown } from "lucide-react";
import { useWallet } from "@/lib/blockchain/useWallet";
import { addressUrl, chainInfo, shortHash } from "@/lib/blockchain/chains";

/**
 * Purely optional wallet connect (EIP-6963 multi-provider discovery).
 * Verification never requires it — it only lets a visitor prove which
 * wallet they are browsing with when checking on-chain ownership.
 */
export function WalletConnect({ className = "" }: { className?: string }) {
  const { wallets, address, chainId, connecting, error, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);

  if (address) {
    const info = chainInfo(chainId);
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <a
          href={addressUrl(chainId, address)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] uppercase tracking-widest border border-emerald-400/40 text-emerald-300 hover:brightness-125 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
          {shortHash(address, 6, 4)}
          <span className="opacity-60">· {info.label}</span>
        </a>
        <button
          type="button"
          onClick={disconnect}
          aria-label="Disconnect wallet"
          className="rounded-full p-2 border border-[#D7E2EA]/20 text-[#D7E2EA]/70 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] uppercase tracking-widest border border-[#D7E2EA]/20 text-[#D7E2EA]/80 hover:text-white hover:border-[#4a9eff]/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
      >
        {connecting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        Connect Wallet <span className="opacity-50">(optional)</span>
        <ChevronDown className="w-3 h-3 opacity-60" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 rounded-2xl p-2 text-left"
          style={{
            background: "rgba(12,12,12,0.96)",
            border: "1px solid rgba(215,226,234,0.14)",
            backdropFilter: "blur(18px)",
          }}
        >
          {wallets.length === 0 ? (
            <p className="px-3 py-3 text-xs text-[#D7E2EA]/60 font-light leading-relaxed">
              No browser wallet detected. Verification works fully without one — every proof is
              checked against the public explorer.
            </p>
          ) : (
            wallets.map((w) => (
              <button
                key={w.uuid}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void connect(w);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#D7E2EA]/85 hover:bg-white/5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff]"
              >
                <img src={w.icon} alt="" aria-hidden="true" className="w-5 h-5 rounded" />
                {w.name}
              </button>
            ))
          )}
          {error && <p className="px-3 py-2 text-xs text-rose-300">{error}</p>}
        </div>
      )}
    </div>
  );
}
