import { z } from "zod";

const params = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse);
  const input = await readValidatedBody(event, categorySchema.parse);
  const category = updateCategory(useDb(), id, input);
  if (!category) throw createError({ statusCode: 404, statusMessage: "Not found" });
  return category;
});
