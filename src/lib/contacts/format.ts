import { Platform } from 'react-native';

import { type ContactResultData } from '@/models/v4/contacts/contactResultData';

// Pure presentation helpers for a contact (the shared detail sheet in every field app). Nothing here decides
// what a person may see: withheld values arrive redacted from the server and are shown as such by the sheet.

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };

/** Removes every match, repeating until none is left, so a removal cannot splice a new match together ("<scr<script></script>ipt>"). */
const removeAll = (value: string, pattern: RegExp): string => {
  let previous: string;
  let current = value;
  do {
    previous = current;
    current = current.replace(pattern, '');
  } while (current !== previous);
  return current;
};

/** Rich text from the web editor as plain readable text: line breaks kept, markup and scripts dropped. */
export const htmlToText = (html: string | null | undefined): string => {
  if (!html) return '';
  const blocks = removeAll(html, /<(script|style)\b[^>]*>[\s\S]*?<\/\1[^>]*>/gi)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ');
  // Markup is gone at this point; a literal "<" in editor text arrives as &lt;, so any raw one left is a torn tag.
  return removeAll(blocks, /<[^>]*>/g)
    .replace(/</g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * A file name the device can write. A contact file's name is the uploader's choice, so path separators, ".."
 * and anything outside a plain file-name alphabet are replaced; an empty result falls back to `fallback`.
 */
export const safeFileName = (name: string | null | undefined, fallback: string): string => {
  const cleaned = (name ?? '')
    .replace(/[^A-Za-z0-9._ -]/g, '_')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 120);
  return cleaned || fallback;
};

/** "lat,lng" (or "lat lng") as numbers, when it parses. */
export const parseCoordinates = (value: string | null | undefined): { latitude: number; longitude: number } | null => {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value ?? '');
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
};

/** The platform maps app for an address or a coordinate pair, with a web map as the fallback. */
export const mapsUrls = (query: string) => {
  const coordinates = parseCoordinates(query);
  const encoded = encodeURIComponent(coordinates ? `${coordinates.latitude},${coordinates.longitude}` : query);
  const web = `https://maps.google.com/?q=${encoded}`;
  const app = Platform.select({
    ios: coordinates ? `maps:?ll=${coordinates.latitude},${coordinates.longitude}&q=${encoded}` : `maps:0,0?q=${encoded}`,
    android: coordinates ? `geo:${coordinates.latitude},${coordinates.longitude}?q=${encoded}` : `geo:0,0?q=${encoded}`,
    default: web,
  });
  return { app, web };
};

const REDACTED = 'REDACTED';

/**
 * The contact with every withheld value removed, plus the names of the fields that were withheld. The detail
 * sheet then never shows the wire sentinel as data or dials "tel:REDACTED"; it says what is protected and
 * offers the reveal instead. The server's RedactedFields list marks catalog fields; the sentinel is the fallback.
 */
export const withoutRedacted = <T extends ContactResultData>(contact: T): T & { WithheldFields: string[] } => {
  const withheld: string[] = [];
  const copy = { ...contact } as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(contact)) {
    if (value === REDACTED) {
      copy[key] = undefined;
      withheld.push(key);
    }
  }
  return { ...(copy as T), WithheldFields: withheld };
};
