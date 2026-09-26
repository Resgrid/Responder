import { create } from 'zustand';

import { getContactFiles } from '@/api/contacts/contactFiles';
import { getContactPreplan } from '@/api/contacts/contactPreplans';
import { logger } from '@/lib/logging';
import { type ContactFileResultData } from '@/models/v4/contactFiles/contactFilesResult';
import { type ContactPreplanData } from '@/models/v4/contacts/contactPreplanResult';

interface ContactPreplanState {
  /** Pre-plan per contact; an explicit null means "fetched, the contact has none". */
  preplans: Record<string, ContactPreplanData | null>;
  files: Record<string, ContactFileResultData[]>;
  loadingPreplan: Record<string, boolean>;
  loadingFiles: Record<string, boolean>;
  error: string | null;

  fetchPreplan: (contactId: string, force?: boolean) => Promise<void>;
  fetchFiles: (contactId: string, force?: boolean) => Promise<void>;
  invalidate: (contactId: string) => void;
  reset: () => void;
}

// Only the newest request per contact may write. A forced re-fetch after a grant change races the one
// before it, and the older answer (revealed before a grant loss, redacted before an unlock) must lose.
let requestCounter = 0;
const latestPreplanRequest = new Map<string, number>();
const latestFilesRequest = new Map<string, number>();

/**
 * Pre-plan and site-file cache for the contact details sheet (Contacts plan Phase A). Cached per contact
 * for the life of the sheet; `force` re-fetches after a step-up so REDACTED values are replaced.
 */
export const useContactPreplanStore = create<ContactPreplanState>((set, get) => ({
  preplans: {},
  files: {},
  loadingPreplan: {},
  loadingFiles: {},
  error: null,

  fetchPreplan: async (contactId: string, force = false) => {
    if (!contactId) return;
    if (!force && Object.prototype.hasOwnProperty.call(get().preplans, contactId)) return;

    const request = ++requestCounter;
    latestPreplanRequest.set(contactId, request);
    set((state) => ({ loadingPreplan: { ...state.loadingPreplan, [contactId]: true }, error: null }));
    try {
      const result = await getContactPreplan(contactId);
      if (latestPreplanRequest.get(contactId) !== request) return;
      set((state) => ({
        preplans: { ...state.preplans, [contactId]: result.Data ?? null },
        loadingPreplan: { ...state.loadingPreplan, [contactId]: false },
      }));
    } catch (error) {
      if (latestPreplanRequest.get(contactId) !== request) return;
      logger.error({ message: 'Failed to fetch contact pre-plan', context: { error, contactId } });
      set((state) => ({
        loadingPreplan: { ...state.loadingPreplan, [contactId]: false },
        error: error instanceof Error ? error.message : 'Failed to fetch contact pre-plan',
      }));
    }
  },

  fetchFiles: async (contactId: string, force = false) => {
    if (!contactId) return;
    if (!force && Object.prototype.hasOwnProperty.call(get().files, contactId)) return;

    const request = ++requestCounter;
    latestFilesRequest.set(contactId, request);
    set((state) => ({ loadingFiles: { ...state.loadingFiles, [contactId]: true }, error: null }));
    try {
      const result = await getContactFiles(contactId, false);
      if (latestFilesRequest.get(contactId) !== request) return;
      set((state) => ({
        files: { ...state.files, [contactId]: result.Data ?? [] },
        loadingFiles: { ...state.loadingFiles, [contactId]: false },
      }));
    } catch (error) {
      if (latestFilesRequest.get(contactId) !== request) return;
      logger.error({ message: 'Failed to fetch contact files', context: { error, contactId } });
      set((state) => ({
        loadingFiles: { ...state.loadingFiles, [contactId]: false },
        error: error instanceof Error ? error.message : 'Failed to fetch contact files',
      }));
    }
  },

  invalidate: (contactId: string) => {
    // A request still in flight belongs to the data being discarded.
    latestPreplanRequest.delete(contactId);
    latestFilesRequest.delete(contactId);
    set((state) => {
      const preplans = { ...state.preplans };
      const files = { ...state.files };
      delete preplans[contactId];
      delete files[contactId];
      return { preplans, files, loadingPreplan: { ...state.loadingPreplan, [contactId]: false }, loadingFiles: { ...state.loadingFiles, [contactId]: false } };
    });
  },

  reset: () => {
    latestPreplanRequest.clear();
    latestFilesRequest.clear();
    set({ preplans: {}, files: {}, loadingPreplan: {}, loadingFiles: {}, error: null });
  },
}));
