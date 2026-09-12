import { z } from "zod";
import { REDIRECT_KINDS } from "./redirects";
import { ROLES } from "./roles";

// Schemas validated twice: in the browser by UForm and on the server by
// readValidatedBody. Nuxt auto-imports everything under shared/utils.

/** Curated lucide icons an admin can pick for a category. */
export const CATEGORY_ICONS = [
  "i-lucide-folder",
  "i-lucide-stethoscope",
  "i-lucide-hospital",
  "i-lucide-heart-pulse",
  "i-lucide-activity",
  "i-lucide-pill",
  "i-lucide-syringe",
  "i-lucide-clipboard-list",
  "i-lucide-file-text",
  "i-lucide-calendar",
  "i-lucide-users",
  "i-lucide-shield-check",
  "i-lucide-phone",
  "i-lucide-book-open",
  "i-lucide-graduation-cap",
  "i-lucide-briefcase",
] as const;

const name = z.string().trim().min(1, "Requis").max(80, "80 caractères maximum");
const description = z
  .string()
  .trim()
  .max(300, "300 caractères maximum")
  .transform((s) => (s.length ? s : null))
  .nullable()
  .optional();

export const categorySchema = z.object({
  name,
  description,
  icon: z.enum(CATEGORY_ICONS),
});
export type CategoryInput = z.infer<typeof categorySchema>;

const linkBase = {
  category_id: z.coerce.number().int().positive(),
  title: z.string().trim().min(1, "Requis").max(120, "120 caractères maximum"),
  description,
};

/** A link to an application or an external page. */
export const urlLinkSchema = z.object({
  ...linkBase,
  url: z.url({ protocol: /^https?$/, message: "Adresse invalide (http:// ou https://)" }).max(2000),
});
export type UrlLinkInput = z.infer<typeof urlLinkSchema>;

/** Metadata that travels with an uploaded file (the file itself is multipart). */
export const fileLinkSchema = z.object(linkBase);
export type FileLinkInput = z.infer<typeof fileLinkSchema>;

/** Editing never changes the kind: a url link keeps its url, a file keeps its file. */
export const linkUpdateSchema = z.object({
  ...linkBase,
  url: urlLinkSchema.shape.url.optional(),
});
export type LinkUpdateInput = z.infer<typeof linkUpdateSchema>;

export const reorderSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
});

/** Uploads: what the browser accepts and what the server enforces. */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const ALLOWED_EXTENSIONS: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
};
export const FILE_ACCEPT = Object.keys(ALLOWED_EXTENSIONS)
  .map((ext) => `.${ext}`)
  .join(",");

/** The organisation logo: images only, small. */
export const MAX_LOGO_SIZE = 2 * 1024 * 1024;
export const LOGO_EXTENSIONS: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};
export const LOGO_ACCEPT = Object.keys(LOGO_EXTENSIONS)
  .map((ext) => `.${ext}`)
  .join(",");

/** Icon of a url link: the site's favicon or an admin upload. */
export const MAX_ICON_SIZE = 1024 * 1024;
export const ICON_EXTENSIONS: Record<string, string> = {
  ...LOGO_EXTENSIONS,
  ico: "image/x-icon",
  gif: "image/gif",
};
export const ICON_ACCEPT = Object.keys(ICON_EXTENSIONS)
  .map((ext) => `.${ext}`)
  .join(",");

// ── Accounts and OIDC clients ──────────────────────────────────

export const loginSchema = z.object({
  email: z.email("Adresse invalide"),
  password: z.string().min(1, "Requis"),
});
export type LoginInput = z.infer<typeof loginSchema>;

const password = z.string().min(12, "12 caractères minimum").max(128, "128 caractères maximum");

export const userCreateSchema = z.object({
  name,
  email: z.email("Adresse invalide").max(254),
  password,
  role: z.enum(ROLES),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const passwordSchema = z.object({ password });
export type PasswordInput = z.infer<typeof passwordSchema>;

/** An application allowed to sign users in through this server (OIDC). */
export const oauthClientSchema = z.object({
  client_name: name,
  kind: z.enum(REDIRECT_KINDS),
  redirect_uris: z
    .string()
    .transform((s) =>
      s
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.url({ protocol: /^https?$/, message: "Adresse invalide (http:// ou https://)" }))
        .min(1, "Au moins une URL de retour"),
    ),
});
export type OAuthClientInput = z.infer<typeof oauthClientSchema>;
