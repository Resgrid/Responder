import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

import { Env } from '@/lib/env';
import { HUB_CONNECTED_EVENT, signalRService } from '@/services/signalr.service';
import useAuthStore from '@/stores/auth/store';
import { checklistScope, useChecklistsStore } from '@/stores/checklists/store';
import { dataProtectionStore } from '@/stores/data-protection/store';
import { securityStore } from '@/stores/security/store';

// SignalR carries only an invalidation hint. Each consumer refetches through its normal
// scoped API/ADP boundary. No event payload is retained, logged, or treated as report data.
export const useChecklistLiveUpdates = (refresh: () => void) => {
  const callback = useRef(refresh);
  callback.current = refresh;
  const user = useAuthStore((s) => s.userId);
  const department = securityStore((s) => s.rights?.DepartmentId);
  useFocusEffect(
    useCallback(() => {
      const scope = user && department ? checklistScope() : null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let pending = false;
      const flush = () => {
        timer = null;
        const state = useChecklistsStore.getState();
        if (!pending || !scope || scope !== checklistScope() || AppState.currentState !== 'active' || state.busy || state.active || (state.access?.IsProtected && !dataProtectionStore.getState().isStepUpActive())) return;
        pending = false;
        callback.current();
      };
      const changed = () => {
        pending = true;
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, 500);
      };
      const connected = (event: unknown) => {
        if ((event as { hubName?: string } | null)?.hubName === Env.CHANNEL_HUB_NAME) changed();
      };
      signalRService.on('checklistUpdated', changed);
      signalRService.on(HUB_CONNECTED_EVENT, connected);
      const app = AppState.addEventListener('change', (value) => {
        if (value === 'active') changed();
      });
      const state = useChecklistsStore.subscribe(() => {
        if (pending && !timer) changed();
      });
      return () => {
        signalRService.off('checklistUpdated', changed);
        signalRService.off(HUB_CONNECTED_EVENT, connected);
        app.remove();
        state();
        if (timer) clearTimeout(timer);
      };
    }, [user, department])
  );
};
