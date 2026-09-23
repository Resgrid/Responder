import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { api } from '@/api/common/client';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useChecklistLiveUpdates } from '@/hooks/use-checklist-live-updates';
import { checklistError } from '@/lib/checklists/sync';
import { checklistScope, useChecklistsStore } from '@/stores/checklists/store';
import { dataProtectionStore } from '@/stores/data-protection/store';

interface Entry {
  CalendarItemId: string;
  Title: string;
  StartUtc: string;
  SourceId?: string;
  IsVirtual?: boolean;
  IsRedacted?: boolean;
}
export const ChecklistCalendar: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [liveRevision, setLiveRevision] = useState(0);
  useChecklistLiveUpdates(() => setLiveRevision((r) => r + 1));
  const locked = useChecklistsStore((s) => s.locked);
  const scope = useChecklistsStore((s) => s.scope);
  useEffect(() => {
    let cancelled = false;
    setEntries([]);
    setError(null);
    if (locked || !scope) return;
    const start = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`;
    const end = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()}`;
    void api
      .get<{ Data: Entry[] }>('/Calendar/GetDepartmentCalendarItemsInRange', { params: { start, end, includeChecklists: true } })
      .then((response) => {
        const state = useChecklistsStore.getState();
        if (!cancelled && scope === checklistScope() && !state.locked && (!state.access?.IsProtected || dataProtectionStore.getState().isStepUpActive())) setEntries(response.data.Data.filter((e) => e.IsVirtual));
      })
      .catch((e) => {
        if (!cancelled) setError(checklistError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [month, locked, scope, liveRevision]);
  if (locked) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
      <View className="flex-row justify-between">
        <Button variant="outline" onPress={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
          <ButtonText>{t('checklists.labels.Previous')}</ButtonText>
        </Button>
        <Button variant="outline" onPress={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
          <ButtonText>{t('checklists.labels.Next')}</ButtonText>
        </Button>
      </View>
      {error ? <Text>{t(`checklists.errors.${error}`)}</Text> : null}
      {entries.map((entry) => (
        <Button key={entry.CalendarItemId} variant="outline" onPress={() => router.push({ pathname: '/checklists', params: { occurrenceId: entry.SourceId } })}>
          <ButtonText>
            {entry.IsRedacted ? t('checklists.ui.unlock') : entry.Title} · {new Date(entry.StartUtc).toLocaleDateString()}
          </ButtonText>
        </Button>
      ))}
    </View>
  );
};
