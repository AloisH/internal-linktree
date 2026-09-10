export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, categorySchema.parse);
  setResponseStatus(event, 201);
  return createCategory(useDb(), input);
});
