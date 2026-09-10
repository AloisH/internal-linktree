import { z } from "zod";

const params = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse);
  const files = deleteCategory(useDb(), id);
  if (!files) throw createError({ statusCode: 404, statusMessage: "Not found" });
  files.forEach(removeUpload);
  setResponseStatus(event, 204);
  return null;
});
