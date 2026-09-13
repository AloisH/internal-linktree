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
  const before = requireManagedLink(event, id);
  const link = updateLink(db, id, input) as Link;
  if (link.kind === "url" && link.url && link.url !== before.url) {
    await refreshLinkIcon(db, id, link.url);
    return getLink(db, id) as Link;
  }
  return link;
});
