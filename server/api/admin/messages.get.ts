export default defineEventHandler((): Message[] => {
  // ponytail: newest 500, no paging — a contact form fills slower than that.
  return useDb()
    .prepare("SELECT id, name, email, body, created_at FROM messages ORDER BY id DESC LIMIT 500")
    .all() as unknown as Message[];
});
