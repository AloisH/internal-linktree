// Better Auth owns everything under /api/auth: sign-in, sessions, the admin
// plugin (/admin/*), the OIDC provider (/oauth2/*, /.well-known/*, /jwks).
export default defineEventHandler((event) => useAuth().handler(toWebRequest(event)));
