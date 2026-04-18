import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type PerformCheckInInput } from '@/api/calls/check-in-timers';
import { CheckInBottomSheet } from '@/components/check-in/check-in-bottom-sheet';
import { CheckInHistoryList } from '@/components/check-in/check-in-history-list';
import { findNamedEntityName, findResolvedCheckInTargetName } from '@/components/check-in/check-in-target';
import { CheckInTimerCard } from '@/components/check-in/check-in-timer-card';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type CheckInTimerStatusResultData } from '@/models/v4/checkIn/checkInTimerStatusResultData';
import { type ResolvedCheckInTimerResultData } from '@/models/v4/checkIn/resolvedCheckInTimerResultData';
import { useCheckInStore } from '@/stores/calls/check-in-store';
import { useDispatchStore } from '@/stores/dispatch/store';
import { useHomeStore } from '@/stores/home/home-store';
import { useRolesStore } from '@/stores/roles/store';
import { useToastStore } from '@/stores/toast/store';
import { useUnitsStore } from '@/stores/units/store';

interface CheckInTabPanelProps {
  callId: number;
  checkInTimersEnabled: boolean;
}

const PERSONNEL_CHECK_IN_TYPE = 0;

export const CheckInTabPanel: React.FC<CheckInTabPanelProps> = ({ callId, checkInTimersEnabled }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const showToast = useToastStore((state) => state.showToast);
  const currentUser = useHomeStore((state) => state.currentUser);
  const dispatchUnits = useDispatchStore((state) => state.data.units);
  const fetchDispatchData = useDispatchStore((state) => state.fetchDispatchData);
  const units = useUnitsStore((state) => state.units);
  const fetchUnits = useUnitsStore((state) => state.fetchUnits);
  const users = useRolesStore((state) => state.users);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [selectedCheckInType, setSelectedCheckInType] = useState(0);
  const [selectedUnitId, setSelectedUnitId] = useState<number | undefined>(undefined);
  const [selectedTargetName, setSelectedTargetName] = useState<string | undefined>(undefined);

  const {
    timerStatuses,
    resolvedTimers,
    checkInHistory,
    isLoadingStatuses,
    isLoadingHistory,
    isCheckingIn,
    fetchTimerStatuses,
    fetchResolvedTimers,
    fetchCheckInHistory,
    performCheckIn: storePerformCheckIn,
    startPolling,
    stopPolling,
  } = useCheckInStore();

  useEffect(() => {
    if (checkInTimersEnabled) {
      fetchTimerStatuses(callId);
      fetchResolvedTimers(callId);
      startPolling(callId);
    }
    return () => {
      stopPolling();
    };
  }, [callId, checkInTimersEnabled, fetchResolvedTimers, fetchTimerStatuses, startPolling, stopPolling]);

  useEffect(() => {
    if (dispatchUnits.length === 0) {
      fetchDispatchData();
    }
  }, [dispatchUnits.length, fetchDispatchData]);

  useEffect(() => {
    if (units.length === 0) {
      void fetchUnits();
    }
  }, [units.length, fetchUnits]);

  const handleQuickCheckIn = useCallback(() => {
    setSelectedCheckInType(0);
    setSelectedUnitId(undefined);
    setSelectedTargetName(undefined);
    setIsBottomSheetOpen(true);
  }, []);

  const handleCheckIn = useCallback((targetType: number, unitId?: number, targetName?: string) => {
    setSelectedCheckInType(targetType);
    setSelectedUnitId(unitId);
    setSelectedTargetName(targetName);
    setIsBottomSheetOpen(true);
  }, []);

  const handleSubmitCheckIn = useCallback(
    async (input: PerformCheckInInput) => {
      const success = await storePerformCheckIn(input);
      if (success) {
        showToast('success', t('check_in.check_in_success'));
      } else {
        showToast('warning', t('check_in.offline_queued'));
      }
    },
    [storePerformCheckIn, showToast, t]
  );

  const handleToggleHistory = useCallback(() => {
    if (!isHistoryExpanded) {
      fetchCheckInHistory(callId);
    }
    setIsHistoryExpanded((prev) => !prev);
  }, [isHistoryExpanded, fetchCheckInHistory, callId]);

  const getResolvedTargetName = useCallback(
    (status: CheckInTimerStatusResultData): string | undefined => {
      const resolvedName = findResolvedCheckInTargetName(status, resolvedTimers as ResolvedCheckInTimerResultData[]);
      if (resolvedName) {
        return resolvedName;
      }

      const unitName = findNamedEntityName(status, [
        ...dispatchUnits.map((unit) => ({
          id: unit.Id,
          name: unit.Name,
        })),
        ...units.map((unit) => ({
          id: unit.UnitId,
          name: unit.Name,
        })),
      ]);
      if (unitName) {
        return unitName;
      }

      const personnelName = findNamedEntityName(status, [
        ...users.map((user) => ({
          id: user.UserId,
          name: `${user.FirstName} ${user.LastName}`.trim(),
        })),
        ...(currentUser
          ? [
              {
                id: currentUser.UserId,
                name: `${currentUser.FirstName} ${currentUser.LastName}`.trim(),
              },
            ]
          : []),
      ]);
      if (personnelName) {
        return personnelName;
      }

      if (status.TargetType === 0 && currentUser) {
        return `${currentUser.FirstName} ${currentUser.LastName}`.trim();
      }

      return undefined;
    },
    [currentUser, dispatchUnits, resolvedTimers, units, users]
  );

  const canQuickCheckIn = timerStatuses.some((status) => status.TargetType === PERSONNEL_CHECK_IN_TYPE) || resolvedTimers.some((timer) => timer.TargetType === PERSONNEL_CHECK_IN_TYPE);

  const renderTimerItem = useCallback(
    (status: CheckInTimerStatusResultData) => (
      <CheckInTimerCard key={`${status.TargetEntityId}-${status.TargetType}`} status={status} resolvedTargetName={getResolvedTargetName(status)} onCheckIn={handleCheckIn} isCurrentUser={true} />
    ),
    [getResolvedTargetName, handleCheckIn]
  );

  if (!checkInTimersEnabled) {
    return (
      <Box className="items-center p-6">
        <Text className="text-gray-500">{t('check_in.timers_disabled')}</Text>
      </Box>
    );
  }

  return (
    <VStack space="md" className="p-4">
      {canQuickCheckIn ? (
        <Button size="lg" onPress={handleQuickCheckIn} testID="quick-check-in-button">
          <ButtonText>{t('check_in.quick_check_in')}</ButtonText>
        </Button>
      ) : null}

      {/* Active Timers */}
      {isLoadingStatuses ? (
        <Box className="items-center py-4">
          <Text className="text-sm text-gray-500">{t('common.loading')}</Text>
        </Box>
      ) : timerStatuses.length > 0 ? (
        <VStack>{timerStatuses.map(renderTimerItem)}</VStack>
      ) : (
        <Box className="items-center py-4">
          <Text className="text-sm text-gray-500">{t('check_in.no_timers')}</Text>
        </Box>
      )}

      {/* History section */}
      <Pressable onPress={handleToggleHistory}>
        <Heading size="sm" className={`py-2 ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {t('check_in.history')} {isHistoryExpanded ? '▲' : '▼'}
        </Heading>
      </Pressable>

      {isHistoryExpanded ? <CheckInHistoryList history={checkInHistory} isLoading={isLoadingHistory} /> : null}

      {/* Check-In Bottom Sheet */}
      <CheckInBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        callId={callId}
        onSubmit={handleSubmitCheckIn}
        isLoading={isCheckingIn}
        defaultCheckInType={selectedCheckInType}
        defaultUnitId={selectedUnitId}
        targetName={selectedTargetName}
      />
    </VStack>
  );
};
