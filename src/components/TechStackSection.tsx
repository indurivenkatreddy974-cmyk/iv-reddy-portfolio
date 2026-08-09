"use client";
import { FadeIn } from "./FadeIn";
import { useContent } from "@/lib/content-store";

export function TechStackSection() {
  const stack = useContent((s) => s.techStack);
  return (
    <section
      id="tech"
      className="px-5 sm:px-8 md:px-10 py-24 sm:py-32"
      style={{ background: "#0C0C0C" }}
    >
      <FadeIn delay={0} y={40} className="text-center mb-16 md:mb-20">
        <h2
          className="hero-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 10vw, 130px)" }}
        >
          Tech Stack
        </h2>
      </FadeIn>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-5 max-w-5xl mx-auto">
        {stack.map((tech, i) => (
          <FadeIn key={tech + i} delay={i * 0.05} y={30}>
            <div className="tech-card rounded-2xl p-6 md:p-7 flex items-center justify-center text-center min-h-[100px] md:min-h-[120px]">
              <span
                className="font-medium uppercase tracking-widest text-sm md:text-base"
                style={{ color: "#D7E2EA" }}
              >
                {tech}
              </span>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
