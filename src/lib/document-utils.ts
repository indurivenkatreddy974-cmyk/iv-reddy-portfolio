export type DocumentKind = "pdf" | "image" | "web" | "unknown";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"];

export function normalizeUrl(raw?: string | null): string {
  const value = raw?.trim() ?? "";
  if (!value) return "";
  if (value.startsWith("/") || value.startsWith("blob:") || value.startsWith("data:")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^www\./i.test(value)) return `https://${value}`;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`;
  return value;
}

export function getDocumentKind(raw?: string | null): DocumentKind {
  const value = normalizeUrl(raw).toLowerCase();
  if (!value) return "unknown";
  if (value.startsWith("data:image/")) return "image";

  const pathname = (() => {
    try {
      return new URL(value, "http://localhost").pathname.toLowerCase();
    } catch {
      return value.toLowerCase();
    }
  })();

  if (pathname.endsWith(".pdf")) return "pdf";
  if (IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return "image";
  if (/^https?:\/\//i.test(value)) return "web";
  return "unknown";
}

export function normalizeExternalUrl(raw?: string | null): string | null {
  const value = normalizeUrl(raw);
  if (!value) return null;

  try {
    const url = new URL(
      value,
      typeof window !== "undefined" ? window.location.origin : "http://localhost",
    );
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function slugify(value: string) {
  return (
    value
      .trim()
      .replace(/[^\w\s.-]+/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^[_-]+|[_-]+$/g, "") || "document"
  );
}

export function getDocumentFilename(rawUrl?: string | null, title?: string) {
  const normalized = normalizeUrl(rawUrl);
  const ext = getDocumentKind(normalized) === "image" ? ".jpg" : ".pdf";

  if (title && title.trim()) {
    const base = slugify(title);
    return base.toLowerCase().endsWith(ext) ? base : `${base}${ext}`;
  }

  try {
    const pathname = new URL(
      normalized,
      typeof window !== "undefined" ? window.location.origin : "http://localhost",
    ).pathname;
    const last = pathname.split("/").filter(Boolean).pop();
    if (last) return decodeURIComponent(last);
  } catch {
    // ignore and fall back
  }

  return `document${ext}`;
}

export function getDownloadUrl(rawUrl?: string | null, title?: string) {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return "";

  try {
    const url = new URL(
      normalized,
      typeof window !== "undefined" ? window.location.origin : "http://localhost",
    );
    const isProxyRoute = url.pathname.startsWith("/api/public/m/");
    if (isProxyRoute) {
      url.searchParams.set("download", getDocumentFilename(normalized, title));
      return url.toString();
    }
    return url.toString();
  } catch {
    return normalized;
  }
}

function anchorDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.rel = "noreferrer";
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function triggerDocumentDownload(rawUrl?: string | null, title?: string) {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized || typeof document === "undefined") return false;

  const filename = getDocumentFilename(normalized, title);
  const href = getDownloadUrl(normalized, title);

  // Fetch as blob so the browser always downloads (never navigates the page).
  try {
    const res = await fetch(href, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const typedBlob = blob.type ? blob : new Blob([blob], { type: "application/pdf" });
    const objectUrl = URL.createObjectURL(typedBlob);
    anchorDownload(objectUrl, filename);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
    return true;
  } catch (err) {
    console.warn("[download] blob fetch failed", err);
    // Last-resort: open in a new tab so we never navigate the current app away.
    if (typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer");
    }
    return false;
  }
}

export function openVerifiedLink(rawUrl?: string | null) {
  const normalized = normalizeExternalUrl(rawUrl);
  if (!normalized || typeof window === "undefined") return false;
  window.open(normalized, "_blank", "noopener,noreferrer");
  return true;
}
