import type { DatabaseSync } from "node:sqlite";

/** Fetches the site's favicon and makes it the link's icon; false when none was found. */
export async function refreshLinkIcon(db: DatabaseSync, id: number, url: string): Promise<boolean> {
  const icon = await fetchFavicon(url);
  if (!icon) return false;
  const stored = storedName(icon.ext);
  writeUpload(stored, icon.data);
  let previous: string | null | undefined;
  try {
    previous = setLinkIcon(db, id, { stored_name: stored, mime: icon.mime });
  } catch (err) {
    removeUpload(stored);
    throw err;
  }
  if (previous === undefined) {
    removeUpload(stored);
    return false;
  }
  removeUpload(previous);
  return true;
}
