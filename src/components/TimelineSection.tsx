"use client";
import { FadeIn } from "./FadeIn";
import { useContent } from "@/lib/content-store";

export function TimelineSection() {
  const items = useContent((s) => s.timeline);
  return (
    <section
      id="timeline"
      className="px-5 sm:px-8 md:px-10 py-24 sm:py-32"
      style={{ background: "#0C0C0C" }}
    >
      <FadeIn delay={0} y={40} className="text-center mb-16 md:mb-24">
        <h2
          className="hero-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 10vw, 130px)" }}
        >
          Journey Timeline
        </h2>
      </FadeIn>

      <div className="relative max-w-4xl mx-auto">
        <div
          className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-[2px] timeline-line sm:-translate-x-1/2"
          aria-hidden
        />

        <div className="flex flex-col gap-10 md:gap-14">
          {items.map((item, i) => (
            <FadeIn
              key={item.id}
              delay={i * 0.12}
              y={40}
              className={`relative flex sm:items-center gap-6 ${
                i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
              }`}
            >
              <div
                className="absolute left-4 sm:left-1/2 sm:-translate-x-1/2 w-4 h-4 rounded-full z-10"
                style={{
                  background: "linear-gradient(135deg, #4a9eff, #7621B0)",
                  boxShadow: "0 0 24px #4a9eff, 0 0 0 4px #0C0C0C",
                }}
              />
              <div className="hidden sm:block sm:w-1/2" />
              <div className="pl-12 sm:pl-0 sm:w-1/2 sm:px-8">
                <div className="tech-card rounded-2xl p-5 md:p-7">
                  <span
                    className="text-[10px] tracking-[0.4em] uppercase block mb-2"
                    style={{ color: "#4a9eff" }}
                  >
                    Stage {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-medium uppercase text-[#D7E2EA] text-xl md:text-2xl mb-2 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-[#D7E2EA]/60 font-light leading-relaxed text-sm md:text-base">
                    {item.desc}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
