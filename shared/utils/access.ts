import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";
import type { Role } from "./roles";

// One access controller shared by the server (admin plugin) and the browser
// (admin client plugin) so both sides agree on the list of roles. Only the
// admin holds permissions here; the other roles are labels the applications
// interpret themselves.

export const ac = createAccessControl(defaultStatements);

export const roles = {
  admin: ac.newRole(adminAc.statements),
  radiologue: ac.newRole({}),
  manipulateur: ac.newRole({}),
  secretaire: ac.newRole({}),
  utilisateur: ac.newRole({}),
} satisfies Record<Role, unknown>;
