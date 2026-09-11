// Public: the organisation logo.
export default defineEventHandler((event) => sendStoredImage(event, getLogo(useDb())));
