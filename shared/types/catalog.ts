export interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  position: number;
  created_at: string;
}

export type LinkKind = "url" | "file";

export interface Link {
  id: number;
  category_id: number;
  kind: LinkKind;
  title: string;
  description: string | null;
  url: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size: number | null;
  /** Set when the link has its own icon; changes on every update (cache-busting). */
  icon_version: string | null;
  position: number;
  created_at: string;
}

export interface CategoryWithLinks extends Category {
  links: Link[];
}

/** Public site settings. `logo_version` changes on every upload (cache-busting). */
export interface SiteSettings {
  logo_version: string | null;
}
