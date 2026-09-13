import { z } from "zod";

const params = z.object({ id: z.coerce.number().int().positive() });

// multipart/form-data with one "file" part: the owner's own icon for the link.
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse);
  requireManagedLink(event, id);
  const parts = (await readMultipartFormData(event)) ?? [];
  const upload = parts.find((p) => p.name === "file" && p.filename);
  if (!upload?.filename) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Fichier manquant",
    });
  }
  const check = checkUpload(
    { filename: upload.filename, size: upload.data.byteLength },
    ICON_RULES,
  );
  if (typeof check === "string")
    throw createError({ statusCode: 400, statusMessage: "Bad Request", message: check });

  const db = useDb();
  const stored = storedName(check.ext);
  writeUpload(stored, upload.data);
  let previous: string | null | undefined;
  try {
    previous = setLinkIcon(db, id, { stored_name: stored, mime: check.mime });
  } catch (err) {
    removeUpload(stored);
    throw err;
  }
  if (previous === undefined) {
    removeUpload(stored);
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }
  removeUpload(previous);
  return getLink(db, id) as Link;
});
