import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  IdInput,
  MigrationBatchInput,
  MigrationPlanInput,
  MintTokenInput,
  PauseInput,
  RegisterDocumentInput,
  SettingsInput,
  VerifyInput,
} from "@/lib/blockchain/schemas";

export const getVerificationState = createServerFn({ method: "GET" }).handler(async () => {
  const { readPublicState } = await import("@/lib/blockchain/registry.server");
  return readPublicState();
});

export const verifyDocumentHash = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => VerifyInput.parse(input))
  .handler(async ({ data }) => {
    const { verifyDigest } = await import("@/lib/blockchain/registry.server");
    return verifyDigest(data.sha256);
  });

export const getWalletStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, walletStatus } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    return walletStatus();
  });

export const deployVerificationContracts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, deployContracts } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    return deployContracts();
  });

export const anchorDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RegisterDocumentInput.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, registerDocument } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    return registerDocument(data);
  });

export const mintOwnershipToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MintTokenInput.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, mintProjectToken } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    return mintProjectToken(data);
  });

export const deleteVerificationRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("blockchain_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOwnershipToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("nft_tokens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateBlockchainSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SettingsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("blockchain_settings").update(data).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const autoAnchorUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RegisterDocumentInput.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, autoAnchor } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    return autoAnchor(data);
  });

// ------------------------------------------------------------ migration ops

export const planExistingMigration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MigrationPlanInput.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    const { planMigration } = await import("@/lib/blockchain/migration.server");
    return planMigration(data.targets);
  });

export const runMigrationBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MigrationBatchInput.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    const { migrateBatch } = await import("@/lib/blockchain/migration.server");
    return migrateBatch(data.targets);
  });

export const revalidateVerificationRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    const { revalidateRecord } = await import("@/lib/blockchain/migration.server");
    return revalidateRecord(data.id);
  });

export const getSystemDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    const { diagnostics } = await import("@/lib/blockchain/migration.server");
    return diagnostics();
  });

export const setVerificationPaused = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PauseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/blockchain/registry.server");
    await assertAdmin(context.userId);
    const { setContractPaused } = await import("@/lib/blockchain/migration.server");
    return setContractPaused(data.paused);
  });
