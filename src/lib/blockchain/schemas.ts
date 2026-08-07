import { z } from "zod";

export const SubjectType = z.enum([
  "resume",
  "certificate",
  "offer_letter",
  "completion_certificate",
  "project",
  "research_paper",
  "asset",
]);

/** Max inline upload accepted by the register endpoint (10 MB). */
export const MAX_INLINE_BYTES = 10 * 1024 * 1024;

export const RegisterDocumentInput = z
  .object({
    subject_type: SubjectType,
    subject_ref: z.string().max(200).optional().nullable(),
    title: z.string().min(1).max(300),
    file_name: z.string().max(200).optional().nullable(),
    /** Either a source URL already hosted by the app, or an inline base64 payload. */
    source_url: z.string().max(2000).optional().nullable(),
    file_base64: z.string().max(Math.ceil(MAX_INLINE_BYTES * 1.4)).optional().nullable(),
    mime: z.string().max(200).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((v) => Boolean(v.source_url || v.file_base64), {
    message: "Provide either source_url or file_base64",
  });

export const MintTokenInput = z.object({
  project_ref: z.string().min(1).max(200),
  project_name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  artwork_url: z.string().max(2000).optional().nullable(),
  owner_wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional().nullable(),
  sort_order: z.number().int().min(0).max(999).default(0),
});

export const VerifyInput = z.object({
  sha256: z.string().regex(/^[0-9a-f]{64}$/i),
});

export const IdInput = z.object({ id: z.string().uuid() });

export const MigrationTargetSchema = z.object({
  key: z.string().min(1).max(200),
  label: z.string().min(1).max(300),
  subject_type: SubjectType,
  subject_ref: z.string().min(1).max(200),
  source_url: z.string().min(1).max(2000),
});

export const MigrationPlanInput = z.object({
  targets: z.array(MigrationTargetSchema).max(5000).default([]),
});

export const MigrationBatchInput = z.object({
  targets: z.array(MigrationTargetSchema).min(1).max(10),
});

export const PauseInput = z.object({ paused: z.boolean() });

export type MigrationTarget = z.infer<typeof MigrationTargetSchema>;

export const SettingsInput = z.object({
  enabled: z.boolean().optional(),
  ipfs_gateway: z.string().url().max(300).optional(),
});

export type RegisterDocumentPayload = z.infer<typeof RegisterDocumentInput>;
export type MintTokenPayload = z.infer<typeof MintTokenInput>;
