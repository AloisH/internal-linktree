import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

// ponytail: migrations are an ordered array of SQL applied above PRAGMA
// user_version — append, never edit a past entry. Reach for Drizzle when a
// query gets painful to write by hand, not before.
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE messages (
     id         INTEGER PRIMARY KEY,
     name       TEXT NOT NULL,
     email      TEXT NOT NULL,
     body       TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
   )`,
  // v2 — the link portal: categories hold links to apps (url) or uploaded
  // files. The starter's contact form is gone with it.
  `DROP TABLE messages;
   CREATE TABLE categories (
     id          INTEGER PRIMARY KEY,
     name        TEXT NOT NULL,
     description TEXT,
     icon        TEXT NOT NULL DEFAULT 'i-lucide-folder',
     position    INTEGER NOT NULL DEFAULT 0,
     created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
   );
   CREATE TABLE links (
     id          INTEGER PRIMARY KEY,
     category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
     kind        TEXT NOT NULL CHECK (kind IN ('url', 'file')),
     title       TEXT NOT NULL,
     description TEXT,
     url         TEXT,
     file_name   TEXT,
     stored_name TEXT,
     file_mime   TEXT,
     file_size   INTEGER,
     position    INTEGER NOT NULL DEFAULT 0,
     created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
   );
   CREATE INDEX links_category ON links (category_id, position);`,
  // v3 — site-wide settings as a singleton row: the organisation logo, an
  // uploaded image stored like link files (random name on disk).
  `CREATE TABLE site (
     id              INTEGER PRIMARY KEY CHECK (id = 1),
     logo_stored_name TEXT,
     logo_mime        TEXT,
     logo_updated_at  TEXT
   );
   INSERT INTO site (id) VALUES (1);`,
  // v4 — a url link can carry its own icon (the site's favicon, fetched by
  // the server, or an image uploaded by the admin), stored like a file.
  `ALTER TABLE links ADD COLUMN icon_stored_name TEXT;
   ALTER TABLE links ADD COLUMN icon_mime TEXT;
   ALTER TABLE links ADD COLUMN icon_updated_at TEXT;`,
  // v5 — accounts. Better Auth's tables (admin + jwt + oauth-provider plugins),
  // generated with getMigrations() and frozen here: server/utils/auth.test.ts
  // fails the day the plugins expect something this schema lacks.
  `create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null, "role" text, "banned" integer, "banReason" text, "banExpires" date);
   create table "session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade, "impersonatedBy" text);
   create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);
   create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null);
   create table "jwks" ("id" text not null primary key, "publicKey" text not null, "privateKey" text not null, "createdAt" date not null, "expiresAt" date, "alg" text, "crv" text);
   create table "oauthClient" ("id" text not null primary key, "clientId" text not null unique, "clientSecret" text, "clientDiscoveryId" text, "disabled" integer, "skipConsent" integer, "enableEndSession" integer, "subjectType" text, "scopes" text, "clientCredentialsScopes" text, "userId" text references "user" ("id") on delete cascade, "createdAt" date, "updatedAt" date, "name" text, "uri" text, "icon" text, "contacts" text, "tos" text, "policy" text, "softwareId" text, "softwareVersion" text, "softwareStatement" text, "redirectUris" text not null, "postLogoutRedirectUris" text, "backchannelLogoutUri" text, "backchannelLogoutSessionRequired" integer, "tokenEndpointAuthMethod" text, "applicationType" text, "jwks" text, "jwksUri" text, "grantTypes" text, "responseTypes" text, "requirePKCE" integer, "dpopBoundAccessTokens" integer, "referenceId" text, "metadata" text);
   create table "oauthResource" ("id" text not null primary key, "identifier" text not null unique, "name" text not null, "accessTokenTtl" integer, "refreshTokenTtl" integer, "signingAlgorithm" text, "signingKeyId" text, "allowedScopes" text, "customClaims" text, "dpopBoundAccessTokensRequired" integer, "disabled" integer, "createdAt" date, "updatedAt" date, "policyVersion" integer, "metadata" text);
   create table "oauthClientResource" ("id" text not null primary key, "clientId" text not null references "oauthClient" ("clientId") on delete cascade, "resourceId" text not null references "oauthResource" ("identifier") on delete cascade, "metadata" text, "createdAt" date);
   create table "oauthRefreshToken" ("id" text not null primary key, "token" text not null unique, "clientId" text not null references "oauthClient" ("clientId") on delete cascade, "sessionId" text references "session" ("id") on delete set null, "userId" text not null references "user" ("id") on delete cascade, "referenceId" text, "authorizationCodeId" text, "resources" text, "requestedUserInfoClaims" text, "expiresAt" date not null, "createdAt" date not null, "revoked" date, "rotatedAt" date, "rotationReplayResponse" text, "rotationReplayExpiresAt" date, "authTime" date, "confirmation" text, "scopes" text not null);
   create table "oauthAccessToken" ("id" text not null primary key, "token" text not null unique, "clientId" text not null references "oauthClient" ("clientId") on delete cascade, "sessionId" text references "session" ("id") on delete set null, "userId" text references "user" ("id") on delete cascade, "referenceId" text, "authorizationCodeId" text, "resources" text, "requestedUserInfoClaims" text, "refreshId" text references "oauthRefreshToken" ("id") on delete cascade, "expiresAt" date not null, "createdAt" date not null, "revoked" date, "confirmation" text, "scopes" text not null);
   create table "oauthConsent" ("id" text not null primary key, "clientId" text not null references "oauthClient" ("clientId") on delete cascade, "userId" text references "user" ("id") on delete cascade, "referenceId" text, "resources" text, "requestedUserInfoClaims" text, "scopes" text not null, "createdAt" date not null, "updatedAt" date not null);
   create table "oauthClientAssertion" ("id" text not null primary key, "expiresAt" date not null);
   create index "session_userId_idx" on "session" ("userId");
   create index "account_userId_idx" on "account" ("userId");
   create index "verification_identifier_idx" on "verification" ("identifier");
   create index "oauthClient_userId_idx" on "oauthClient" ("userId");
   create index "oauthClientResource_clientId_idx" on "oauthClientResource" ("clientId");
   create index "oauthClientResource_resourceId_idx" on "oauthClientResource" ("resourceId");
   create index "oauthRefreshToken_clientId_idx" on "oauthRefreshToken" ("clientId");
   create index "oauthRefreshToken_sessionId_idx" on "oauthRefreshToken" ("sessionId");
   create index "oauthRefreshToken_userId_idx" on "oauthRefreshToken" ("userId");
   create index "oauthRefreshToken_authorizationCodeId_idx" on "oauthRefreshToken" ("authorizationCodeId");
   create index "oauthAccessToken_clientId_idx" on "oauthAccessToken" ("clientId");
   create index "oauthAccessToken_sessionId_idx" on "oauthAccessToken" ("sessionId");
   create index "oauthAccessToken_userId_idx" on "oauthAccessToken" ("userId");
   create index "oauthAccessToken_authorizationCodeId_idx" on "oauthAccessToken" ("authorizationCodeId");
   create index "oauthAccessToken_refreshId_idx" on "oauthAccessToken" ("refreshId");
   create index "oauthConsent_clientId_idx" on "oauthConsent" ("clientId");
   create index "oauthConsent_userId_idx" on "oauthConsent" ("userId");
   create unique index "oauthClientResource_clientId_resourceId_uidx" on "oauthClientResource" ("clientId", "resourceId");`,
];

export function openDb(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  migrate(db);
  return db;
}

/** Applies pending migrations; returns the schema version afterwards. */
export function migrate(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let v = row.user_version; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[v] as string);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
  return MIGRATIONS.length;
}

let db: DatabaseSync | undefined;

/** Process-wide connection, opened (and migrated) on first use. */
export function useDb(): DatabaseSync {
  db ??= openDb(useRuntimeConfig().dbPath);
  return db;
}
