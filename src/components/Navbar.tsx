"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV = ["ABOUT", "PROJECTS", "INTERNSHIPS", "EDUCATION", "TIMELINE", "SKILLS", "CONTACT"];

const SECTION_IDS: Record<string, string> = {
  ABOUT: "about",
  PROJECTS: "projects",
  INTERNSHIPS: "internships",
  EDUCATION: "education",
  TIMELINE: "timeline",
  SKILLS: "tech",
  CONTACT: "contact",
};

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      // active section detection
      const offset = window.innerHeight * 0.35;
      let current = "";
      for (const item of NAV) {
        const el = document.getElementById(SECTION_IDS[item]);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - offset <= 0) current = item;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const linkColor = (item: string) => (active === item ? "#60A5FA" : "#CBD5E1");

  return (
    <>
      <a
        href="#about"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-full focus:bg-[#0C0C0C] focus:text-white focus:outline-none focus:ring-2 focus:ring-[#4a9eff]"
      >
        Skip to content
      </a>
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center"
        aria-label="Primary"
      >
        <div
          className={`mt-3 sm:mt-4 transition-all duration-300 ease-out rounded-full px-2 sm:px-3 ${
            scrolled
              ? "bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_24px_rgba(96,165,250,0.08)]"
              : "bg-transparent border border-transparent"
          }`}
        >
          {/* Desktop */}
          <ul className="hidden md:flex items-center gap-1 lg:gap-2 px-2 py-2">
            {NAV.map((item) => (
              <li key={item}>
                <a
                  href={`#${SECTION_IDS[item]}`}
                  className="relative group px-3 lg:px-4 py-2 rounded-full text-[11px] lg:text-xs font-medium tracking-[0.18em] uppercase transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0C0C]"
                  style={{ color: linkColor(item) }}
                  aria-current={active === item ? "page" : undefined}
                  onMouseEnter={(e) => {
                    if (active !== item) e.currentTarget.style.color = "#F8FAFC";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = linkColor(item);
                  }}
                >
                  {item}
                  <span
                    className="pointer-events-none absolute left-3 right-3 lg:left-4 lg:right-4 bottom-1 h-px origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
                    style={{
                      background: "linear-gradient(90deg, transparent, #60A5FA, transparent)",
                      boxShadow: "0 0 8px rgba(96,165,250,0.6)",
                      transform: active === item ? "scaleX(1)" : undefined,
                    }}
                  />
                </a>
              </li>
            ))}
          </ul>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-nav-menu"
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-full text-[#CBD5E1] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]"
          >
            <Menu size={20} />
          </button>
        </div>
      </motion.nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] md:hidden"
            style={{
              background:
                "linear-gradient(160deg, rgba(5,8,20,0.96) 0%, rgba(10,15,30,0.94) 60%, rgba(0,0,0,0.96) 100%)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          >
            <div className="flex items-center justify-end px-6 pt-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex items-center justify-center w-12 h-12 rounded-full text-[#CBD5E1] hover:text-white border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]"
              >
                <X size={22} />
              </button>
            </div>
            <ul className="flex flex-col items-center justify-center gap-2 px-8 pt-8 pb-12 h-[calc(100%-72px)]">
              {NAV.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.08 + i * 0.06,
                    type: "spring",
                    stiffness: 220,
                    damping: 22,
                  }}
                  className="w-full max-w-sm"
                >
                  <a
                    href={`#${SECTION_IDS[item]}`}
                    onClick={() => setOpen(false)}
                    aria-current={active === item ? "page" : undefined}
                    className="block w-full text-center py-4 rounded-2xl text-lg font-medium tracking-[0.22em] uppercase border border-white/[0.06] hover:border-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]"
                    style={{ color: active === item ? "#60A5FA" : "#CBD5E1" }}
                  >
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer so content doesn't slide under the fixed nav */}
      <div aria-hidden className="h-20 md:h-24" />
    </>
  );
}
