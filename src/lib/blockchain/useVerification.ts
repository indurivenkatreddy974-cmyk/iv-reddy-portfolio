"use client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getVerificationState } from "@/lib/blockchain.functions";
import type { PublicRecord, PublicSettings, PublicToken } from "./chains";

export type VerificationState = {
  records: PublicRecord[];
  tokens: PublicToken[];
  settings: PublicSettings | null;
  byRef: Map<string, PublicRecord>;
  byHash: Map<string, PublicRecord>;
  enabled: boolean;
};

const EMPTY: VerificationState = {
  records: [],
  tokens: [],
  settings: null,
  byRef: new Map(),
  byHash: new Map(),
  enabled: false,
};

/**
 * Non-blocking read of the public verification layer.
 * Deliberately not part of any route loader — the portfolio renders first and
 * trust badges hydrate in afterwards.
 */
export function useVerification(): VerificationState & { isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["blockchain", "public-state"],
    queryFn: () => getVerificationState(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const state = useMemo<VerificationState>(() => {
    if (!data) return EMPTY;
    const records = (data.records ?? []) as unknown as PublicRecord[];
    const tokens = (data.tokens ?? []) as unknown as PublicToken[];
    const settings = (data.settings ?? null) as unknown as PublicSettings | null;
    const byRef = new Map<string, PublicRecord>();
    const byHash = new Map<string, PublicRecord>();
    for (const r of records) {
      if (r.status !== "confirmed") continue;
      if (r.subject_ref && !byRef.has(r.subject_ref)) byRef.set(r.subject_ref, r);
      byHash.set(r.sha256.toLowerCase(), r);
    }
    return { records, tokens, settings, byRef, byHash, enabled: Boolean(settings?.enabled) };
  }, [data]);

  return { ...state, isLoading };
}

/** Stable reference key used to link app content to an on-chain record. */
export function verificationRef(kind: string, id: string, slot?: string) {
  return slot ? `${kind}:${id}:${slot}` : `${kind}:${id}`;
}
