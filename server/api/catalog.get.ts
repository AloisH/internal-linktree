export default defineEventHandler((): CategoryWithLinks[] => listCatalog(useDb()));
