// Presentation helpers shared by the public page and the admin.

export function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function fileExtension(name: string | null): string {
  const ext = name?.split(".").pop();
  return ext && ext !== name ? ext.toUpperCase() : "";
}

export function fileIcon(mime: string | null): string {
  if (!mime) return "i-lucide-file";
  if (mime === "application/pdf") return "i-lucide-file-text";
  if (mime.startsWith("image/")) return "i-lucide-image";
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv")
    return "i-lucide-file-spreadsheet";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "i-lucide-presentation";
  if (mime.includes("word") || mime.includes("opendocument.text") || mime === "text/plain")
    return "i-lucide-file-text";
  return "i-lucide-file";
}

export function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
