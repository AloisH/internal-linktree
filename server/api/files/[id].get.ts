import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const params = z.object({ id: z.coerce.number().int().positive() });

// Public download: the portal is internal but files are not secrets — anyone
// who can reach the page can open its documents. PDFs and images render
// inline, everything else downloads.
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse);
  const file = getStoredFile(useDb(), id);
  const path = file && join(uploadsDir(), file.stored_name);
  if (!file || !path || !existsSync(path)) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }
  const inline = file.file_mime === "application/pdf" || file.file_mime.startsWith("image/");
  const disposition = inline ? "inline" : "attachment";
  const ascii = file.file_name.replace(/[^\x20-\x7e]/g, "_");
  setHeaders(event, {
    "content-type": file.file_mime,
    "content-length": file.file_size,
    "content-disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
    "cache-control": "private, max-age=0, must-revalidate",
    "x-content-type-options": "nosniff",
  });
  return sendStream(event, createReadStream(path));
});
