export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, messageSchema.parse);
  const result = useDb()
    .prepare("INSERT INTO messages (name, email, body) VALUES (?, ?, ?)")
    .run(input.name, input.email, input.body);
  setResponseStatus(event, 201);
  return { id: Number(result.lastInsertRowid) };
});
