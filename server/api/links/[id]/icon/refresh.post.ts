import { z } from "zod";

const params = z.object({ id: z.coerce.number().int().positive() });

// Fetches the site's favicon again. 200 with the link either way; the
// client reads icon_version to know whether one was found.
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse);
  const db = useDb();
  const link = requireManagedLink(event, id);
  if (link.kind !== "url" || !link.url) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Seule une application a une icône",
    });
  }
  const found = await refreshLinkIcon(db, id, link.url);
  return { found, link: getLink(db, id) as Link };
});
