export default defineEventHandler(async (event) => {
  const { ids } = await readValidatedBody(event, reorderSchema.parse);
  reorderLinks(useDb(), ids);
  return { ok: true };
});
