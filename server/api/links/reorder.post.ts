// The user's own tile order on the portal; the default order is the admin's.
export default defineEventHandler(async (event) => {
  const { ids } = await readValidatedBody(event, reorderSchema.parse);
  reorderLinksFor(useDb(), requireUser(event).id, ids);
  return { ok: true };
});
