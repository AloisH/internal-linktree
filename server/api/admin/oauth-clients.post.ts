import { parseInsecureHosts } from "../../../shared/utils/redirects";

// Declares an application (OIDC client). Better Auth checks the admin session
// itself through `clientPrivileges`; the route only adds the redirect kinds.
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, oauthClientSchema.parse);
  const hosts = parseInsecureHosts(useRuntimeConfig(event).public.insecureRedirectHosts);
  const created = await createOAuthClientFor(useAuth(), useDb(), event.headers, input, hosts);
  setResponseStatus(event, 201);
  return created;
});
