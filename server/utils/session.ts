import type { H3Event } from "h3";
import { DEFAULT_ROLE, isRole } from "../../shared/utils/roles";
import { canManageLink } from "../../shared/utils/audience";

// server/middleware/auth.ts checks the session and leaves the user on the
// event; handlers past it read the user from here instead of asking Better
// Auth a second time.

declare module "h3" {
  interface H3EventContext {
    user?: SessionUser;
  }
}

/** The signed-in user; 401 when the middleware let the request through without one. */
export function requireUser(event: H3Event): SessionUser {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  return user;
}

export function viewerOf(user: SessionUser): Viewer {
  return { id: user.id, role: isRole(user.role) ? user.role : DEFAULT_ROLE };
}

/** The link, provided it exists (404) and the user may edit it (403). */
export function requireManagedLink(event: H3Event, id: number): Link {
  const link = getLink(useDb(), id);
  if (!link) throw createError({ statusCode: 404, statusMessage: "Not found" });
  if (!canManageLink(link, requireUser(event))) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
  return link;
}
