import { z } from "zod";

const params = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse);
  requireManagedLink(event, id);
  deleteLink(useDb(), id)?.forEach(removeUpload);
  setResponseStatus(event, 204);
  return null;
});
