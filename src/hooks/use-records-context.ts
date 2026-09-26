import { useMemo } from 'react';

import { type FieldRecordContextInput } from '@/models/v4/records';
import { useActiveCallStore } from '@/stores/calls/active-call-store';

/**
 * The field context this app authors in (RMS plan RMS-1D). Responder authors for the member, plus the
 * Call they are currently working when there is one. The values are identifiers only: the server
 * verifies every one of them and narrows the catalog itself, so a stale or wrong context here can
 * only produce a smaller catalog, never a wider one.
 */
export const useRecordsContext = (): FieldRecordContextInput => {
  const activeCallId = useActiveCallStore((state) => state.activeCallId);

  return useMemo(() => {
    const callId = activeCallId ? Number.parseInt(activeCallId, 10) : Number.NaN;
    return Number.isFinite(callId) && callId > 0 ? { CallId: callId } : {};
  }, [activeCallId]);
};
