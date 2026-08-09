"use client";
import { FadeIn } from "./FadeIn";
import { Magnet } from "./Magnet";
import { CtaButton } from "./CtaButton";
import { useContent } from "@/lib/content-store";
import { useState } from "react";
import { VerifiedBadge } from "./blockchain/VerifiedBadge";
import { VerificationDialog } from "./blockchain/VerificationDialog";
import { useVerification, verificationRef } from "@/lib/blockchain/useVerification";
import type { PublicRecord } from "@/lib/blockchain/chains";

export function HeroSection() {
  const hero = useContent((s) => s.hero);
  const media = useContent((s) => s.media);
  const portrait = media.profilePhoto || hero.portraitUrl;
  const { byRef } = useVerification();
  const resumeRecord = byRef.get(verificationRef("resume", "main"));
  const [proof, setProof] = useState<PublicRecord | null>(null);

  return (
    <section
      id="hero"
      className="relative h-screen flex flex-col px-6 md:px-10"
      style={{ overflowX: "clip" }}
    >
      <div className="absolute inset-0 cinematic-glow pointer-events-none" />

      <FadeIn delay={0.1} y={-10} className="relative z-20 mt-8 sm:mt-10">
        <div className="flex items-center gap-3 text-[10px] sm:text-xs md:text-sm tracking-[0.4em] text-[#D7E2EA]/70 uppercase">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: "#4a9eff", boxShadow: "0 0 12px #4a9eff" }}
          />
          {hero.roleLabel}
          <span className="hidden sm:inline opacity-40">— {hero.name}</span>
        </div>
      </FadeIn>

      <div className="relative z-20 overflow-hidden flex-1 flex flex-col justify-center">
        <FadeIn delay={0.15} y={40}>
          <h1 className="hero-heading font-black tracking-tight leading-none whitespace-nowrap w-full text-[42vw] sm:text-[36vw] md:text-[30vw] lg:text-[26vw]">
            <span className="sr-only">Induri Venkata Reddy — Full Stack Developer</span>
            <span aria-hidden="true">{hero.heading}</span>
          </h1>
        </FadeIn>
      </div>

      <Magnet
        padding={150}
        strength={3}
        className="absolute left-1/2 -translate-x-1/2 z-10 top-1/2 -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-0 w-[260px] sm:w-[340px] md:w-[420px] lg:w-[500px]"
      >
        <FadeIn delay={0.6} y={30}>
          <div className="relative">
            <div
              className="absolute inset-0 blur-3xl opacity-50 rounded-full"
              style={{ background: "radial-gradient(circle, #7621B0 0%, transparent 60%)" }}
            />
            <img
              src={portrait}
              alt={`${hero.name} portrait`}
              className="relative w-full h-auto"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width={1024}
              height={1280}
            />
          </div>
        </FadeIn>
      </Magnet>

      <div className="relative z-20 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-7 sm:pb-8 md:pb-10">
        <FadeIn delay={0.35} y={20}>
          <p
            className="text-[#D7E2EA] font-light uppercase tracking-wide leading-snug max-w-[200px] sm:max-w-[260px] md:max-w-[320px]"
            style={{ fontSize: "clamp(0.75rem, 1.2vw, 1.25rem)" }}
          >
            {hero.tagline}
          </p>
        </FadeIn>

        <FadeIn delay={0.5} y={20}>
          <div className="flex flex-wrap items-center gap-3">
            <CtaButton href={hero.cta1.href} size="sm">
              {hero.cta1.label}
            </CtaButton>
            <CtaButton href={hero.cta2.href} variant="ghost" size="sm">
              {hero.cta2.label}
            </CtaButton>
            <CtaButton href={media.resumeUrl || hero.cta3.href} variant="ghost" size="sm">
              {hero.cta3.label}
            </CtaButton>
            <VerifiedBadge record={resumeRecord} onOpen={setProof} />
          </div>
        </FadeIn>
      </div>
      <VerificationDialog record={proof} onClose={() => setProof(null)} />
    </section>
  );
}
