export type AccessTokenPayload = {
  sub: string;
  typ: 'access';
  /** refresh_tokens.id — guard rejects if that row is revoked or gone */
  sid: string;
};

export type RefreshTokenPayload = {
  sub: string;
  typ: 'refresh';
};

export type RequestAuthUser = {
  id: string;
};
