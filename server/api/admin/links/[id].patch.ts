import { z } from "zod";

const params = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse);
  const input = await readValidatedBody(event, linkUpdateSchema.parse);
  const db = useDb();
  if (!getCategory(db, input.category_id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Catégorie inconnue",
    });
  }
  const link = updateLink(db, id, input);
  if (!link) throw createError({ statusCode: 404, statusMessage: "Not found" });
  return link;
});
