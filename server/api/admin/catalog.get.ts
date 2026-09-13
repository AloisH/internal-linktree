// Every shared link in the default order — the admin's view.
export default defineEventHandler((): CategoryWithLinks[] => listSharedCatalog(useDb()));
