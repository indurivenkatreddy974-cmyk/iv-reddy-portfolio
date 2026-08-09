"use client";
import { FadeIn } from "./FadeIn";

const SERVICES = [
  {
    n: "01",
    name: "Full Stack Development",
    desc: "Building scalable web applications using modern frontend and backend technologies with clean architecture and performance-focused development.",
  },
  {
    n: "02",
    name: "UI / UX Experiences",
    desc: "Designing intuitive and visually refined interfaces that balance usability, hierarchy, and memorable interaction design.",
  },
  {
    n: "03",
    name: "Responsive Web Systems",
    desc: "Creating fully responsive and adaptive digital experiences that work seamlessly across mobile, tablet, and desktop environments.",
  },
  {
    n: "04",
    name: "Creative Frontend Engineering",
    desc: "Developing motion-driven and interaction-focused interfaces with smooth transitions, animations, and immersive storytelling.",
  },
  {
    n: "05",
    name: "Digital Product Development",
    desc: "Turning ideas into functional digital products through planning, development, testing, and continuous refinement.",
  },
];

export function ServicesSection() {
  return (
    <section
      id="services"
      className="bg-white rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] px-5 sm:px-8 md:px-10 py-20 sm:py-24 md:py-32"
      style={{ background: "#FFFFFF", color: "#0C0C0C" }}
    >
      <FadeIn delay={0} y={40}>
        <h2
          className="font-black uppercase text-center mb-16 sm:mb-20 md:mb-28"
          style={{ color: "#0C0C0C", fontSize: "clamp(3rem, 12vw, 160px)", lineHeight: 1 }}
        >
          Services
        </h2>
      </FadeIn>

      <div className="max-w-5xl mx-auto">
        {SERVICES.map((s, i) => (
          <FadeIn key={s.n} delay={i * 0.1} y={30}>
            <div
              className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 md:gap-12 py-8 sm:py-10 md:py-12"
              style={{
                borderTop: i === 0 ? "1px solid rgba(12,12,12,0.15)" : "none",
                borderBottom: "1px solid rgba(12,12,12,0.15)",
              }}
            >
              <div
                className="font-black shrink-0"
                style={{ fontSize: "clamp(3rem, 10vw, 140px)", color: "#0C0C0C", lineHeight: 0.9 }}
              >
                {s.n}
              </div>
              <div className="flex flex-col gap-2 sm:gap-4">
                <h3
                  className="font-medium uppercase"
                  style={{ fontSize: "clamp(1rem, 2.2vw, 2.1rem)", color: "#0C0C0C" }}
                >
                  {s.name}
                </h3>
                <p
                  className="font-light leading-relaxed max-w-2xl"
                  style={{
                    fontSize: "clamp(0.85rem, 1.6vw, 1.25rem)",
                    color: "#0C0C0C",
                    opacity: 0.6,
                  }}
                >
                  {s.desc}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
