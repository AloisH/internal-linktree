import { z } from "zod";

const params = z.object({ id: z.coerce.number().int().positive() });

// Public: a url link's own icon (favicon or admin upload).
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse);
  return sendStoredImage(event, getLinkIcon(useDb(), id));
});
