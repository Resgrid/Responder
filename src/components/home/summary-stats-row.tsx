import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable } from 'react-native';

import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { buildCallAssignmentContext, isCurrentUserOnCall } from '@/lib/call-dispatch';
import { useCoreStore } from '@/stores/app/core-store';
import { useCheckInStore } from '@/stores/calls/check-in-store';
import { useCallsStore } from '@/stores/calls/store';
import { useHomeStore } from '@/stores/home/home-store';
import { useRolesStore } from '@/stores/roles/store';
import { useWeatherAlertsStore } from '@/stores/weather-alerts/weather-alerts-store';

interface SummaryStatItemProps {
  label: string;
  value: number;
  testID: string;
  accentClassName: string;
  valueClassName?: string;
  shouldPulse?: boolean;
  onPress?: () => void;
}

const SummaryStatItem: React.FC<SummaryStatItemProps> = ({ label, value, testID, accentClassName, valueClassName, shouldPulse = false, onPress }) => {
  const glowOpacity = useRef(new Animated.Value(shouldPulse ? 1 : 0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!shouldPulse) {
      glowOpacity.stopAnimation();
      glowScale.stopAnimation();
      glowOpacity.setValue(0);
      glowScale.setValue(1);
      return;
    }

    const glowAnimation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.95,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.25,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowScale, {
            toValue: 1.06,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    glowAnimation.start();

    return () => {
      glowAnimation.stop();
    };
  }, [glowOpacity, glowScale, shouldPulse]);

  return (
    <Pressable onPress={onPress} style={{ flex: 1 }} accessibilityRole={onPress ? 'button' : undefined}>
      <Animated.View
        style={
          shouldPulse
            ? {
                flex: 1,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              }
            : { flex: 1 }
        }
      >
        <Card className={`overflow-hidden rounded-2xl border-0 p-2 shadow-sm ${accentClassName}`} testID={testID}>
          <VStack space="xs" className="items-center">
            <Text className={`text-lg font-bold ${valueClassName ?? 'text-white'}`}>{value}</Text>
            <Text className="text-center text-[8px] font-semibold uppercase tracking-[0.3px] text-white/75" numberOfLines={1}>
              {label}
            </Text>
          </VStack>
        </Card>
      </Animated.View>
    </Pressable>
  );
};

export const SummaryStatsRow: React.FC = () => {
  const { t } = useTranslation();
  const calls = useCallsStore((state) => state.calls);
  const callExtrasById = useCallsStore((state) => state.callExtrasById);
  const departmentStats = useHomeStore((state) => state.departmentStats);
  const currentUser = useHomeStore((state) => state.currentUser);
  const roles = useRolesStore((state) => state.roles);
  const activeUnitId = useCoreStore((state) => state.activeUnitId);
  const timerStatuses = useCheckInStore((state) => state.timerStatuses);
  const globalOverdueCount = useCheckInStore((state) => state.globalOverdueCount);
  const severeAlerts = useWeatherAlertsStore((state) => state.getSevereAlerts());

  const assignmentContext = useMemo(() => buildCallAssignmentContext(currentUser, roles, activeUnitId), [activeUnitId, currentUser, roles]);

  const activeCallsCount = departmentStats.openCalls > 0 ? departmentStats.openCalls : calls.length;
  const callsImOnCount = useMemo(() => calls.filter((call) => isCurrentUserOnCall(callExtrasById[call.CallId], assignmentContext)).length, [assignmentContext, callExtrasById, calls]);
  // Use globalOverdueCount (aggregate across all calls) when available; fall back to the
  // per-call timerStatuses for cases where the active-call tab has already fetched them.
  const pendingMissedCheckinsCount = globalOverdueCount > 0 ? globalOverdueCount : timerStatuses.filter((status) => status.Status === 'Overdue' || status.Status === 'Warning').length;

  return (
    <VStack className="gap-2" testID="summary-stats-row">
      <HStack className="gap-1.5">
        <SummaryStatItem label={t('home.summary.active_calls')} value={activeCallsCount} testID="summary-active-calls" accentClassName="bg-blue-600" onPress={() => router.navigate('/(app)/home/calls')} />
        <SummaryStatItem
          label={t('home.summary.calls_im_on')}
          value={callsImOnCount}
          testID="summary-calls-im-on"
          accentClassName="bg-emerald-600"
          onPress={() => router.navigate({ pathname: '/(app)/home/calls', params: { filter: 'mine' } })}
        />
        <SummaryStatItem
          label={t('home.summary.active_severe_weather_alerts')}
          value={severeAlerts.length}
          testID="summary-weather-alerts"
          accentClassName="bg-amber-500"
          onPress={() => router.navigate('/(app)/weather-alerts')}
        />
        <SummaryStatItem
          label={t('home.summary.pending_missed_checkins')}
          value={pendingMissedCheckinsCount}
          testID="summary-checkins"
          accentClassName={pendingMissedCheckinsCount > 0 ? 'bg-rose-600' : 'bg-slate-700'}
          shouldPulse={pendingMissedCheckinsCount > 0}
        />
      </HStack>
    </VStack>
  );
};
