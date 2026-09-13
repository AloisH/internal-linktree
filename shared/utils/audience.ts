import { ROLE_LABELS, ROLES, type Role } from "./roles";

// Who sees a link. "perso" is private to its owner, "tous" is for everyone,
// a role name is for the users carrying that role (admins see every shared
// link). The owner and the admins may edit or delete it.

export const AUDIENCES = ["perso", "tous", ...ROLES] as const;
export type Audience = (typeof AUDIENCES)[number];

const ROLE_AUDIENCE_LABELS: Record<Role, string> = {
  admin: "Les administrateurs",
  radiologue: "Les radiologues",
  manipulateur: "Les manipulateurs",
  secretaire: "Les secrétaires",
  utilisateur: "Les utilisateurs",
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  perso: "Moi uniquement",
  tous: "Tout le monde",
  ...ROLE_AUDIENCE_LABELS,
};

export function isAudience(value: unknown): value is Audience {
  return typeof value === "string" && (AUDIENCES as readonly string[]).includes(value);
}

/** Short badge text: "Personnel", "Radiologues"… ; empty for everyone. */
export function audienceTag(audience: Audience): string {
  if (audience === "tous") return "";
  if (audience === "perso") return "Personnel";
  return `${ROLE_LABELS[audience]}s`;
}

export function audienceIcon(audience: Audience): string {
  if (audience === "perso") return "i-lucide-lock";
  if (audience === "tous") return "i-lucide-users";
  return "i-lucide-user-round";
}

/** The owner and the admins manage a link; nobody else. */
export function canManageLink(
  link: { owner_id: string | null },
  user: { id: string; role?: string | null },
): boolean {
  return user.role === "admin" || (link.owner_id !== null && link.owner_id === user.id);
}
