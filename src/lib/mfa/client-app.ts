import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Which Resgrid app this build is (passkey plan section 10.4). The server binds sign-in transactions, passkeys, brokered
 * SSO and recovery to it, so every call that starts or finishes one of those sends it.
 */
export const RESGRID_CLIENT = 'responder';

/** The scheme the server's return-target registry lists for this app's brokered SSO (`resgrid://sso-return`). */
export const SSO_RETURN_SCHEME = 'resgrid';

export const CLIENT_HEADER = 'X-Resgrid-Client';
export const SHARED_INSTALLATION_HEADER = 'X-Resgrid-Shared-Installation';
export const OPERATOR_ACTIVITY_HEADER = 'X-Resgrid-Operator-Activity';

const MAX_HEADER_LENGTH = 64;

/** A header value the platform HTTP stack will send: printable ASCII only, trimmed and bounded. */
export const headerSafe = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const ascii = value
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')
    .trim();
  return ascii.length === 0 ? null : ascii.slice(0, MAX_HEADER_LENGTH).trim();
};

/**
 * The app and installation headers for requests that create or bind a session: the app, and labels for the member's own
 * session list. Labels are display text only; nothing trusts them.
 */
export const clientHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { [CLIENT_HEADER]: RESGRID_CLIENT };
  const labels: Record<string, string | null> = {
    'X-Resgrid-Device-Name': headerSafe(Device.deviceName ?? Device.modelName),
    'X-Resgrid-Device-Type': headerSafe(Device.modelName),
    'X-Resgrid-Operating-System': headerSafe(`${Platform.OS} ${Device.osVersion ?? ''}`),
    'X-Resgrid-App-Version': headerSafe(Application.nativeApplicationVersion),
  };
  for (const [name, value] of Object.entries(labels)) {
    if (value) {
      headers[name] = value;
    }
  }
  return headers;
};

/**
 * Whether the provider's sign-in should run in a browser session that keeps no cookies. Responder is a personal app, so
 * it keeps the member's provider session like any other browser sign-in.
 */
export const ephemeralBrowser = (): boolean => false;

type HeaderBag = { set?: (name: string, value: string) => unknown } | Record<string, unknown>;

/** Adds the app and installation headers to a request's headers (Axios headers or a plain object). */
export const applyClientHeaders = <T extends HeaderBag>(headers: T): T => {
  for (const [name, value] of Object.entries(clientHeaders())) {
    const set = (headers as { set?: unknown }).set;
    if (typeof set === 'function') {
      set.call(headers, name, value);
    } else {
      (headers as Record<string, unknown>)[name] = value;
    }
  }
  return headers;
};
