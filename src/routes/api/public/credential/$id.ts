import { createFileRoute } from "@tanstack/react-router";
import type { PublicRecord } from "@/lib/blockchain/chains";
import { buildVerifiableCredential, SITE_ORIGIN } from "@/lib/blockchain/credential";

/**
 * Public, machine-readable W3C Verifiable Credential for a single anchored
 * document. Safe to expose: it contains only the public proof material that
 * already lives on-chain and on IPFS.
 */
export const Route = createFileRoute("/api/public/credential/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
          return new Response(JSON.stringify({ error: "Invalid credential id" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { readPublicState } = await import("@/lib/blockchain/registry.server");
        const state = await readPublicState();
        const record = (state.records as unknown as PublicRecord[]).find(
          (r) => r.id === params.id && r.status === "confirmed",
        );

        if (!record) {
          return new Response(JSON.stringify({ error: "Credential not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify(buildVerifiableCredential(record, SITE_ORIGIN), null, 2),
          {
            headers: {
              "Content-Type": "application/ld+json; charset=utf-8",
              "Cache-Control": "public, max-age=600",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
    },
  },
});
