import { getMigrations } from "better-auth/db/migration";
import { describe, expect, it } from "vitest";
import { createAuth, createOAuthClientFor, seedAdmin } from "./auth";
import { openDb } from "./db";

const CONFIG = {
  secret: "test-secret-test-secret-test-secret-42",
  baseURL: "http://localhost:3000",
};
const ADMIN = { email: "admin@example.com", password: "correct-horse-battery", name: "Admin" };

function setup() {
  const db = openDb(":memory:");
  return { db, auth: createAuth(db, CONFIG) };
}

describe("auth", () => {
  it("MIGRATIONS already hold every table and column Better Auth expects", async () => {
    const { auth } = setup();
    const pending = await getMigrations(auth.options);
    expect(pending.toBeCreated).toEqual([]);
    expect(pending.toBeAdded).toEqual([]);
  });

  it("seedAdmin creates the first admin once; it can sign in, wrong passwords cannot", async () => {
    const { db, auth } = setup();
    expect(await seedAdmin(auth, db, ADMIN)).toBe(true);
    expect(await seedAdmin(auth, db, ADMIN)).toBe(false);

    const signedIn = await auth.api.signInEmail({ body: ADMIN });
    expect(signedIn.user.email).toBe(ADMIN.email);
    expect((signedIn.user as { role?: string }).role).toBe("admin");

    await expect(
      auth.api.signInEmail({ body: { ...ADMIN, password: "not-the-password" } }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("without a sign-up domain, only admins create accounts, with a known role", async () => {
    const { auth } = setup();
    await expect(
      auth.api.signUpEmail({ body: { ...ADMIN, email: "new@example.com" } }),
    ).rejects.toMatchObject({ body: { code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" } });
    await expect(
      auth.api.createUser({
        body: { ...ADMIN, email: "x@example.com", role: "dentiste" as "admin" },
      }),
    ).rejects.toMatchObject({ body: { code: "YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE" } });
    const user = await auth.api.createUser({
      body: { ...ADMIN, email: "y@example.com", role: "manipulateur" },
    });
    expect(user.user.role).toBe("manipulateur");
  });

  it("with a sign-up domain, matching addresses register as utilisateur, others cannot", async () => {
    const db = openDb(":memory:");
    const auth = createAuth(db, { ...CONFIG, signupEmailDomain: "@Clinique.fr" });
    await expect(
      auth.api.signUpEmail({ body: { ...ADMIN, email: "someone@gmail.com" } }),
    ).rejects.toMatchObject({ body: { code: "EMAIL_DOMAIN_NOT_ALLOWED" } });
    const signedUp = await auth.api.signUpEmail({
      body: { ...ADMIN, email: "Marie.Dupont@clinique.fr" },
    });
    expect((signedUp.user as { role?: string }).role).toBe("utilisateur");
  });
});

describe("createOAuthClientFor", () => {
  const HOSTS = ["192.168.1.50"];

  async function adminHeaders(auth: ReturnType<typeof createAuth>, db: ReturnType<typeof openDb>) {
    await seedAdmin(auth, db, ADMIN);
    const { headers } = await auth.api.signInEmail({ body: ADMIN, returnHeaders: true });
    const cookie = headers.get("set-cookie")?.split(";")[0] ?? "";
    return new Headers({ cookie, origin: CONFIG.baseURL });
  }

  it("registers https clients through the provider, http only on the allowed hosts", async () => {
    const { db, auth } = setup();
    const headers = await adminHeaders(auth, db);
    const web = await createOAuthClientFor(
      auth,
      db,
      headers,
      { client_name: "Web", kind: "web", redirect_uris: ["https://app.example.com/cb"] },
      HOSTS,
    );
    expect(web.client_id).toBeTruthy();
    expect(web.client_secret).toBeTruthy();

    await expect(
      createOAuthClientFor(
        auth,
        db,
        headers,
        { client_name: "Bad", kind: "insecure", redirect_uris: ["http://192.168.1.51/cb"] },
        HOSTS,
      ),
    ).rejects.toMatchObject({ body: { code: "INSECURE_HOST_NOT_ALLOWED" } });

    const internal = await createOAuthClientFor(
      auth,
      db,
      headers,
      { client_name: "LAN", kind: "insecure", redirect_uris: ["http://192.168.1.50:3000/cb"] },
      HOSTS,
    );
    const clients = await auth.api.getOAuthClients({ headers });
    const row = clients?.find((c) => c.client_id === internal.client_id);
    expect(row?.redirect_uris).toEqual(["http://192.168.1.50:3000/cb"]);
  });
});
