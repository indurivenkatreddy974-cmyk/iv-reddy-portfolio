"use client";
import { FadeIn } from "./FadeIn";
import { CtaButton } from "./CtaButton";
import { Mail } from "lucide-react";
import { useContent } from "@/lib/content-store";

export function ContactSection() {
  const contact = useContent((s) => s.contact);
  const mailto = `mailto:${contact.email}`;
  return (
    <section
      id="contact"
      className="px-5 sm:px-8 md:px-10 py-24 sm:py-32 relative overflow-hidden"
      style={{ background: "#0C0C0C" }}
    >
      <div className="absolute inset-0 cinematic-glow pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-8 md:gap-10">
        <FadeIn delay={0} y={40}>
          <h2
            className="hero-heading font-black uppercase leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(2.25rem, 8vw, 110px)" }}
          >
            {contact.heading}
          </h2>
        </FadeIn>

        <FadeIn delay={0.15} y={20}>
          <p
            className="text-[#D7E2EA]/70 font-light max-w-2xl mx-auto leading-relaxed"
            style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.2rem)" }}
          >
            {contact.subtitle}
          </p>
        </FadeIn>

        <FadeIn delay={0.3} y={20}>
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            <CtaButton href={mailto}>{contact.primaryCta}</CtaButton>
            <CtaButton href={mailto} variant="ghost">
              {contact.secondaryCta}
            </CtaButton>
          </div>
        </FadeIn>

        <FadeIn delay={0.45} y={20}>
          <a
            href={mailto}
            className="inline-flex items-center gap-3 text-[#D7E2EA]/80 hover:text-[#D7E2EA] transition-colors text-sm md:text-base mt-4 group"
          >
            <Mail className="w-4 h-4 md:w-5 md:h-5" style={{ color: "#4a9eff" }} />
            <span className="tracking-wider">{contact.email}</span>
          </a>
        </FadeIn>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer
      className="px-5 sm:px-8 md:px-10 py-12 md:py-16 border-t"
      style={{ background: "#0C0C0C", borderColor: "rgba(215, 226, 234, 0.1)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <div className="hero-heading font-black uppercase tracking-tight text-2xl md:text-3xl">
            IV Reddy — Digital Craft
          </div>
          <p className="text-[#D7E2EA]/50 text-sm mt-2 font-light">
            Crafted with precision, creativity, and cinematic thinking.
          </p>
        </div>
        <p className="text-[#D7E2EA]/40 text-xs tracking-[0.3em] uppercase">
          © 2026 All Rights Reserved
        </p>
      </div>
    </footer>
  );
}
