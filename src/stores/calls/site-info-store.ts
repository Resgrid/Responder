import { create } from 'zustand';

import { getCallSiteInfo } from '@/api/calls/callSiteInfo';
import { logger } from '@/lib/logging';
import { type CallSiteInfoData } from '@/models/v4/calls/callSiteInfoResult';

interface SiteInfoState {
  callId: string | null;
  siteInfo: CallSiteInfoData | null;
  isLoading: boolean;
  error: string | null;

  fetchSiteInfo: (callId: string) => Promise<void>;
  reset: () => void;
}

// Only the newest request may write. The tab re-fetches the same call when the grant changes, so a
// response for an older request (revealed before a grant loss, redacted before an unlock) is dropped.
let latestRequest = 0;

/**
 * Site Info tab state (Contacts plan Phase A): the pre-plans, hazards, alert notes and files of the
 * contacts linked to the call being viewed. One call at a time; the tab re-fetches after a step-up so
 * REDACTED values are replaced by the revealed ones.
 */
export const useSiteInfoStore = create<SiteInfoState>((set) => ({
  callId: null,
  siteInfo: null,
  isLoading: false,
  error: null,

  fetchSiteInfo: async (callId: string) => {
    const request = ++latestRequest;
    set({ isLoading: true, error: null, callId });
    try {
      const result = await getCallSiteInfo(callId);
      if (request !== latestRequest) {
        return; // stale response — a newer request (another call, or the same call under a new grant) owns the tab
      }
      set({ siteInfo: result.Data ?? null, isLoading: false });
    } catch (error) {
      if (request !== latestRequest) {
        return;
      }
      logger.error({
        message: 'Failed to fetch call site info',
        context: { error, callId },
      });
      set({
        siteInfo: null,
        error: error instanceof Error ? error.message : 'Failed to fetch call site info',
        isLoading: false,
      });
    }
  },

  reset: () => {
    latestRequest += 1;
    set({ callId: null, siteInfo: null, isLoading: false, error: null });
  },
}));
