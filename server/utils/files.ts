import { randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALLOWED_EXTENSIONS,
  LOGO_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_LOGO_SIZE,
} from "../../shared/utils/schemas";

// Uploads live on disk next to the SQLite file (NUXT_UPLOADS_DIR), named by a
// random token so the original name never touches the filesystem.

export interface UploadCandidate {
  filename: string;
  size: number;
}

export interface UploadCheck {
  ext: string;
  mime: string;
}

export interface UploadRules {
  /** extension → mime */
  allowed: Record<string, string>;
  maxSize: number;
}

/** Link files: the broad document allowlist. */
export const FILE_RULES: UploadRules = { allowed: ALLOWED_EXTENSIONS, maxSize: MAX_FILE_SIZE };
/** The organisation logo: images only. */
export const LOGO_RULES: UploadRules = { allowed: LOGO_EXTENSIONS, maxSize: MAX_LOGO_SIZE };

/** Validates name and size against an allowlist; returns the reason it fails. */
export function checkUpload(file: UploadCandidate, rules = FILE_RULES): UploadCheck | string {
  const ext = file.filename.split(".").pop()?.toLowerCase() ?? "";
  const mime = ext && ext !== file.filename ? rules.allowed[ext] : undefined;
  if (!mime) return "Type de fichier non autorisé";
  if (file.size === 0) return "Fichier vide";
  if (file.size > rules.maxSize) {
    return `Fichier trop volumineux (${Math.round(rules.maxSize / 1024 / 1024)} Mo maximum)`;
  }
  return { ext, mime };
}

/** `<32 hex chars>.<ext>` — collision-free and shell-safe. */
export function storedName(ext: string): string {
  return `${randomBytes(16).toString("hex")}.${ext}`;
}

/** Strips path separators and control characters; keeps a sane length. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "fichier";
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\x00-\x1f"]/g, "").trim();
  return (cleaned || "fichier").slice(0, 200);
}

export function uploadsDir(): string {
  const dir = useRuntimeConfig().uploadsDir;
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeUpload(name: string, data: Uint8Array): string {
  const path = join(uploadsDir(), name);
  writeFileSync(path, data, { flag: "wx" });
  return path;
}

export function removeUpload(name: string | null | undefined): void {
  if (!name) return;
  try {
    unlinkSync(join(uploadsDir(), name));
  } catch {
    // Already gone — the row is the source of truth, the file is disposable.
  }
}
