"use client";
import { FadeIn } from "./FadeIn";
import { GraduationCap } from "lucide-react";
import { useContent } from "@/lib/content-store";

export function EducationSection() {
  const educations = useContent((s) => s.educations);
  return (
    <section
      id="education"
      className="px-5 sm:px-8 md:px-10 py-24 sm:py-32"
      style={{ background: "#0C0C0C" }}
    >
      <FadeIn delay={0} y={40} className="text-center mb-16 md:mb-20">
        <h2
          className="hero-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 10vw, 130px)" }}
        >
          Education
        </h2>
      </FadeIn>

      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        {educations.map((e, i) => (
          <FadeIn key={e.id} delay={0.1 + i * 0.1} y={40}>
            <div className="tech-card rounded-3xl p-8 md:p-12 flex flex-col md:flex-row gap-8 items-start">
              <div
                className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #4a9eff 0%, #7621B0 100%)",
                  boxShadow: "0 10px 30px -10px rgba(74, 158, 255, 0.5)",
                }}
              >
                <GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <div className="flex flex-col gap-3 flex-1">
                <span className="text-xs tracking-[0.4em] uppercase" style={{ color: "#4a9eff" }}>
                  {e.institution} · {e.year}
                </span>
                <h3 className="font-medium uppercase text-[#D7E2EA] text-2xl md:text-3xl tracking-tight">
                  {e.degree}
                </h3>
                {e.percentage && e.percentage.trim() && (
                  <div className="flex items-baseline gap-3 mt-1">
                    <span
                      className="font-black tracking-tight"
                      style={{
                        fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                        background: "linear-gradient(135deg, #4a9eff, #7621B0)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        lineHeight: 1,
                      }}
                    >
                      {e.percentage}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.4em] text-[#D7E2EA]/50">
                      Aggregate
                    </span>
                  </div>
                )}
                <p className="text-[#D7E2EA]/70 font-light leading-relaxed text-base md:text-lg">
                  {e.description}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
