import { parseDateISOString } from '@/lib/utils';

/**
 * True when a message's `ExpiredOn` timestamp is in the past.
 *
 * `ExpiredOn` comes back from the API without a timezone offset and sometimes
 * space-separated, which `new Date()` parses shifted by the device's UTC offset — or as
 * `Invalid Date` on Hermes — making messages read as expired hours early or late.
 * `parseDateISOString` is the same timezone-safe parser the message date display uses.
 */
export function isMessageExpired(expiredOn: string | null | undefined): boolean {
  if (!expiredOn) {
    return false;
  }

  try {
    const expiresAt = parseDateISOString(expiredOn);
    if (Number.isNaN(expiresAt.getTime())) {
      return false;
    }
    return expiresAt.getTime() < Date.now();
  } catch {
    // Unparseable timestamps must not silently expire a message.
    return false;
  }
}
