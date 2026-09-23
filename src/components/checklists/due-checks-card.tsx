import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { getDueChecklists } from '@/api/checklists/checklists';
import { Button, ButtonText } from '@/components/ui/button';
import { useChecklistLiveUpdates } from '@/hooks/use-checklist-live-updates';
import useAuthStore from '@/stores/auth/store';
import { dataProtectionStore } from '@/stores/data-protection/store';
import { useIsChecklistsEnabled } from '@/stores/feature-flags/store';
import { securityStore } from '@/stores/security/store';

export const DueChecksCard: React.FC = () => {
  const enabled = useIsChecklistsEnabled();
  const { t } = useTranslation();
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [epoch, setEpoch] = useState(0);
  useChecklistLiveUpdates(() => setEpoch((e) => e + 1));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const conceal = () => {
      setCount(null);
      setEpoch((e) => e + 1);
    };
    const protection = dataProtectionStore.subscribe((state) => {
      if (timer) clearTimeout(timer);
      conceal();
      if (state.stepUpExpiresAt) timer = setTimeout(conceal, Math.max(0, state.stepUpExpiresAt - Date.now()));
    });
    const auth = useAuthStore.subscribe((state, previous) => {
      if (state.userId !== previous.userId) conceal();
    });
    const department = securityStore.subscribe((state, previous) => {
      if (state.rights?.DepartmentId !== previous.rights?.DepartmentId) conceal();
    });
    const background = AppState.addEventListener('change', (state) => {
      if (state !== 'active') conceal();
    });
    return () => {
      protection();
      auth();
      department();
      background.remove();
      if (timer) clearTimeout(timer);
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const grant = dataProtectionStore.getState().grantToken;
      if (AppState.currentState !== 'active') return;

      if (enabled)
        void getDueChecklists(0)
          .then((page) => {
            if (active && AppState.currentState === 'active' && (!grant || dataProtectionStore.getState().isStepUpActive())) setCount(page.Occurrences.length);
          })
          .catch(() => {
            if (active) setCount(null);
          });
      return () => {
        active = false;
        setCount(null);
      };
      // The epoch restarts this focus request after a grant or identity change.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, epoch])
  );
  if (!enabled) return null;
  return (
    <Button variant="outline" onPress={() => router.push('/checklists')} testID="home-due-checks">
      <ButtonText>
        {t('checklists.labels.DueChecks')}
        {count != null ? ` (${count}${count === 50 ? '+' : ''})` : ''}
      </ButtonText>
    </Button>
  );
};
