import { z } from "zod";

const params = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse);
  const stored = deleteLink(useDb(), id);
  if (stored === undefined) throw createError({ statusCode: 404, statusMessage: "Not found" });
  removeUpload(stored);
  setResponseStatus(event, 204);
  return null;
});
