"use client";
import { Document, Page, pdfjs } from "react-pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

  // pdf.js rejects its in-flight fetch with an AbortError when a <Document>
  // unmounts mid-load (closing the preview, scrolling a thumbnail out of view).
  // That cancellation is expected and already handled by react-pdf, but the
  // worker's internal promise surfaces as an unhandled rejection. Acknowledge
  // only that exact case; every other rejection still propagates.
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as { name?: string; message?: string } | undefined;
    const isAbort =
      reason?.name === "AbortError" || /BodyStreamBuffer was aborted/i.test(reason?.message ?? "");
    if (isAbort) event.preventDefault();
  });
}

type PdfCanvasProps = {
  file: { url: string; withCredentials?: boolean } | null;
  pageNumber: number;
  width?: number;
  height?: number;
  scale?: number;
  ready: boolean;
  onLoadSuccess: (doc: { numPages: number }) => void;
  onLoadError: (err: unknown) => void;
  loadingNode: React.ReactNode;
  errorNode: React.ReactNode;
  noDataNode: React.ReactNode;
  renderKey: string;
};

export default function PdfCanvas({
  file,
  pageNumber,
  width,
  height,
  scale,
  ready,
  onLoadSuccess,
  onLoadError,
  loadingNode,
  errorNode,
  noDataNode,
  renderKey,
}: PdfCanvasProps) {
  return (
    <Document
      file={file ?? undefined}
      onLoadSuccess={onLoadSuccess}
      onLoadError={onLoadError}
      loading={loadingNode}
      error={errorNode}
      noData={noDataNode}
    >
      {ready && (
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "#fff",
            boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)",
          }}
        >
          <Page
            key={renderKey}
            pageNumber={pageNumber}
            width={width}
            height={height}
            scale={scale}
            renderAnnotationLayer
            renderTextLayer
          />
        </div>
      )}
    </Document>
  );
}
