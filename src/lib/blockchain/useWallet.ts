"use client";
/**
 * Optional EIP-6963 wallet discovery. Nothing here runs or prompts until the
 * visitor explicitly clicks connect — recruiters can verify everything
 * without ever touching a wallet.
 */
import { useCallback, useEffect, useState } from "react";

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: never[]) => void) => void;
  removeListener?: (event: string, handler: (...args: never[]) => void) => void;
};

export type DiscoveredWallet = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
  provider: Eip1193Provider;
};

type ProviderDetail = {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: Eip1193Provider;
};

export type WalletState = {
  wallets: DiscoveredWallet[];
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  supported: boolean;
  connect: (wallet: DiscoveredWallet) => Promise<void>;
  disconnect: () => void;
};

export function useWallet(): WalletState {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<ProviderDetail>).detail;
      if (!detail?.info?.uuid) return;
      setWallets((prev) =>
        prev.some((w) => w.uuid === detail.info.uuid)
          ? prev
          : [...prev, { ...detail.info, provider: detail.provider }],
      );
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  const connect = useCallback(async (wallet: DiscoveredWallet) => {
    setConnecting(true);
    setError(null);
    try {
      const accounts = (await wallet.provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const hexChain = (await wallet.provider.request({ method: "eth_chainId" })) as string;
      setAddress(accounts?.[0] ?? null);
      setChainId(hexChain ? Number.parseInt(hexChain, 16) : null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet connection was cancelled.";
      setError(message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setError(null);
  }, []);

  return {
    wallets,
    address,
    chainId,
    connecting,
    error,
    supported: wallets.length > 0,
    connect,
    disconnect,
  };
}
