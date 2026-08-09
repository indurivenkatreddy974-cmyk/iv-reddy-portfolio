"use client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { ExternalLink, Github, Play, Award, Trophy, X, Maximize2 } from "lucide-react";
import { listShowcase } from "@/lib/showcase.functions";
import { FadeIn } from "./FadeIn";
import useEmblaCarousel from "embla-carousel-react";

type Item = {
  id: string;
  kind: "project" | "certification" | "achievement" | "video";
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  poster_url: string | null;
  live_url: string | null;
  github_url: string | null;
  tech: string[];
  issuer: string | null;
  issue_date: string | null;
  verify_url: string | null;
  featured: boolean;
  sort_order: number;
};

function sortItems(items: Item[], featuredFirst: boolean, kinds: Item["kind"][]) {
  return [...items]
    .filter((i) => kinds.includes(i.kind))
    .sort((a, b) => {
      if (featuredFirst && a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
}

export function FeaturedWorkSection() {
  const list = useServerFn(listShowcase);
  const { data, isLoading } = useQuery({
    queryKey: ["showcase"],
    queryFn: () => list(),
    refetchOnWindowFocus: false,
  });

  const items = (data?.items ?? []) as Item[];
  const settings = data?.settings ?? {
    layout: "grid",
    featured_projects_first: true,
    featured_certs_first: true,
  };
  const featProjectsFirst = settings.featured_projects_first;
  const featCertsFirst = settings.featured_certs_first;

  const projects = sortItems(items, featProjectsFirst, ["project"]);
  const certs = sortItems(items, featCertsFirst, ["certification"]);
  const achievements = sortItems(items, true, ["achievement"]);
  const videos = sortItems(items, true, ["video"]);

  const ordered = [...projects, ...videos, ...achievements, ...certs];

  return (
    <section
      id="featured-work"
      className="relative z-10 px-4 sm:px-6 md:px-10 pt-24 pb-20"
      style={{ background: "#0C0C0C" }}
    >
      <FadeIn delay={0} y={40} className="text-center mb-12 md:mb-16">
        <div
          className="text-xs sm:text-sm uppercase tracking-[0.4em] mb-4"
          style={{ color: "#4a9eff" }}
        >
          Curated
        </div>
        <h2
          className="hero-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 9vw, 130px)" }}
        >
          Featured Work
        </h2>
        <p
          className="mt-6 font-light max-w-2xl mx-auto leading-relaxed"
          style={{ color: "#D7E2EA", opacity: 0.65, fontSize: "clamp(0.95rem, 1.4vw, 1.15rem)" }}
        >
          Selected projects, certifications, achievements, and digital experiences.
        </p>
      </FadeIn>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/40">Loading…</div>
        </div>
      )}

      {!isLoading && ordered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/40 mb-2">
            No items yet
          </div>
          <p className="text-sm text-[#D7E2EA]/60">Add featured work from the Atelier.</p>
        </div>
      )}

      {!isLoading && ordered.length > 0 && (
        <LayoutRenderer items={ordered} layout={settings.layout} />
      )}
    </section>
  );
}

function LayoutRenderer({ items, layout }: { items: Item[]; layout: string }) {
  if (layout === "carousel") return <CarouselLayout items={items} />;
  if (layout === "masonry") return <MasonryLayout items={items} />;
  if (layout === "featured") return <FeaturedHeroLayout items={items} />;
  return <GridLayout items={items} />;
}

function GridLayout({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 max-w-7xl mx-auto">
      {items.map((item, i) => (
        <FadeIn key={item.id} delay={i * 0.05} y={30}>
          <ShowcaseCard item={item} />
        </FadeIn>
      ))}
    </div>
  );
}

function MasonryLayout({ items }: { items: Item[] }) {
  return (
    <div className="max-w-7xl mx-auto columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-6">
      {items.map((item, i) => (
        <div key={item.id} className="mb-5 md:mb-6 break-inside-avoid">
          <FadeIn delay={i * 0.04} y={20}>
            <ShowcaseCard item={item} />
          </FadeIn>
        </div>
      ))}
    </div>
  );
}

