import type { AccessLogEntry } from "./admin-auth";

// Future: wire to backend email when Lovable Cloud is enabled.
export async function notifyAdminAccess(entry: AccessLogEntry): Promise<void> {
  if (typeof window === "undefined") return;
  // No-op stub. Logged for visibility in dev.

  console.info("[admin-access]", entry);
}
