import { WifiOff } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useSignalRStore } from '@/stores/signalr/signalr-store';

/**
 * How long a realtime hub may be down before the responder is told about it.
 *
 * Most drops heal on their own well inside the service's reconnect budget, and a strip that
 * flashes on every one of those is a strip people learn to ignore. A hub whose reconnection is
 * already exhausted skips the wait entirely -- there is nothing left to wait for.
 */
export const REALTIME_OUTAGE_GRACE_MS = 20000;

/**
 * Tells the responder when the live call/status/chat feed has actually stopped.
 *
 * This matters more here than in most apps: a dead update feed and a quiet shift look exactly
 * the same on screen, so without this the app silently stops reporting new calls.
 *
 * Everything it reacts to comes from `realtimeHubOutages`, and the SignalR store only records a
 * hub that was connected and then dropped. A cold start, a hub that never connected, an
 * intentional teardown on backgrounding, and signing out all leave that map empty, so none of
 * them can flash the banner.
 */
export const RealtimeStatusBanner: React.FC = () => {
  const { t } = useTranslation();
  const outages = useSignalRStore((state) => state.realtimeHubOutages);
  const [isVisible, setIsVisible] = useState(false);

  // The oldest outage drives the countdown, so a second hub dropping mid-outage cannot push the
  // warning further away.
  const { isExhausted, since } = useMemo(() => {
    const active = Object.values(outages);
    return {
      isExhausted: active.some((outage) => outage.exhausted),
      since: active.length > 0 ? Math.min(...active.map((outage) => outage.since)) : null,
    };
  }, [outages]);

  useEffect(() => {
    if (since === null) {
      setIsVisible(false);
      return;
    }

    if (isExhausted) {
      setIsVisible(true);
      return;
    }

    // Measured from when the session actually dropped rather than from this render, so a screen
    // mounted midway through an outage does not restart the grace period.
    const remaining = REALTIME_OUTAGE_GRACE_MS - (Date.now() - since);
    if (remaining <= 0) {
      setIsVisible(true);
      return;
    }

    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), remaining);
    return () => clearTimeout(timer);
  }, [isExhausted, since]);

  if (!isVisible) {
    return null;
  }

  const title = t('app.realtime_offline_title');
  const description = t('app.realtime_offline_description');

  return (
    <HStack
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityLiveRegion="polite"
      className="w-full items-center bg-amber-700 px-4 py-2 dark:bg-amber-800"
      space="sm"
      testID="realtime-status-banner"
    >
      <WifiOff size={18} color="#FFFFFF" />
      <VStack className="flex-1">
        <Text className="text-sm font-semibold text-white">{title}</Text>
        <Text className="text-xs text-white" numberOfLines={2}>
          {description}
        </Text>
      </VStack>
    </HStack>
  );
};
