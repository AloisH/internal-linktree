export default defineEventHandler(async (event) => {
  const { ids } = await readValidatedBody(event, reorderSchema.parse);
  reorderCategories(useDb(), ids);
  return { ok: true };
});
