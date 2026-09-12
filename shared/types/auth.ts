/** What /api/auth/get-session returns for a signed-in browser. */
export interface SessionInfo {
  user: SessionUser;
  session: { id: string; expiresAt: string };
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
}

/** A row of /api/auth/admin/list-users. */
export interface AdminUser extends SessionUser {
  banned?: boolean | null;
  createdAt: string;
}

/** A row of /api/auth/oauth2/get-clients (secret never included). */
export interface OAuthClientRow {
  client_id: string;
  client_name?: string | null;
  redirect_uris: string[];
  client_id_issued_at?: number | null;
  disabled?: boolean | null;
}
