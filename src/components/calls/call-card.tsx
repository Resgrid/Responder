import { AlertTriangle, MapPin, Phone, Timer } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import WebView from 'react-native-webview';

import { Badge } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { buildCallAssignmentContext, getDispatchTypeStyle, getUniqueDispatches, isCurrentUserOnCall } from '@/lib/call-dispatch';
import { getTimeAgoUtc, invertColor } from '@/lib/utils';
import { type CallPriorityResultData } from '@/models/v4/callPriorities/callPriorityResultData';
import { type CallExtraDataResultData } from '@/models/v4/calls/callExtraDataResultData';
import type { CallResultData } from '@/models/v4/calls/callResultData';
import { type DispatchedEventResultData } from '@/models/v4/calls/dispatchedEventResultData';
import { useCoreStore } from '@/stores/app/core-store';
import { useCallsStore } from '@/stores/calls/store';
import { useHomeStore } from '@/stores/home/home-store';
import { useRolesStore } from '@/stores/roles/store';

function getColor(call: CallResultData, priority: CallPriorityResultData | undefined) {
  if (!call) {
    return '#808080';
  } else if (call.CallId === '0') {
    return '#808080';
  } else if (priority && priority.Color) {
    return priority.Color;
  }

  return '#808080';
}

interface CallCardProps {
  call: CallResultData;
  priority: CallPriorityResultData | undefined;
  callExtraData?: CallExtraDataResultData | null;
}

interface DispatchTickerProps {
  dispatches: DispatchedEventResultData[];
}

const DISPATCH_TICKER_GAP = 6;
const DISPATCH_TICKER_REPEAT_GAP = 28;
const DISPATCH_TICKER_MIN_DURATION = 4000;
const DISPATCH_TICKER_MS_PER_PIXEL = 25;

const DispatchTicker: React.FC<DispatchTickerProps> = ({ dispatches }) => {
  const uniqueDispatches = useMemo(() => getUniqueDispatches(dispatches), [dispatches]);
  const translateX = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const hasDispatches = uniqueDispatches.length > 0;
  const shouldAnimate = hasDispatches && containerWidth > 0 && contentWidth > 0 && contentWidth > containerWidth;
  const copyCount = useMemo(() => {
    if (!hasDispatches || containerWidth === 0 || contentWidth === 0 || contentWidth <= containerWidth) {
      return 1;
    }

    const segmentWidth = contentWidth + DISPATCH_TICKER_REPEAT_GAP;
    return Math.max(2, Math.ceil(containerWidth / Math.max(segmentWidth, 1)) + 2);
  }, [containerWidth, contentWidth, hasDispatches]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  useEffect(() => {
    cancelAnimation(translateX);
    translateX.value = 0;

    if (!shouldAnimate) {
      return undefined;
    }

    const distance = contentWidth + DISPATCH_TICKER_REPEAT_GAP;
    const duration = Math.max(DISPATCH_TICKER_MIN_DURATION, distance * DISPATCH_TICKER_MS_PER_PIXEL);

    translateX.value = withRepeat(withTiming(-distance, { duration, easing: Easing.linear }), -1, false);

    return () => {
      cancelAnimation(translateX);
    };
  }, [contentWidth, shouldAnimate, translateX]);

  if (!hasDispatches) {
    return null;
  }

  const renderDispatches = (suffix: string) => {
    return uniqueDispatches.map((dispatch) => {
      const typeStyle = getDispatchTypeStyle(dispatch.Type);

      return (
        <View key={`${dispatch.Id || `${dispatch.Type}:${dispatch.Name}`}-${suffix}`} style={[styles.dispatchBadge, { backgroundColor: typeStyle.backgroundColor }]}>
          <Text style={[styles.dispatchBadgeType, { color: typeStyle.textColor }]}>{typeStyle.label}</Text>
          <Text style={[styles.dispatchBadgeName, { color: typeStyle.textColor }]} numberOfLines={1}>
            {dispatch.Name}
          </Text>
        </View>
      );
    });
  };

  return (
    <View onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)} style={styles.dispatchTickerViewport} testID="dispatch-ticker">
      <Animated.View style={[styles.dispatchTickerTrack, animatedStyle]} testID="dispatch-ticker-track">
        {Array.from({ length: copyCount }, (_, index) => {
          const testId = index === 0 ? 'dispatch-ticker-set-primary' : `dispatch-ticker-copy-${index}`;

          return (
            <React.Fragment key={testId}>
              {index > 0 ? (
                <View style={styles.dispatchTickerEndMarker}>
                  <View style={styles.dispatchTickerEndLine} />
                </View>
              ) : null}
              <View onLayout={index === 0 ? (event) => setContentWidth(event.nativeEvent.layout.width) : undefined} style={styles.dispatchTickerContent} testID={testId}>
                {renderDispatches(testId)}
              </View>
            </React.Fragment>
          );
        })}
      </Animated.View>
    </View>
  );
};

