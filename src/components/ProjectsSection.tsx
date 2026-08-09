"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { FadeIn } from "./FadeIn";
import { CtaButton } from "./CtaButton";
import { useContent, type Project } from "@/lib/content-store";
import { useState } from "react";
import { VerifiedBadge } from "./blockchain/VerifiedBadge";
import { VerificationDialog } from "./blockchain/VerificationDialog";
import { useVerification, verificationRef } from "@/lib/blockchain/useVerification";
import type { PublicRecord } from "@/lib/blockchain/chains";

function ProjectCard({
  project,
  record,
  onProof,
  index,
  total,
  range,
  scrollYProgress,
}: {
  project: Project;
  record?: PublicRecord;
  onProof: (record: PublicRecord) => void;
  index: number;
  total: number;
  range: [number, number];
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const targetScale = 1 - (total - 1 - index) * 0.03;
  const scale = useTransform(scrollYProgress, range, [1, targetScale]);
  const hasVideo = Boolean(project.videoUrl);

  return (
    <div
      className="h-[85vh] sticky top-24 md:top-32 flex items-start justify-center"
      style={{ top: `${100 + index * 28}px` }}
    >
      <motion.div
        style={{ scale }}
        className="w-full rounded-[40px] sm:rounded-[50px] md:rounded-[60px] p-4 sm:p-6 md:p-8"
        {...({
          initial: { opacity: 0, y: 60 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "100px" },
          transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
        } as Record<string, unknown>)}
      >
        <div
          className="rounded-[40px] sm:rounded-[50px] md:rounded-[60px] p-4 sm:p-6 md:p-8 border-2"
          style={{ background: "#0C0C0C", borderColor: "#D7E2EA" }}
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6 md:mb-10">
            <div className="flex items-end gap-4 md:gap-8">
              <div
                className="hero-heading font-black"
                style={{ fontSize: "clamp(3rem, 10vw, 140px)", lineHeight: 0.9 }}
              >
                {project.n}
              </div>
              <div className="flex flex-col gap-2 pb-2 md:pb-4">
                <span
                  className="text-xs sm:text-sm uppercase tracking-[0.3em]"
                  style={{ color: "#7621B0" }}
                >
                  {project.type}
                </span>
                <h3
                  className="font-medium uppercase leading-tight"
                  style={{ color: "#D7E2EA", fontSize: "clamp(1.1rem, 2.4vw, 2.2rem)" }}
                >
                  {project.name}
                </h3>
                {record && (
                  <div className="mt-1">
                    <VerifiedBadge record={record} onOpen={onProof} compact />
                  </div>
                )}
                {project.tech.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {project.tech.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/70"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {project.liveUrl ? (
              <CtaButton href={project.liveUrl} variant="ghost" size="sm">
                Live Project
              </CtaButton>
            ) : (
              <CtaButton variant="ghost" size="sm">
                Live Project
              </CtaButton>
            )}
          </div>

          <p
            className="font-light leading-relaxed max-w-3xl mb-6 md:mb-10"
            style={{ color: "#D7E2EA", opacity: 0.7, fontSize: "clamp(0.9rem, 1.4vw, 1.15rem)" }}
          >
            {project.desc}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
            <div className="sm:col-span-2 flex flex-col gap-3 sm:gap-4 md:gap-5">
              {project.imgs[0] && (
                <img
                  src={project.imgs[0]}
                  alt={`${project.name} — preview 1`}
                  className="w-full rounded-[40px] sm:rounded-[50px] md:rounded-[60px] object-cover"
                  style={{ height: "clamp(130px, 16vw, 230px)" }}
                  loading="lazy"
                />
              )}
              {hasVideo ? (
                <video
                  src={project.videoUrl}
                  poster={project.posterUrl || project.imgs[1] || undefined}
                  aria-label={`${project.name} demo video`}
                  className="w-full rounded-[40px] sm:rounded-[50px] md:rounded-[60px] object-cover"
                  style={{ height: "clamp(160px, 22vw, 340px)" }}
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                project.imgs[1] && (
                  <img
                    src={project.imgs[1]}
                    alt={`${project.name} — preview 2`}
                    className="w-full rounded-[40px] sm:rounded-[50px] md:rounded-[60px] object-cover"
                    style={{ height: "clamp(160px, 22vw, 340px)" }}
                    loading="lazy"
                  />
                )
              )}
            </div>
            <div className="sm:col-span-3">
              {project.imgs[2] && (
                <img
                  src={project.imgs[2]}
                  alt={`${project.name} — feature screenshot`}
                  className="w-full h-full rounded-[40px] sm:rounded-[50px] md:rounded-[60px] object-cover"
                  style={{ minHeight: "clamp(310px, 40vw, 590px)" }}
                  loading="lazy"
                />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ProjectsSection() {
  const projects = useContent((s) => s.projects);
  const containerRef = useRef<HTMLDivElement>(null);
  const { byRef } = useVerification();
  const [proof, setProof] = useState<PublicRecord | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      id="projects"
      ref={containerRef}
      className="rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-10 sm:-mt-12 md:-mt-14 relative z-10 px-4 sm:px-6 md:px-10 pt-20 pb-32"
      style={{ background: "#0C0C0C" }}
    >
      <FadeIn delay={0} y={40} className="text-center mb-12 md:mb-20">
        <h2
          className="hero-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(3rem, 12vw, 160px)" }}
        >
          Projects
        </h2>
      </FadeIn>

      {projects.map((p, i) => {
        const start = i / Math.max(projects.length, 1);
        const end = 1;
        return (
          <ProjectCard
            key={p.id}
            project={p}
            record={byRef.get(verificationRef("project", p.id))}
            onProof={setProof}
            index={i}
            total={projects.length}
            range={[start, end]}
            scrollYProgress={scrollYProgress}
          />
        );
      })}

      <VerificationDialog record={proof} onClose={() => setProof(null)} />
    </section>
  );
}
