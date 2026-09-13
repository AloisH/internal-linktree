import { z } from "zod";

const params = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse);
  requireManagedLink(event, id);
  const previous = setLinkIcon(useDb(), id, null);
  if (previous === undefined) throw createError({ statusCode: 404, statusMessage: "Not found" });
  removeUpload(previous);
  setResponseStatus(event, 204);
  return null;
});
