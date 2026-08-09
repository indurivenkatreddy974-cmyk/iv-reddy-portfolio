"use client";
import { lazy, Suspense, useState } from "react";
import { motion } from "framer-motion";
import { FadeIn } from "./FadeIn";
import { useContent, type Certification } from "@/lib/content-store";
import { Award, Download, Eye, ExternalLink, FileText } from "lucide-react";
import { PdfPreviewModal } from "./PdfPreviewModal";
import { VerifiedBadge } from "./blockchain/VerifiedBadge";
import { VerificationDialog } from "./blockchain/VerificationDialog";
import { useVerification, verificationRef } from "@/lib/blockchain/useVerification";
import type { PublicRecord } from "@/lib/blockchain/chains";

const PdfThumbnail = lazy(() => import("./PdfThumbnail"));
import {
  getDocumentKind,
  normalizeExternalUrl,
  normalizeUrl,
  openVerifiedLink,
  triggerDocumentDownload,
} from "@/lib/document-utils";

export function CertificationsSection() {
  const items = useContent((s) => s.certifications);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);
  const [proof, setProof] = useState<PublicRecord | null>(null);
  const { byRef } = useVerification();

  if (!items || items.length === 0) return null;

  return (
    <section
      id="certifications"
      className="px-5 sm:px-8 md:px-10 py-24 sm:py-32 relative"
      style={{ background: "#0C0C0C" }}
    >
      <FadeIn delay={0} y={40} className="text-center mb-6">
        <h2
          className="hero-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 10vw, 130px)" }}
        >
          Certifications
        </h2>
      </FadeIn>

      <FadeIn delay={0.15} y={20} className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
        <p
          className="text-[#D7E2EA]/70 font-light leading-relaxed"
          style={{ fontSize: "clamp(0.95rem, 1.4vw, 1.15rem)" }}
        >
          Verified credentials from globally recognised programs, platforms, and industry training
          initiatives.
        </p>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
        {items.map((c, i) => (
          <FadeIn key={c.id} delay={i * 0.1} y={40}>
            <CertCard
              cert={c}
              record={byRef.get(verificationRef("certificate", c.id))}
              onProof={setProof}
              onPreview={(url, title) => setPreview({ url, title })}
            />
          </FadeIn>
        ))}
      </div>

      <PdfPreviewModal
        open={!!preview}
        url={preview?.url ?? ""}
        title={preview?.title}
        onClose={() => setPreview(null)}
      />
      <VerificationDialog record={proof} onClose={() => setProof(null)} />
    </section>
  );
}

function CertCard({
  cert,
  record,
  onProof,
  onPreview,
}: {
  cert: Certification;
  record?: PublicRecord;
  onProof: (record: PublicRecord) => void;
  onPreview: (url: string, title: string) => void;
}) {
  const documentUrl = normalizeUrl(cert.pdfUrl);
  const verificationUrl = normalizeExternalUrl(cert.verifyUrl);
  const documentKind = getDocumentKind(documentUrl);
  const canPreviewDocument = documentKind === "pdf" || documentKind === "image";
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [thumbFailed, setThumbFailed] = useState(false);

  const handleVerify = () => {
    if (verificationUrl) {
      openVerifiedLink(verificationUrl);
      return;
    }
    if (documentUrl && canPreviewDocument) {
      onPreview(documentUrl, `${cert.name} — ${cert.issuer}`);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-3xl overflow-hidden flex flex-col cursor-pointer"
      style={{
        background: "linear-gradient(160deg, rgba(20,22,38,0.75), rgba(12,12,12,0.75))",
        border: "1px solid rgba(215,226,234,0.1)",
        backdropFilter: "blur(20px)",
      }}
      onClick={() =>
        documentUrl && canPreviewDocument && onPreview(documentUrl, `${cert.name} — ${cert.issuer}`)
      }
    >
      {/* Glow border on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(74,158,255,0.45), 0 25px 60px -20px rgba(74,158,255,0.45)",
        }}
      />

      {/* Preview thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#0a0a0a]">
        {cert.previewUrl ? (
          <img
            src={cert.previewUrl}
            alt={cert.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : documentKind === "image" && documentUrl ? (
          <img
            src={documentUrl}
            alt={cert.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : documentKind === "pdf" && documentUrl && !thumbFailed ? (
          <div className="absolute inset-0 overflow-hidden bg-white transition-transform duration-700 group-hover:scale-105">
            <Suspense fallback={<div className="w-full h-full bg-white/5" />}>
              <PdfThumbnail
                url={documentUrl}
                width={520}
                onPages={setPageCount}
                onError={() => setThumbFailed(true)}
              />
            </Suspense>
          </div>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(74,158,255,0.18), transparent 60%), radial-gradient(circle at 80% 80%, rgba(118,33,176,0.18), transparent 60%)",
            }}
          >
            <FileText className="w-20 h-20 text-[#D7E2EA]/30 transition-transform duration-500 group-hover:scale-110" />
          </div>
        )}

        {/* Page indicator */}
        {documentKind === "pdf" && pageCount && (
          <div
            className="absolute top-3 left-3 text-[10px] uppercase tracking-widest text-white px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            Page 1 of {pageCount}
          </div>
        )}

        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none"
          style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.7))" }}
        >
          <div
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-white px-4 py-2 rounded-full"
            style={{ background: "rgba(74,158,255,0.25)", backdropFilter: "blur(10px)" }}
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#4a9eff]" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#4a9eff]">
            {cert.issuer}
          </span>
        </div>
        <h3 className="font-medium uppercase tracking-wide text-[#D7E2EA] text-lg leading-tight">
          {cert.name}
        </h3>
        <div className="text-xs text-[#D7E2EA]/50">Issued {cert.issueDate}</div>
        {record && (
          <div onClick={(e) => e.stopPropagation()}>
            <VerifiedBadge record={record} onOpen={onProof} compact />
          </div>
        )}

        <div className="flex items-center gap-2 mt-auto pt-3" onClick={(e) => e.stopPropagation()}>
          {documentUrl && (
            <button
              onClick={() => {
                if (canPreviewDocument) onPreview(documentUrl, `${cert.name} — ${cert.issuer}`);
              }}
              className="flex-1 flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full text-white"
              style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
              disabled={!canPreviewDocument}
            >
              <Eye className="w-3.5 h-3.5" /> View
            </button>
          )}
          {documentUrl && (
            <button
              onClick={() =>
                void triggerDocumentDownload(documentUrl, `${cert.name} ${cert.issuer}`)
              }
              className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/85 hover:text-white hover:border-[#4a9eff]/50 transition"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          {(verificationUrl || (documentUrl && canPreviewDocument)) && (
            <button
              onClick={handleVerify}
              className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/85 hover:text-white hover:border-[#4a9eff]/50 transition"
              title={verificationUrl ? "Verify" : "Open certificate"}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