function CarouselLayout({ items }: { items: Item[] }) {
  const [emblaRef] = useEmblaCarousel({ loop: true, align: "start" });
  return (
    <div className="max-w-7xl mx-auto overflow-hidden" ref={emblaRef}>
      <div className="flex gap-5 md:gap-6">
        {items.map((item) => (
          <div key={item.id} className="flex-[0_0_85%] sm:flex-[0_0_50%] lg:flex-[0_0_33%]">
            <ShowcaseCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedHeroLayout({ items }: { items: Item[] }) {
  const [hero, ...rest] = items;
  if (!hero) return null;
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      <FadeIn y={30}>
        <ShowcaseCard item={hero} large />
      </FadeIn>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {rest.map((item, i) => (
          <FadeIn key={item.id} delay={i * 0.04} y={20}>
            <ShowcaseCard item={item} />
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

function ShowcaseCard({ item, large = false }: { item: Item; large?: boolean }) {
  const [videoOpen, setVideoOpen] = useState(false);

  if (item.kind === "video") {
    return (
      <>
        <VideoCard item={item} large={large} onPlay={() => setVideoOpen(true)} />
        <VideoModal
          open={videoOpen}
          onClose={() => setVideoOpen(false)}
          url={item.media_url}
          title={item.title}
        />
      </>
    );
  }
  if (item.kind === "certification") return <CertCard item={item} large={large} />;
  if (item.kind === "achievement") return <AchievementCard item={item} large={large} />;
  return <ProjectCard item={item} large={large} />;
}

function CardShell({
  children,
  large,
  className = "",
}: {
  children: React.ReactNode;
  large?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 250, damping: 22 }}
      className={`group relative rounded-3xl overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(160deg, rgba(20,22,38,0.7), rgba(12,12,12,0.7))",
        border: "1px solid rgba(215,226,234,0.08)",
        backdropFilter: "blur(20px)",
        minHeight: large ? 480 : 320,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          boxShadow: "inset 0 0 60px rgba(74,158,255,0.15), 0 0 80px -10px rgba(74,158,255,0.4)",
        }}
      />
      {children}
    </motion.div>
  );
}

function ProjectCard({ item, large }: { item: Item; large?: boolean }) {
  return (
    <CardShell large={large}>
      {item.thumbnail_url && (
        <div className="relative overflow-hidden" style={{ aspectRatio: large ? "21/9" : "16/10" }}>
          <motion.img
            src={item.thumbnail_url}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0C] via-transparent to-transparent opacity-80" />
          {item.featured && (
            <span
              className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.3em] px-3 py-1 rounded-full text-white"
              style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
            >
              Featured
            </span>
          )}
        </div>
      )}
      <div className="p-6 flex flex-col gap-3">
        <h3
          className="font-semibold leading-tight"
          style={{ color: "#D7E2EA", fontSize: large ? "clamp(1.4rem, 2.5vw, 2rem)" : "1.2rem" }}
        >
          {item.title}
        </h3>
        {item.description && (
          <p className="text-sm leading-relaxed text-[#D7E2EA]/65 line-clamp-3">
            {item.description}
          </p>
        )}
        {item.tech.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {item.tech.map((t) => (
              <span
                key={t}
                className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-[#D7E2EA]/15 text-[#D7E2EA]/60"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-3">
          {item.live_url && (
            <a
              href={item.live_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs uppercase tracking-widest px-4 py-2 rounded-full text-white"
              style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Live
            </a>
          )}
          {item.github_url && (
            <a
              href={item.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs uppercase tracking-widest px-4 py-2 rounded-full text-[#D7E2EA] border border-[#D7E2EA]/15 hover:border-[#D7E2EA]/40 transition"
            >
              <Github className="w-3.5 h-3.5" /> Code
            </a>
          )}
        </div>
      </div>
    </CardShell>
  );
}

function CertCard({ item, large }: { item: Item; large?: boolean }) {
  return (
    <CardShell large={large} className="cert-card">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background:
              "linear-gradient(115deg, transparent 40%, rgba(215,226,234,0.08) 50%, transparent 60%)",
            animation: "shineSweep 1.5s ease-in-out",
          }}
        />
      </div>
      {item.thumbnail_url && (
        <div className="relative overflow-hidden" style={{ aspectRatio: "16/10" }}>
          <img
            src={item.thumbnail_url}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#4a9eff]">
          <Award className="w-3 h-3" /> Certification
        </div>
        <h3
          className="font-semibold leading-tight text-[#D7E2EA]"
          style={{ fontSize: large ? "1.6rem" : "1.15rem" }}
        >
          {item.title}
        </h3>
        {item.issuer && <div className="text-sm text-[#D7E2EA]/65">{item.issuer}</div>}
        {item.issue_date && (
          <div className="text-xs text-[#D7E2EA]/40 uppercase tracking-widest">
            {item.issue_date}
          </div>
        )}
        {item.verify_url && (
          <a
            href={item.verify_url}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start mt-3 flex items-center gap-1.5 text-xs uppercase tracking-widest px-4 py-2 rounded-full text-[#D7E2EA] border border-[#D7E2EA]/15 hover:border-[#4a9eff]/50 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Verify
          </a>
        )}
      </div>
    </CardShell>
  );
}

function AchievementCard({ item, large }: { item: Item; large?: boolean }) {
  return (
    <CardShell large={large}>
      {item.thumbnail_url && (
        <div className="relative overflow-hidden" style={{ aspectRatio: "16/10" }}>
          <motion.img
            src={item.thumbnail_url}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
      <div className="p-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#4a9eff]">
          <Trophy className="w-3 h-3" /> Achievement
        </div>
        <h3
          className="font-semibold leading-tight text-[#D7E2EA]"
          style={{ fontSize: large ? "1.6rem" : "1.15rem" }}
        >
          {item.title}
        </h3>
        {item.description && (
          <p className="text-sm leading-relaxed text-[#D7E2EA]/65">{item.description}</p>
        )}
      </div>
    </CardShell>
  );
}

function VideoCard({ item, large, onPlay }: { item: Item; large?: boolean; onPlay: () => void }) {
  const poster = item.poster_url ?? item.thumbnail_url;
  return (
    <CardShell large={large}>
      <button
        onClick={onPlay}
        className="relative w-full block overflow-hidden text-left"
        style={{ aspectRatio: large ? "21/9" : "16/10" }}
      >
        {poster ? (
          <motion.img
            src={poster}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.06 }}
            transition={{ duration: 0.5 }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#0C0C0C]" />
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <motion.div
            whileHover={{ scale: 1.15 }}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #4a9eff, #7621B0)",
              boxShadow: "0 10px 40px rgba(74,158,255,0.5)",
            }}
          >
            <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
          </motion.div>
        </div>
      </button>
      <div className="p-6 flex flex-col gap-2">
        <h3
          className="font-semibold leading-tight text-[#D7E2EA]"
          style={{ fontSize: large ? "1.6rem" : "1.15rem" }}
        >
          {item.title}
        </h3>
        {item.description && (
          <p className="text-sm leading-relaxed text-[#D7E2EA]/65 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>
    </CardShell>
  );
}

function VideoModal({
  open,
  onClose,
  url,
  title,
}: {
  open: boolean;
  onClose: () => void;
  url: string | null;
  title: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (open && videoRef.current) videoRef.current.play().catch(() => {});
  }, [open]);
  return (
    <AnimatePresence>
      {open && url && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-5xl rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(74,158,255,0.3)" }}
          >
            <video ref={videoRef} src={url} controls className="w-full h-auto" />
            <button
              type="button"
              aria-label="Close video"
              onClick={onClose}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-black/60 text-white hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Enter fullscreen"
              onClick={() => videoRef.current?.requestFullscreen()}
              className="absolute top-3 right-14 w-9 h-9 rounded-full flex items-center justify-center bg-black/60 text-white hover:bg-black/80"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-4 text-sm text-white/80">{title}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
