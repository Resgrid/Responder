/** Which server a sign-in goes to, as the login form labels it. */
export type LoginServerKind = 'us_west' | 'eu_central' | 'custom';

export interface LoginServer {
  kind: LoginServerKind;
  /** The server's host name, shown beside "Custom" so a self-hosted or test server is recognizable. */
  host: string;
}

// The Resgrid hosted sites, by their base URL (no /api/vX suffix).
const HOSTED_SERVERS: readonly { apiUrl: string; kind: Exclude<LoginServerKind, 'custom'> }[] = [
  { apiUrl: 'https://api.resgrid.com', kind: 'us_west' },
  { apiUrl: 'https://api-eu-central.resgrid.com', kind: 'eu_central' },
];

// Reduce a URL to its bare base (no trailing slashes, no /api/vX suffix) so stored and hosted URLs compare equal;
// host names are case-insensitive, so compare them the same way.
const toComparableUrl = (url: string) =>
  url
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/v\d+$/i, '')
    .toLowerCase();

// RN's URL polyfill does not implement hostname, so the host is read from the address directly.
const hostOf = (url: string) => /^[a-z][a-z\d+.-]*:\/\/([^/?#]+)/i.exec(url.trim())?.[1]?.toLowerCase() ?? url.trim();

/** Names the server behind an API URL (with or without the /api/vX suffix): a Resgrid hosted site, or a custom one. */
export const describeLoginServer = (apiUrl: string): LoginServer => {
  const comparable = toComparableUrl(apiUrl);
  const hosted = HOSTED_SERVERS.find((server) => toComparableUrl(server.apiUrl) === comparable);
  return { kind: hosted?.kind ?? 'custom', host: hostOf(apiUrl) };
};
