"use client";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Move,
  StretchHorizontal,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  getDocumentFilename,
  getDocumentKind,
  normalizeUrl,
  triggerDocumentDownload,
} from "@/lib/document-utils";

const PdfCanvas = lazy(() => import("./PdfCanvas"));

export type PdfPreviewModalProps = {
  open: boolean;
  url: string;
  title?: string;
  onClose: () => void;
};

type FitMode = "custom" | "width" | "page";

export function PdfPreviewModal({ open, url, title, onClose }: PdfPreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState<FitMode>("width");
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const wrapRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Focus management: move focus into modal on open, restore on close
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => {
      window.clearTimeout(t);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  // Focus trap within the modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = wrapRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const normalizedUrl = useMemo(() => normalizeUrl(url), [url]);
  const documentKind = useMemo(() => getDocumentKind(normalizedUrl), [normalizedUrl]);

  // Reset on new document
  useEffect(() => {
    if (!open) return;
    setZoom(1);
    setFit("width");
    setPageNumber(1);
    setNumPages(0);
    setLoadError(null);
    setReady(false);
  }, [open, normalizedUrl]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (documentKind !== "pdf") return;
      if (e.key === "ArrowRight" || e.key === "PageDown")
        setPageNumber((p) => Math.min(numPages || p + 1, p + 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") setPageNumber((p) => Math.max(1, p - 1));
      if (e.key === "+" || e.key === "=") {
        setFit("custom");
        setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)));
      }
      if (e.key === "-" || e.key === "_") {
        setFit("custom");
        setZoom((z) => Math.max(0.4, +(z - 0.2).toFixed(2)));
      }
      if (e.key === "0") {
        setFit("width");
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, documentKind, numPages]);

  // Track fullscreen state
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Track viewport size for fit modes
  useEffect(() => {
    if (!open) return;
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setContainerWidth(rect.width - 32);
      setContainerHeight(rect.height - 32);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, ready]);

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  const handleDownload = useCallback(() => {
    void triggerDocumentDownload(normalizedUrl, title);
  }, [normalizedUrl, title]);

  const documentFile = useMemo(
    () => (normalizedUrl ? { url: normalizedUrl, withCredentials: false } : null),
    [normalizedUrl],
  );

  const pageWidth =
    fit === "width" ? containerWidth || undefined : fit === "page" ? undefined : undefined;
  const pageHeight = fit === "page" ? containerHeight || undefined : undefined;
  const pageScale = fit === "custom" ? zoom : undefined;

  const renderBody = () => {
    if (!normalizedUrl) return <FallbackState message="Document unavailable" />;
    if (loadError) return <FallbackState message={loadError} url={normalizedUrl} title={title} />;

    if (documentKind === "image") {
      return (
        <div className="w-full h-full overflow-auto p-4 sm:p-6 flex items-start justify-center">
          <img
            src={normalizedUrl}
            alt={title ?? "Document preview"}
            className="rounded-2xl shadow-2xl"
            style={{ width: `${zoom * 100}%`, maxWidth: 1400, height: "auto" }}
            onLoad={() => setReady(true)}
            onError={() => setLoadError("Document unavailable")}
          />
        </div>
      );
    }

    if (documentKind === "pdf" && !mounted) {
      return <LoadingState label="Preparing viewer…" />;
    }

    if (documentKind === "pdf") {
      return (
        <div
          ref={viewportRef}
          className="w-full h-full overflow-auto flex items-start justify-center px-4 py-4 sm:py-6"
          style={{ background: "#141414" }}
        >
          <Suspense fallback={<LoadingState label="Loading document…" />}>
            <PdfCanvas
              file={documentFile}
              pageNumber={pageNumber}
              width={pageWidth}
              height={pageHeight}
              scale={pageScale}
              ready={ready}
              renderKey={`p-${pageNumber}-${fit}-${zoom}-${containerWidth}-${containerHeight}`}
              onLoadSuccess={(doc) => {
                setNumPages(doc.numPages);
                setReady(true);
                setLoadError(null);
              }}
              onLoadError={(err) => {
                console.error("[PDF] load error", err);
                setLoadError("Failed to render document. It may be missing or unsupported.");
              }}
              loadingNode={<LoadingState label="Loading document…" />}
              errorNode={
                <FallbackState
                  message="Failed to render document"
                  url={normalizedUrl}
                  title={title}
                />
              }
              noDataNode={
                <FallbackState message="Document unavailable" url={normalizedUrl} title={title} />
              }
            />
          </Suspense>
        </div>
      );
    }

    return (
      <FallbackState
        message="Preview not available for this file"
        url={normalizedUrl}
        title={title}
      />
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(24px)" }}
            onClick={onClose}
          />
          <motion.div
            ref={wrapRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Document preview"}
            initial={{ scale: 0.96, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-6xl h-[94vh] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(160deg, rgba(20,22,38,0.95), rgba(12,12,12,0.95))",
              border: "1px solid rgba(74,158,255,0.3)",
              boxShadow: "0 30px 80px -20px rgba(74,158,255,0.4)",
            }}
          >
            {/* Toolbar */}
            <div
              className="flex flex-wrap items-center gap-2 px-3 sm:px-5 py-3 border-b"
              style={{ borderColor: "rgba(215,226,234,0.1)" }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-[#4a9eff] shrink-0" />
                <div className="text-xs sm:text-sm font-medium text-[#D7E2EA] truncate">
                  {title ?? getDocumentFilename(normalizedUrl, title)}
                </div>
              </div>

              <div className="flex items-center gap-1 order-3 sm:order-none w-full sm:w-auto justify-between sm:justify-start flex-wrap">
                {/* Zoom */}
                <div className="flex items-center gap-1">
                  <ToolbarBtn
                    onClick={() => {
                      setFit("custom");
                      setZoom((z) => Math.max(0.4, +(z - 0.2).toFixed(2)));
                    }}
                    ariaLabel="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </ToolbarBtn>
                  <div className="text-[10px] uppercase tracking-widest text-[#D7E2EA]/70 w-14 text-center">
                    {fit === "width"
                      ? "Fit W"
                      : fit === "page"
                        ? "Fit P"
                        : `${Math.round(zoom * 100)}%`}
                  </div>
                  <ToolbarBtn
                    onClick={() => {
                      setFit("custom");
                      setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)));
                    }}
                    ariaLabel="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </ToolbarBtn>
                </div>

                {/* Fit modes */}
                {documentKind === "pdf" && (
                  <div className="flex items-center gap-1 ml-2">
                    <ToolbarBtn
                      active={fit === "width"}
                      onClick={() => setFit("width")}
                      ariaLabel="Fit width"
                    >
                      <StretchHorizontal className="w-4 h-4" />
                    </ToolbarBtn>
                    <ToolbarBtn
                      active={fit === "page"}
                      onClick={() => setFit("page")}
                      ariaLabel="Fit page"
                    >
                      <Move className="w-4 h-4" />
                    </ToolbarBtn>
                  </div>
                )}

                {/* Pagination */}
                {documentKind === "pdf" && numPages > 0 && (
                  <div className="flex items-center gap-1 ml-2">
                    <ToolbarBtn
                      onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                      disabled={pageNumber <= 1}
                      ariaLabel="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </ToolbarBtn>
                    <div className="text-[10px] uppercase tracking-widest text-[#D7E2EA]/70 min-w-[70px] text-center tabular-nums">
                      {pageNumber} / {numPages}
                    </div>
                    <ToolbarBtn
                      onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                      disabled={pageNumber >= numPages}
                      ariaLabel="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </ToolbarBtn>
                  </div>
                )}
              </div>

              <ToolbarBtn
                onClick={toggleFullscreen}
                ariaLabel="Toggle fullscreen"
                className="hidden sm:flex"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </ToolbarBtn>
              <a
                href={normalizedUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#D7E2EA]/70 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0C0C]"
                aria-label="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={handleDownload}
                aria-label="Download document"
                className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-widest px-3 py-2 rounded-full text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0C0C]"
                style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#D7E2EA]/70 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0C0C]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden bg-[#141414]">{renderBody()}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToolbarBtn({
  onClick,
  disabled,
  ariaLabel,
  children,
  active,
  className,
}: {
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9eff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0C0C] ${
        active
          ? "bg-[#4a9eff]/20 text-white"
          : "text-[#D7E2EA]/70 hover:text-white hover:bg-white/10"
      } disabled:opacity-30 disabled:cursor-not-allowed ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function LoadingState({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div
      className={`w-full flex items-center justify-center text-[#D7E2EA]/60 ${compact ? "py-24" : "h-full py-24"}`}
    >
      <div className="flex items-center gap-3 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );
}

function FallbackState({ message, url, title }: { message: string; url?: string; title?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="max-w-md rounded-3xl border border-[#D7E2EA]/10 bg-white/5 px-6 py-8 text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-[#4a9eff]" />
        <div className="text-sm text-[#D7E2EA]">{message}</div>
        <div className="text-xs text-[#D7E2EA]/50 mt-2">
          Try opening it in a new tab or downloading the file.
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2 rounded-full text-white"
              style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
          )}
          {url && (
            <button
              onClick={() => void triggerDocumentDownload(url, title)}
              className="flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/85"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
