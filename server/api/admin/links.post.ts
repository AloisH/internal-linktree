// Two shapes on one route, told apart by the content type:
//   application/json  → url link  (urlLinkSchema)
//   multipart/form-data → file link (fileLinkSchema fields + a "file" part)
export default defineEventHandler(async (event) => {
  const db = useDb();
  const contentType = getHeader(event, "content-type") ?? "";

  if (!contentType.startsWith("multipart/form-data")) {
    const input = await readValidatedBody(event, urlLinkSchema.parse);
    assertCategory(input.category_id);
    const link = createUrlLink(db, input);
    // Best effort: an unreachable site simply gets the generic icon.
    await refreshLinkIcon(db, link.id, input.url);
    setResponseStatus(event, 201);
    return getLink(db, link.id) as Link;
  }

  const parts = (await readMultipartFormData(event)) ?? [];
  const fields: Record<string, string> = {};
  let upload: { filename: string; data: Uint8Array } | undefined;
  for (const part of parts) {
    if (part.name === "file" && part.filename) {
      upload = { filename: part.filename, data: part.data };
    } else if (part.name) {
      fields[part.name] = part.data.toString("utf8");
    }
  }
  const parsed = fileLinkSchema.safeParse(fields);
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Bad Request", data: parsed.error.issues });
  }
  if (!upload)
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Fichier manquant",
    });
  const check = checkUpload({ filename: upload.filename, size: upload.data.byteLength });
  if (typeof check === "string")
    throw createError({ statusCode: 400, statusMessage: "Bad Request", message: check });
  assertCategory(parsed.data.category_id);

  const stored = storedName(check.ext);
  writeUpload(stored, upload.data);
  try {
    const link = createFileLink(db, parsed.data, {
      file_name: cleanFileName(upload.filename),
      stored_name: stored,
      file_mime: check.mime,
      file_size: upload.data.byteLength,
    });
    setResponseStatus(event, 201);
    return link;
  } catch (err) {
    removeUpload(stored);
    throw err;
  }
});

function assertCategory(id: number): void {
  if (!getCategory(useDb(), id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Catégorie inconnue",
    });
  }
}
