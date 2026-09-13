// The portal of the signed-in user: what they may see, in their own order.
export default defineEventHandler((event): CategoryWithLinks[] =>
  listCatalog(useDb(), viewerOf(requireUser(event))),
);
