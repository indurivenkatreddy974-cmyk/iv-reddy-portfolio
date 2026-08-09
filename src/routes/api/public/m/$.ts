import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/m/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) {
          return new Response("Not found", { status: 404 });
        }
        const requestUrl = new URL(request.url);
        const downloadName = requestUrl.searchParams.get("download")?.trim();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: signed, error } = await supabaseAdmin.storage
          .from("showcase-media")
          .createSignedUrl(path, 60 * 60);
        if (error || !signed) return new Response("Not found", { status: 404 });

        const upstream = await fetch(signed.signedUrl, {
          headers: request.headers.get("range") ? { range: request.headers.get("range")! } : {},
        });
        const headers = new Headers();
        const passthrough = [
          "content-type",
          "content-length",
          "content-range",
          "accept-ranges",
          "last-modified",
          "etag",
        ];
        for (const h of passthrough) {
          const v = upstream.headers.get(h);
          if (v) headers.set(h, v);
        }
        if (downloadName) {
          headers.set(
            "content-disposition",
            `attachment; filename="${downloadName.replace(/[\r\n"]/g, "_")}"`,
          );
        }
        headers.set(
          "cache-control",
          downloadName ? "public, max-age=3600, immutable" : "public, max-age=300",
        );
        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});
