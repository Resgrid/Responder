/**
 * A server-sent icon URL (an uploaded type/role icon, or a map marker's status/priority `PinIconUrl`) when it is usable,
 * otherwise null. Only absolute http(s) URLs are accepted: the server sends an absolute, anonymous, immutable image URL,
 * and anything else (blank, relative, another scheme) is treated as "no icon".
 */
export const getTypeIconUrl = (iconUrl?: string | null): string | null => {
  if (typeof iconUrl !== 'string') return null;
  const trimmed = iconUrl.trim();
  return /^https?:\/\/\S+$/i.test(trimmed) ? trimmed : null;
};
