import type { ReactNode } from "react";

interface CtaButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "gradient" | "ghost";
  size?: "sm" | "md";
}

export function CtaButton({
  children,
  href,
  onClick,
  variant = "gradient",
  size = "md",
}: CtaButtonProps) {
  const sizeCls =
    size === "sm"
      ? "px-6 py-2.5 text-xs sm:text-sm"
      : "px-8 py-3 sm:px-10 sm:py-3.5 md:px-12 md:py-4 text-xs sm:text-sm md:text-base";

  const baseCls =
    "inline-flex items-center justify-center rounded-full font-medium uppercase tracking-widest transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] whitespace-nowrap";

  if (variant === "ghost") {
    const cls = `${baseCls} ${sizeCls} border-2 text-[#D7E2EA] hover:bg-[#D7E2EA]/10`;
    const style = { borderColor: "#D7E2EA" };
    return href ? (
      <a href={href} className={cls} style={style}>
        {children}
      </a>
    ) : (
      <button onClick={onClick} className={cls} style={style}>
        {children}
      </button>
    );
  }

  const gradientStyle = {
    background: "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
    boxShadow: "0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset",
    outline: "2px solid #ffffff",
    outlineOffset: "-3px",
    color: "#fff",
  };

  return href ? (
    <a href={href} className={`${baseCls} ${sizeCls}`} style={gradientStyle}>
      {children}
    </a>
  ) : (
    <button onClick={onClick} className={`${baseCls} ${sizeCls}`} style={gradientStyle}>
      {children}
    </button>
  );
}
