// Where an application may receive the OAuth code. The provider only accepts
// https, plus http on localhost for apps under development. The third kind is
// the escape hatch for an internal network without TLS: http on the hosts the
// admin lists in NUXT_PUBLIC_INSECURE_REDIRECT_HOSTS — tokens then travel in
// clear on that network. Empty list = kind unavailable.

export const REDIRECT_KINDS = ["web", "native", "insecure"] as const;
export type RedirectKind = (typeof REDIRECT_KINDS)[number];

/** "192.168.1.50, Planning.local" → ["192.168.1.50", "planning.local"] */
export function parseInsecureHosts(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/** http URL whose host (without port) is one of the allowed hosts. */
export function isInsecureRedirectAllowed(uri: string, hosts: string[]): boolean {
  try {
    const url = new URL(uri);
    return url.protocol === "http:" && hosts.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