export const CallCard: React.FC<CallCardProps> = ({ call, priority, callExtraData }) => {
  const { t } = useTranslation();
  const currentUser = useHomeStore((state) => state.currentUser);
  const roles = useRolesStore((state) => state.roles);
  const activeUnitId = useCoreStore((state) => state.activeUnitId);
  const fetchCallExtraData = useCallsStore((state) => state.fetchCallExtraData);
  const cachedCallExtraData = useCallsStore((state) => state.callExtrasById[call.CallId]);
  const textColor = invertColor(getColor(call, priority), true);
  const resolvedCallExtraData = callExtraData ?? cachedCallExtraData ?? null;

  useEffect(() => {
    if (!callExtraData && !cachedCallExtraData) {
      void fetchCallExtraData(call.CallId);
    }
  }, [cachedCallExtraData, call.CallId, callExtraData, fetchCallExtraData]);

  const assignmentContext = useMemo(() => buildCallAssignmentContext(currentUser, roles, activeUnitId), [activeUnitId, currentUser, roles]);
  const isAssignedToCurrentUser = useMemo(() => isCurrentUserOnCall(resolvedCallExtraData, assignmentContext), [assignmentContext, resolvedCallExtraData]);

  return (
    <Box
      style={{
        backgroundColor: getColor(call, priority),
        borderWidth: isAssignedToCurrentUser ? 3 : 0,
        borderColor: isAssignedToCurrentUser ? '#FDE047' : 'transparent',
      }}
      className="mb-4 rounded-xl p-2 shadow-sm"
    >
      <HStack className="mb-4 items-center justify-between">
        <HStack className="items-center space-x-2">
          <AlertTriangle size={20} />
          <Text
            style={{
              color: textColor,
            }}
            className="text-lg font-bold"
          >
            #{call.Number}
          </Text>
          {call.CheckInTimersEnabled ? <Timer size={16} color={textColor} /> : null}
        </HStack>
        <Text
          style={{
            color: textColor,
          }}
          className="text-sm text-gray-600"
        >
          {getTimeAgoUtc(call.LoggedOnUtc)}
        </Text>
      </HStack>

      {isAssignedToCurrentUser ? (
        <Badge variant="solid" className="mb-3 self-start bg-yellow-300 px-2 py-1">
          <Text className="text-xs font-bold uppercase text-yellow-950">{t('calls.assigned_to_me')}</Text>
        </Badge>
      ) : null}

      <VStack className="space-y-3">
        <HStack className="items-center space-x-2">
          <Icon as={Phone} className="text-gray-500" size="md" />
          <Text
            style={{
              color: textColor,
            }}
            className="font-medium text-gray-900"
          >
            {call.Name}
          </Text>
        </HStack>

        <HStack className="items-center space-x-2">
          <Icon as={MapPin} className="text-gray-500" size="md" />
          <Text
            style={{
              color: textColor,
            }}
            className="text-gray-700"
          >
            {call.Address}
          </Text>
        </HStack>

        {resolvedCallExtraData?.Dispatches?.length ? <DispatchTicker dispatches={resolvedCallExtraData.Dispatches} /> : null}
      </VStack>

      {call.Nature ? (
        <Box className="mt-4 rounded-lg bg-white/50 p-3">
          <WebView
            style={[styles.container, { height: 80 }]}
            originWhitelist={['*']}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            source={{
              html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                    <style>
                      body {
                        color: ${textColor};
                        font-family: system-ui, -apple-system, sans-serif;
                        margin: 0;
                        padding: 0;
                        font-size: 16px;
                        line-height: 1.5;
                      }
                      * {
                        max-width: 100%;
                      }
                    </style>
                  </head>
                  <body>${call.Nature}</body>
                </html>
              `,
            }}
            androidLayerType="software"
          />
        </Box>
      ) : null}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  dispatchTickerViewport: {
    overflow: 'hidden',
    width: '100%',
  },
  dispatchTickerTrack: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  dispatchTickerContent: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: DISPATCH_TICKER_GAP,
    paddingVertical: 2,
  },
  dispatchTickerEndMarker: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    justifyContent: 'center',
    width: DISPATCH_TICKER_REPEAT_GAP,
  },
  dispatchTickerEndLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 1,
    height: 14,
    width: 2,
  },
  dispatchBadge: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 3,
    maxWidth: 160,
    minHeight: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dispatchBadgeType: {
    fontSize: 9,
    fontWeight: '700',
  },
  dispatchBadgeName: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '600',
  },
});
