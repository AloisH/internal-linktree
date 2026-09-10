import { z } from "zod";

const params = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse);
  const { changes } = useDb().prepare("DELETE FROM messages WHERE id = ?").run(id);
  if (changes === 0) throw createError({ statusCode: 404, statusMessage: "Not found" });
  setResponseStatus(event, 204);
  return null;
});
