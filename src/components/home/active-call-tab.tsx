import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { findNamedEntityName, findResolvedCheckInTargetName } from '@/components/check-in/check-in-target';
import { CheckInTimerCard } from '@/components/check-in/check-in-timer-card';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type CheckInTimerStatusResultData } from '@/models/v4/checkIn/checkInTimerStatusResultData';
import { type ResolvedCheckInTimerResultData } from '@/models/v4/checkIn/resolvedCheckInTimerResultData';
import { useActiveCallStore } from '@/stores/calls/active-call-store';
import { useCheckInStore } from '@/stores/calls/check-in-store';
import { useDispatchStore } from '@/stores/dispatch/store';
import { useHomeStore } from '@/stores/home/home-store';
import { useRolesStore } from '@/stores/roles/store';
import { useToastStore } from '@/stores/toast/store';
import { useUnitsStore } from '@/stores/units/store';

export const ActiveCallTab: React.FC = () => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { activeCall, clearActiveCall } = useActiveCallStore();
  const showToast = useToastStore((state) => state.showToast);
  const currentUser = useHomeStore((state) => state.currentUser);
  const dispatchUnits = useDispatchStore((state) => state.data.units);
  const fetchDispatchData = useDispatchStore((state) => state.fetchDispatchData);
  const units = useUnitsStore((state) => state.units);
  const fetchUnits = useUnitsStore((state) => state.fetchUnits);
  const users = useRolesStore((state) => state.users);
  const { timerStatuses, resolvedTimers, isCheckingIn, fetchTimerStatuses, fetchResolvedTimers, performCheckIn: storePerformCheckIn, startPolling, stopPolling } = useCheckInStore();

  useEffect(() => {
    if (activeCall) {
      const callId = parseInt(activeCall.CallId, 10);
      fetchTimerStatuses(callId);
      fetchResolvedTimers(callId);
      startPolling(callId);
    }
    return () => {
      stopPolling();
    };
  }, [activeCall, fetchResolvedTimers, fetchTimerStatuses, startPolling, stopPolling]);

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

  const handleViewDetails = useCallback(() => {
    if (activeCall) {
      router.push(`/call/${activeCall.CallId}`);
    }
  }, [activeCall]);

  const handleClearActive = useCallback(() => {
    clearActiveCall();
  }, [clearActiveCall]);

  const handleCheckIn = useCallback(
    async (targetType: number, unitId?: number) => {
      if (!activeCall) return;
      const success = await storePerformCheckIn({
        CallId: parseInt(activeCall.CallId, 10),
        CheckInType: targetType,
        UnitId: unitId,
      });
      if (success) {
        showToast('success', t('check_in.check_in_success'));
      } else {
        showToast('warning', t('check_in.offline_queued'));
      }
    },
    [activeCall, storePerformCheckIn, showToast, t]
  );

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

  if (!activeCall) {
    return (
      <Box className="items-center py-8">
        <Text className="text-gray-500">{t('home.active_call.no_active_call')}</Text>
      </Box>
    );
  }

  const bgColor = colorScheme === 'dark' ? 'bg-neutral-800' : 'bg-white';

  const renderTimerItem = (status: CheckInTimerStatusResultData) => (
    <CheckInTimerCard key={`${status.TargetEntityId}-${status.TargetType}`} status={status} resolvedTargetName={getResolvedTargetName(status)} onCheckIn={handleCheckIn} isCurrentUser={true} />
  );

  return (
    <VStack space="md" className="py-2">
      {/* Call summary */}
      <Box className={`rounded-xl p-4 shadow-sm ${bgColor}`}>
        <VStack space="xs">
          <HStack className="items-center justify-between">
            <Heading size="sm">
              {activeCall.Name} (#{activeCall.Number})
            </Heading>
          </HStack>
          {activeCall.Address ? <Text className="text-sm text-gray-500">{activeCall.Address}</Text> : null}
        </VStack>
      </Box>

      {/* Timer cards */}
      {activeCall.CheckInTimersEnabled && timerStatuses.length > 0 ? <VStack>{timerStatuses.map(renderTimerItem)}</VStack> : null}

      {/* Action buttons */}
      <HStack space="md">
        <Button className="flex-1" variant="outline" onPress={handleViewDetails} testID="view-call-details-button">
          <ButtonText>{t('home.active_call.view_details')}</ButtonText>
        </Button>
        <Button className="flex-1" variant="outline" action="negative" onPress={handleClearActive} testID="clear-active-call-button">
          <ButtonText>{t('home.active_call.clear_active')}</ButtonText>
        </Button>
      </HStack>
    </VStack>
  );
};
