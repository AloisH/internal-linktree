import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/vue";

// Browser-side Better Auth: sign-in/out, the admin plugin (accounts, roles)
// and the OAuth provider plugin, which forwards the signed authorize query
// so a login started by another app resumes where it left off.
export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles }), oauthProviderClient()],
});
