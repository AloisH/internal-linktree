import { z } from "zod";

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
