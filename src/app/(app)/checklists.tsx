import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ChecklistCalendar } from '@/components/checklists/checklist-calendar';
import { ChecklistRunSheet } from '@/components/checklists/checklist-run-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useChecklistLiveUpdates } from '@/hooks/use-checklist-live-updates';
import { useProtectedReveal } from '@/hooks/use-protected-reveal';
import { checklistError } from '@/lib/checklists/sync';
import { useChecklistsStore } from '@/stores/checklists/store';

export default function ChecklistsScreen() {
  const { t } = useTranslation();
  const { occurrenceId } = useLocalSearchParams<{ occurrenceId?: string }>();
  const unitId: string | undefined = undefined;
  const state = useChecklistsStore();
  const [page, setPage] = useState(0);
  const [calendar, setCalendar] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    void useChecklistsStore.getState().load(unitId, page);
  }, [unitId, page]);
  useChecklistLiveUpdates(load);
  const reveal = useProtectedReveal(load);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        await useChecklistsStore.getState().load(unitId, page);
        if (!cancelled && occurrenceId && !useChecklistsStore.getState().locked) await useChecklistsStore.getState().openOccurrence(occurrenceId);
      })().catch((e) => setError(checklistError(e)));
      return () => {
        cancelled = true;
        useChecklistsStore.getState().close();
      };
    }, [unitId, page, occurrenceId])
  );
  const action = (work: () => Promise<void>) => {
    setError(null);
    void work().catch((e) => setError(checklistError(e)));
  };
  const message = error ?? state.error;
  return (
    <View className="flex-1 bg-background-0">
      <Stack.Screen options={{ title: t('checklists.labels.Checklists') }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Button variant="outline" onPress={() => setCalendar((v) => !v)}>
          <ButtonText>{t('checklists.ui.calendar')}</ButtonText>
        </Button>
        {calendar ? <ChecklistCalendar /> : null}
        <Text className="text-xl font-bold">{t('checklists.labels.DueChecks')}</Text>
        {message ? <Text accessibilityRole="alert">{t(`checklists.errors.${message}`)}</Text> : null}
        {state.locked && state.access?.IsProtected ? (
          <Button isDisabled={reveal.isRequesting} onPress={() => void reveal.reveal()}>
            <ButtonText>{t('checklists.ui.unlock')}</ButtonText>
          </Button>
        ) : null}
        <Button isDisabled={state.busy} onPress={load}>
          <ButtonText>{t('checklists.ui.refresh')}</ButtonText>
        </Button>
        {state.due ? (
          <Button isDisabled={state.busy} variant="outline" onPress={() => action(() => state.prepareOffline())}>
            <ButtonText>{t('checklists.ui.prepareOffline')}</ButtonText>
          </Button>
        ) : null}
        {state.due?.Occurrences.map((row) => (
          <View key={row.Id} className="rounded border border-outline-200 p-3">
            <Text>{row.Name}</Text>
            <Text>
              {row.Target.Name} · {new Date(row.PeriodStartUtc).toLocaleString()}
            </Text>
            <Button isDisabled={state.busy} onPress={() => action(() => state.openOccurrence(row.Id))}>
              <ButtonText>{t('checklists.labels.OpenCheck')}</ButtonText>
            </Button>
          </View>
        ))}
        {state.due && state.due.Occurrences.length === 0 ? <Text>{t('checklists.labels.NoDueChecks')}</Text> : null}
        <Text className="text-lg font-bold">{t('checklists.labels.StartRun')}</Text>
        {state.due?.Definitions.map((def) => (
          <View key={def.Id} className="rounded border border-outline-200 p-3">
            <Text>{def.PublishedForm.Name}</Text>
            {def.Targets.map((target) => (
              <Button key={`${target.Type}:${target.Id}`} variant="outline" onPress={() => action(() => state.startDefinition(def, target))}>
                <ButtonText>{target.Name}</ButtonText>
              </Button>
            ))}
          </View>
        ))}
        <View className="flex-row justify-between">
          <Button isDisabled={page === 0} variant="outline" onPress={() => setPage((n) => n - 1)}>
            <ButtonText>{t('checklists.labels.Previous')}</ButtonText>
          </Button>
          <Button variant="outline" isDisabled={!state.due?.HasMoreDefinitions && !state.due?.HasMoreOccurrences} onPress={() => setPage((n) => n + 1)}>
            <ButtonText>{t('checklists.labels.Next')}</ButtonText>
          </Button>
        </View>
        <Text className="text-lg font-bold">{t('checklists.ui.localDrafts')}</Text>
        {state.draftIds.map((id, index) => (
          <Button key={id} variant="outline" onPress={() => action(() => state.openDraft(id))}>
            <ButtonText>
              {t('checklists.labels.Draft')} {index + 1}
            </ButtonText>
          </Button>
        ))}
        <Button variant="outline" onPress={() => action(() => state.loadHistory(unitId, historyPage))}>
          <ButtonText>{t('checklists.labels.History')}</ButtonText>
        </Button>
        {state.history.map((row) => (
          <Button key={row.Id} variant="outline" onPress={() => action(() => state.openServer(row.Id))}>
            <ButtonText>
              {row.TargetName} · {new Date(row.UpdatedOn).toLocaleString()}
            </ButtonText>
          </Button>
        ))}
        {historyPage > 0 ? (
          <Button
            variant="outline"
            onPress={() => {
              const previous = historyPage - 1;
              setHistoryPage(previous);
              action(() => state.loadHistory(unitId, previous));
            }}
          >
            <ButtonText>{t('checklists.labels.Previous')}</ButtonText>
          </Button>
        ) : null}
        {state.hasMoreHistory ? (
          <Button
            onPress={() => {
              const next = historyPage + 1;
              setHistoryPage(next);
              action(() => state.loadHistory(unitId, next));
            }}
          >
            <ButtonText>{t('checklists.labels.Next')}</ButtonText>
          </Button>
        ) : null}
      </ScrollView>
      {state.active ? <ChecklistRunSheet key={state.active.id} /> : null}
    </View>
  );
}
