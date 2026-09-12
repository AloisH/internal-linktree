/**
 * The signed-in user, loaded on the server (cookie forwarded) and hydrated.
 * Null when there is no session — pages behind the login never see that.
 */
export function useSessionUser() {
  return useFetch<SessionInfo | null>("/api/auth/get-session", {
    key: "session",
    headers: useRequestHeaders(["cookie"]),
    default: () => null,
  });
}

/** Signs out and reloads on the login page, dropping every cached payload. */
export async function signOut(): Promise<void> {
  await authClient.signOut();
  await navigateTo("/login", { external: true });
}
