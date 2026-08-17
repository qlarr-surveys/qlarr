/** Raw JWT claim shape as minted by the token service. */
export interface JwtPayload {
  sub: string; // user email
  user_id: string;
  authorities: string[]; // lowercased role names
  session_id?: string; // session UUID (absent on some tokens)
  reset_password?: boolean; // present only on password-reset tokens
  iat?: number;
  exp?: number;
}

/** Decoded principal attached to the request. */
export interface CurrentUserPrincipal {
  userId: string;
  email: string;
  authorities: string[];
  sessionId?: string;
}
