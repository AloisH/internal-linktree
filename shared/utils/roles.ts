// Every user carries exactly one role. The server validates it (admin plugin
// `roles`), the OIDC tokens carry it as a `role` claim, the admin picks it.
// Self-registered accounts start as "utilisateur" until an admin promotes them.

export const ROLES = ["admin", "radiologue", "manipulateur", "secretaire", "utilisateur"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  radiologue: "Radiologue",
  manipulateur: "Manipulateur",
  secretaire: "Secrétaire",
  utilisateur: "Utilisateur",
};

/** Role given when none is specified — the least privileged. */
export const DEFAULT_ROLE: Role = "utilisateur";

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function roleLabel(value: unknown): string {
  return isRole(value) ? ROLE_LABELS[value] : String(value ?? "");
}

/** Only same-origin paths may be used as a post-login destination. */
export function safeRedirect(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}
