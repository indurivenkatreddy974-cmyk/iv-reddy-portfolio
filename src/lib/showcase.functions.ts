import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ShowcaseKind = z.enum(["project", "certification", "achievement", "video"]);
const MediaKind = z.enum(["image", "video", "pdf", "other"]);
const LayoutKind = z.enum(["grid", "carousel", "masonry", "featured"]);

const ShowcaseItemInput = z.object({
  id: z.string().uuid().optional(),
  kind: ShowcaseKind,
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable().or(z.literal("")),
  media_url: z.string().url().optional().nullable().or(z.literal("")),
  poster_url: z.string().url().optional().nullable().or(z.literal("")),
  live_url: z.string().url().optional().nullable().or(z.literal("")),
  github_url: z.string().url().optional().nullable().or(z.literal("")),
  tech: z.array(z.string().max(64)).max(30).default([]),
  issuer: z.string().max(200).optional().nullable(),
  issue_date: z.string().optional().nullable(),
  verify_url: z.string().url().optional().nullable().or(z.literal("")),
  featured: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listShowcase = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: items }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from("showcase_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("showcase_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  return {
    items: items ?? [],
    settings: settings ?? {
      layout: "grid",
      featured_projects_first: true,
      featured_certs_first: true,
    },
  };
});

export const listMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertShowcaseItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ShowcaseItemInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      ...data,
      issue_date: data.issue_date || null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("showcase_items")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("showcase_items")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const deleteShowcaseItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("showcase_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderShowcase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all(
      data.ids.map((id, idx) =>
        supabaseAdmin.from("showcase_items").update({ sort_order: idx }).eq("id", id),
      ),
    );
    return { ok: true };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        layout: LayoutKind.optional(),
        featured_projects_first: z.boolean().optional(),
        featured_certs_first: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("showcase_settings").update(data).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const signMediaUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        filename: z
          .string()
          .min(1)
          .max(200)
          .regex(/^[a-zA-Z0-9._-]+$/),
        mime: z.string().max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${data.filename}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("showcase-media")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return {
      path,
      token: signed.token,
      signedUrl: signed.signedUrl,
      publicUrl: `/api/public/m/${path}`,
    };
  });

export const registerMediaAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: MediaKind,
        name: z.string().min(1).max(200),
        storage_path: z.string().min(1),
        poster_path: z.string().optional().nullable(),
        width: z.number().int().optional().nullable(),
        height: z.number().int().optional().nullable(),
        duration_seconds: z.number().optional().nullable(),
        size_bytes: z.number().int().optional().nullable(),
        mime: z.string().max(200).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const original_url = `/api/public/m/${data.storage_path}`;
    const poster_url = data.poster_path ? `/api/public/m/${data.poster_path}` : null;
    const { data: row, error } = await supabaseAdmin
      .from("media_assets")
      .insert({
        kind: data.kind,
        name: data.name,
        storage_path: data.storage_path,
        original_url,
        poster_url,
        width: data.width ?? null,
        height: data.height ?? null,
        duration_seconds: data.duration_seconds ?? null,
        size_bytes: data.size_bytes ?? null,
        mime: data.mime ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMediaAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("media_assets")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.storage_path) {
      await supabaseAdmin.storage.from("showcase-media").remove([row.storage_path]);
    }
    const { error } = await supabaseAdmin.from("media_assets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
