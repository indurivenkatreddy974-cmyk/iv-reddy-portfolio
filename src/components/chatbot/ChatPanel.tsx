"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";

type Msg = { id: string; role: "bot" | "user"; text: string };

const PLACEHOLDERS = ["Ask anything…", "Try: Projects", "Try: Resume", "Try: Contact"];

const QUICK_CHIPS = [
  { label: "Projects", href: "#projects" },
  { label: "Resume", href: "#contact" },
  { label: "Contact", href: "#contact" },
  { label: "Experience", href: "#internships" },
];

const SECRET_CMD = "open the secret";

export function ChatPanel({
  open,
  onClose,
  onSecretTrigger,
}: {
  open: boolean;
  onClose: () => void;
  onSecretTrigger: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "g", role: "bot", text: "Hello — How may I help?" },
  ]);
  const [input, setInput] = useState("");
  const [phIdx, setPhIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 2500);
    return () => clearInterval(t);
  }, [open]);

  // Focus management: move focus into panel on open, restore on close
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      window.clearTimeout(t);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  // Escape to close + focus trap
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const lastBotMessage = [...messages].reverse().find((m) => m.role === "bot")?.text ?? "";

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: Math.random().toString(36), role: "user", text }]);
    setInput("");

    setTimeout(() => {
      if (text.toLowerCase() === SECRET_CMD) {
        setMessages((m) => [
          ...m,
          { id: Math.random().toString(36), role: "bot", text: "Enter Secret Code" },
        ]);
        setTimeout(() => {
          onSecretTrigger();
          onClose();
        }, 400);
        return;
      }
      const lower = text.toLowerCase();
      let reply =
        "I'll get back to you shortly. Meanwhile, explore Projects, Experience, or Contact.";
      if (lower.includes("project"))
        reply = "Check the Projects section — scroll down or tap a chip below.";
      else if (lower.includes("resume"))
        reply = "Reach out via the Contact section to grab the latest resume.";
      else if (lower.includes("contact") || lower.includes("email"))
        reply = "You can email IV directly from the Contact section.";
      else if (lower.includes("experience") || lower.includes("intern"))
        reply = "Internships are detailed in the Experience section.";
      setMessages((m) => [...m, { id: Math.random().toString(36), role: "bot", text: reply }]);
    }, 350);
  };

  const handleChip = (href: string, label: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setMessages((m) => [
      ...m,
      { id: Math.random().toString(36), role: "user", text: label },
      { id: Math.random().toString(36) + "r", role: "bot", text: `Scrolling to ${label}.` },
    ]);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="panel"
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="IV Assistant chat"
          initial={{ opacity: 0, scale: 0.85, y: 30, filter: "blur(20px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.9, y: 20, filter: "blur(20px)" }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="fixed z-[55] bottom-24 right-3 left-3 md:left-auto md:right-8 md:bottom-28 md:w-[380px] md:h-[560px] h-[70vh] rounded-3xl flex flex-col overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(20,22,38,0.92), rgba(12,12,12,0.92))",
            border: "1px solid rgba(215,226,234,0.15)",
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(74,158,255,0.15) inset, 0 0 60px rgba(118,33,176,0.2)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* header */}
          <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(215,226,234,0.08)" }}>
            <div className="flex items-center gap-3">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "#4a9eff", boxShadow: "0 0 10px #4a9eff" }}
                aria-hidden
              />
              <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/80">
                IV · Assistant
              </div>
            </div>
          </div>

          {/* live region for screen readers */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {lastBotMessage}
          </div>

          {/* messages */}
          <div
            ref={scrollRef}
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
            className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
          >
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-[85%] ${m.role === "user" ? "self-end" : "self-start"}`}
              >
                {m.role === "user" ? (
                  <div
                    className="px-4 py-2.5 rounded-2xl rounded-br-sm text-sm text-white"
                    style={{
                      background: "linear-gradient(123deg, #18011F 7%, #7621B0 72%, #BE4C00 100%)",
                    }}
                  >
                    {m.text}
                  </div>
                ) : (
                  <div className="px-1 py-1 text-sm leading-relaxed text-[#D7E2EA]/90">
                    {m.text}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* chips */}
          <div className="px-4 pb-2 flex flex-wrap gap-2" role="group" aria-label="Quick actions">
            {QUICK_CHIPS.map((c) => (
              <button
                type="button"
                key={c.label}
                onClick={() => handleChip(c.href, c.label)}
                className="text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full border transition hover:bg-[#D7E2EA]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0C0C]"
                style={{ borderColor: "rgba(215,226,234,0.2)", color: "#D7E2EA" }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-3 border-t flex items-center gap-2"
            style={{ borderColor: "rgba(215,226,234,0.08)" }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={PLACEHOLDERS[phIdx]}
              aria-label="Message"
              className="flex-1 bg-transparent text-sm text-[#D7E2EA] placeholder:text-[#D7E2EA]/40 px-4 py-3 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff] border"
              style={{ borderColor: "rgba(215,226,234,0.15)" }}
            />
            <button
              type="submit"
              aria-label="Send message"
              className="w-10 h-10 rounded-full flex items-center justify-center transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0C0C]"
              style={{
                background: "linear-gradient(135deg, #4a9eff, #7621B0)",
                boxShadow: "0 8px 24px -6px rgba(74,158,255,0.5)",
              }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
