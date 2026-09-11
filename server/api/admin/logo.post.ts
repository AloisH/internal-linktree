// multipart/form-data with one "file" part: replaces the organisation logo.
export default defineEventHandler(async (event) => {
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
    LOGO_RULES,
  );
  if (typeof check === "string")
    throw createError({ statusCode: 400, statusMessage: "Bad Request", message: check });

  const db = useDb();
  const stored = storedName(check.ext);
  writeUpload(stored, upload.data);
  let previous: string | null;
  try {
    previous = setLogo(db, { stored_name: stored, mime: check.mime });
  } catch (err) {
    removeUpload(stored);
    throw err;
  }
  removeUpload(previous);
  return getSiteSettings(db);
});
