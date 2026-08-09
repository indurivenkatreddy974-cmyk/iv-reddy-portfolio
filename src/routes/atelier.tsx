import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Lock, LogIn } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/lib/admin-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/atelier")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign In — IV Reddy Atelier" },
      {
        name: "description",
        content:
          "Private admin portal for IV Reddy's portfolio. Sign in to manage showcase items, media, and site content.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AtelierPage,
});

function AtelierPage() {
  const { authed, isAdmin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0a0a0a", color: "#D7E2EA" }}
      >
        <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/40">Verifying…</div>
      </div>
    );
  }

  if (!authed || !isAdmin) return <AuthGate />;
  return <AdminShell />;
}

function AuthGate() {
  const { signIn, refresh, claimAdmin } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      // If no admin exists yet, allow the first authenticated user to claim.
      const { data: adminExists, error: adminCheckError } = await supabase.rpc("admin_exists");
      if (adminCheckError) {
        setError(adminCheckError.message);
        return;
      }
      if (!adminExists) {
        const claim = await claimAdmin();
        if (!claim.ok) {
          setError(claim.error ?? "Unable to grant admin access");
          return;
        }
      }
      await refresh();
    } catch {
      setError("Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#0a0a0a" }}
    >
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        className="w-full max-w-md rounded-3xl p-7 md:p-9 flex flex-col gap-6"
        style={{
          background: "linear-gradient(160deg, rgba(20,22,38,0.9), rgba(12,12,12,0.9))",
          border: "1px solid rgba(74,158,255,0.25)",
          boxShadow: "0 0 80px rgba(74,158,255,0.15), 0 40px 100px -20px rgba(0,0,0,0.8)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
          >
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60">IV · Atelier</div>
            <h1 className="text-lg font-medium text-[#D7E2EA]">Sign In</h1>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[#D7E2EA]/65">
          Sign in with your admin account credentials.
        </p>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#D7E2EA]/60">Email</span>
            <input
              ref={emailRef}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="bg-transparent text-[#D7E2EA] placeholder:text-[#D7E2EA]/30 px-4 py-3 rounded-xl focus:outline-none border"
              style={{ borderColor: "rgba(215,226,234,0.18)" }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#D7E2EA]/60">
              Password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter password"
              className="bg-transparent text-[#D7E2EA] placeholder:text-[#D7E2EA]/30 px-4 py-3 rounded-xl focus:outline-none border"
              style={{ borderColor: "rgba(215,226,234,0.18)" }}
            />
          </label>
        </div>

        {error && <div className="text-xs text-red-400 uppercase tracking-widest">{error}</div>}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-white px-6 py-3 rounded-full disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #4a9eff, #7621B0)",
              boxShadow: "0 8px 24px -6px rgba(74,158,255,0.5)",
            }}
          >
            <LogIn className="w-3.5 h-3.5" />
            {busy ? "…" : "Enter"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
