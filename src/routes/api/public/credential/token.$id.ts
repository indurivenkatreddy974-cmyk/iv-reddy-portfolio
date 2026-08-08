import { createFileRoute } from "@tanstack/react-router";
import type { PublicToken } from "@/lib/blockchain/chains";
import { buildOwnershipCredential, SITE_ORIGIN } from "@/lib/blockchain/credential";

/**
 * Public W3C Verifiable Credential for a single ERC-721 digital ownership
 * token, including its on-chain metadata linkage (tokenURI / IPFS CID).
 */
export const Route = createFileRoute("/api/public/credential/token/$id")({
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
        const token = (state.tokens as unknown as PublicToken[]).find(
          (t) => t.id === params.id && t.status === "confirmed" && t.token_id,
        );

        if (!token) {
          return new Response(JSON.stringify({ error: "Credential not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(buildOwnershipCredential(token, SITE_ORIGIN), null, 2), {
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
