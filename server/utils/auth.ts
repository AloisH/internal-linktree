import type { DatabaseSync } from "node:sqlite";
import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { admin, jwt } from "better-auth/plugins";
import { ac, roles } from "../../shared/utils/access";
import { DEFAULT_ROLE, isRole } from "../../shared/utils/roles";
import { useDb } from "./db";

// This app is the identity provider for the clinic: accounts and roles live
// here, the other apps sign users in through OIDC (/api/auth/oauth2/*) and
// read the role from the `role` claim. No self sign-up — an admin creates
// every account.

function roleOf(user: Record<string, unknown>): string {
  return isRole(user.role) ? user.role : DEFAULT_ROLE;
}

export interface AuthConfig {
  /** Signs sessions and tokens; rotating it logs everyone out. 32+ chars. */
  secret: string;
  /** Public origin, also the OIDC issuer prefix. */
  baseURL: string;
}

export function createAuth(db: DatabaseSync, config: AuthConfig) {
  return betterAuth({
    database: db,
    secret: config.secret,
    baseURL: config.baseURL,
    basePath: "/api/auth",
    emailAndPassword: { enabled: true, disableSignUp: true },
    session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
    plugins: [
      admin({ ac, roles, defaultRole: DEFAULT_ROLE, adminRoles: ["admin"] }),
      jwt(),
      oauthProvider({
        loginPage: "/login",
        consentPage: "/consent",
        // Every client belongs to the clinic, not to the admin who created it.
        clientReference: () => "clinic",
        clientPrivileges: ({ user }) => user?.role === "admin",
        customIdTokenClaims: ({ user }) => ({ role: roleOf(user) }),
        customUserInfoClaims: ({ user }) => ({ role: roleOf(user) }),
      }),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;

/**
 * Creates the first admin when the user table is empty, so a fresh deployment
 * has someone able to log in. Returns whether an account was created.
 */
export async function seedAdmin(
  auth: Auth,
  db: DatabaseSync,
  input: { email: string; password: string; name: string },
): Promise<boolean> {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM "user"').get() as { n: number };
  if (n > 0) return false;
  await auth.api.createUser({ body: { ...input, role: "admin" } });
  return true;
}

let auth: Auth | undefined;

/** Process-wide Better Auth instance bound to the app database. */
export function useAuth(): Auth {
  if (!auth) {
    const config = useRuntimeConfig();
    auth = createAuth(useDb(), { secret: config.authSecret, baseURL: config.public.siteUrl });
  }
  return auth;
}
