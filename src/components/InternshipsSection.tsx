"use client";
import { useState } from "react";
import { FadeIn } from "./FadeIn";
import { useContent, type Internship } from "@/lib/content-store";
import { Building2, FileSignature, Eye, Download } from "lucide-react";
import { PdfPreviewModal } from "./PdfPreviewModal";
import { normalizeUrl, triggerDocumentDownload } from "@/lib/document-utils";
import { VerifiedBadge } from "./blockchain/VerifiedBadge";
import { VerificationDialog } from "./blockchain/VerificationDialog";
import { useVerification, verificationRef } from "@/lib/blockchain/useVerification";
import type { PublicRecord } from "@/lib/blockchain/chains";

export function InternshipsSection() {
  const internships = useContent((s) => s.internships);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);
  const [proof, setProof] = useState<PublicRecord | null>(null);
  const { byRef } = useVerification();

  return (
    <section
      id="internships"
      className="px-5 sm:px-8 md:px-10 py-24 sm:py-32 relative"
      style={{ background: "#0C0C0C" }}
    >
      <FadeIn delay={0} y={40} className="text-center mb-6">
        <h2
          className="hero-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 10vw, 130px)" }}
        >
          Internships
        </h2>
      </FadeIn>

      <FadeIn delay={0.15} y={20} className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
        <p
          className="text-[#D7E2EA]/70 font-light leading-relaxed"
          style={{ fontSize: "clamp(0.95rem, 1.4vw, 1.15rem)" }}
        >
          Learning through practical exposure, applied research, and real-world industry workflows
          while strengthening technical and problem-solving skills.
        </p>
      </FadeIn>

      <div
        className={`grid gap-6 md:gap-8 max-w-6xl mx-auto ${internships.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}
      >
        {internships.map((item, i) => (
          <FadeIn key={item.id} delay={i * 0.15} y={40}>
            <InternshipCard
              item={item}
              certRecord={byRef.get(verificationRef("internship", item.id, "certificate"))}
              offerRecord={byRef.get(verificationRef("internship", item.id, "offer"))}
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

function InternshipCard({
  item,
  certRecord,
  offerRecord,
  onProof,
  onPreview,
}: {
  item: Internship;
  certRecord?: PublicRecord;
  offerRecord?: PublicRecord;
  onProof: (record: PublicRecord) => void;
  onPreview: (url: string, title: string) => void;
}) {
  const skills = item.skills ?? [];
  const certificateUrl = normalizeUrl(item.certificateUrl);
  const offerLetterUrl = normalizeUrl(item.offerLetterUrl);
  return (
    <div className="tech-card rounded-3xl p-7 md:p-9 h-full flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
        >
          {item.logoUrl ? (
            <img src={item.logoUrl} alt={item.company} className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-7 h-7 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="text-[10px] tracking-[0.4em] uppercase block"
            style={{ color: "#4a9eff" }}
          >
            {item.duration}
          </span>
          <h3 className="font-medium uppercase tracking-wide text-[#D7E2EA] text-lg md:text-xl mt-1">
            {item.company}
          </h3>
        </div>
      </div>

      <div className="text-sm uppercase tracking-widest" style={{ color: "#7621B0" }}>
        {item.role}
      </div>

      {(certRecord || offerRecord) && (
        <div className="flex flex-wrap gap-2">
          <VerifiedBadge record={certRecord} onOpen={onProof} compact />
          <VerifiedBadge record={offerRecord} onOpen={onProof} compact />
        </div>
      )}

      <p className="text-[#D7E2EA]/65 font-light leading-relaxed text-sm md:text-base">
        {item.contributions}
      </p>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <span
              key={s}
              className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border border-[#D7E2EA]/15 text-[#D7E2EA]/75"
              style={{ background: "rgba(74,158,255,0.06)" }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-auto pt-2">
        {certificateUrl && (
          <>
            <button
              onClick={() => onPreview(certificateUrl, `${item.company} — Completion Certificate`)}
              className="flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full text-white"
              style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
            >
              <Eye className="w-3.5 h-3.5" /> View Certificate
            </button>
            <button
              onClick={() =>
                void triggerDocumentDownload(
                  certificateUrl,
                  `${item.company} Completion Certificate`,
                )
              }
              className="flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/85 hover:text-white hover:border-[#4a9eff]/50 transition"
            >
              <Download className="w-3.5 h-3.5" /> Download Certificate
            </button>
          </>
        )}
        {offerLetterUrl && (
          <>
            <button
              onClick={() => onPreview(offerLetterUrl, `${item.company} — Offer Letter`)}
              className="flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/85 hover:text-white hover:border-[#4a9eff]/50 transition"
            >
              <FileSignature className="w-3.5 h-3.5" /> View Offer Letter
            </button>
            <button
              onClick={() =>
                void triggerDocumentDownload(offerLetterUrl, `${item.company} Offer Letter`)
              }
              className="flex items-center gap-2 text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/85 hover:text-white hover:border-[#4a9eff]/50 transition"
            >
              <Download className="w-3.5 h-3.5" /> Download Offer Letter
            </button>
          </>
        )}
      </div>
    </div>
  );
}
