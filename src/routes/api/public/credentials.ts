import { createFileRoute } from "@tanstack/react-router";
import type { PublicRecord, PublicToken } from "@/lib/blockchain/chains";
import {
  buildOwnershipCredential,
  buildVerifiableCredential,
  credentialUrl,
  ISSUER_ID,
  ISSUER_NAME,
  SITE_ORIGIN,
  tokenCredentialUrl,
} from "@/lib/blockchain/credential";

/**
 * Public index of every confirmed Verifiable Credential (documents + ownership
 * tokens). Machine readable, safe to share: only on-chain/IPFS proof material.
 */
export const Route = createFileRoute("/api/public/credentials")({
  server: {
    handlers: {
      GET: async () => {
        const { readPublicState } = await import("@/lib/blockchain/registry.server");
        const state = await readPublicState();
        const records = ((state.records ?? []) as unknown as PublicRecord[]).filter(
          (r) => r.status === "confirmed",
        );
        const tokens = ((state.tokens ?? []) as unknown as PublicToken[]).filter(
          (t) => t.status === "confirmed" && t.token_id,
        );

        const body = {
          "@context": "https://www.w3.org/2018/credentials/v1",
          type: "VerifiableCredentialCollection",
          id: `${SITE_ORIGIN}/api/public/credentials`,
          issuer: { id: ISSUER_ID, name: ISSUER_NAME, url: SITE_ORIGIN },
          generatedAt: new Date().toISOString(),
          totalCredentials: records.length + tokens.length,
          credentials: [
            ...records.map((r) => ({
              id: credentialUrl(r.id, SITE_ORIGIN),
              type: "PortfolioDocumentCredential",
              name: r.title,
              subjectType: r.subject_type,
              sha256: r.sha256,
              credential: buildVerifiableCredential(r, SITE_ORIGIN),
            })),
            ...tokens.map((t) => ({
              id: tokenCredentialUrl(t.id, SITE_ORIGIN),
              type: "DigitalOwnershipCredential",
              name: t.project_name,
              subjectType: "project",
              tokenId: t.token_id,
              credential: buildOwnershipCredential(t, SITE_ORIGIN),
            })),
          ],
        };

        return new Response(JSON.stringify(body, null, 2), {
          headers: {
            "Content-Type": "application/ld+json; charset=utf-8",
            "Cache-Control": "public, max-age=600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
