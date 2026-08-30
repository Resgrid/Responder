import { format } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { RouteIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import WebView from 'react-native-webview';

import { ProtectedRevealBar } from '@/components/data-protection/protected-reveal-bar';
import { ProtectedText } from '@/components/data-protection/protected-text';
import { isFieldRedacted, ProtectedFieldIds } from '@/lib/data-protection/redacted';
import { CallDetailActionSheetPanel, HeaderRightMenuButton, useCallDetailMenu } from '@/components/calls/call-detail-menu';
import CallFilesModal from '@/components/calls/call-files-modal';
import CallImagesModal from '@/components/calls/call-images-modal';
import CallNotesModal from '@/components/calls/call-notes-modal';
import { CloseCallBottomSheet } from '@/components/calls/close-call-bottom-sheet';
import { CheckInTabPanel } from '@/components/check-in/check-in-tab-panel';
import { HeaderBackButton } from '@/components/common/header-back-button';
import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { IncidentCommandTabPanel } from '@/components/incident-command/incident-command-tab-panel';
import FullScreenMapModal from '@/components/maps/full-screen-map-modal';
// Import a static map component instead of react-native-maps
import StaticMap from '@/components/maps/static-map';
import { FocusAwareStatusBar, SafeAreaView } from '@/components/ui';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { SharedTabs, type TabItem } from '@/components/ui/shared-tabs';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { VideoFeedTabPanel } from '@/components/video-feeds/video-feed-tab-panel';
import { useAnalytics } from '@/hooks/use-analytics';
import { logger } from '@/lib/logging';
import { openMapsWithDirections } from '@/lib/navigation';
import { useLocationStore } from '@/stores/app/location-store';
import { useActiveCallStore } from '@/stores/calls/active-call-store';
import { useCheckInStore } from '@/stores/calls/check-in-store';
import { useCallDetailStore } from '@/stores/calls/detail-store';
import { useSecurityStore } from '@/stores/security/store';
import { useToastStore } from '@/stores/toast/store';
import { generateWebViewHtml, sanitizeHtmlContent } from '@/utils/webview-html';

// Shared shell for the call's own rich-text blocks. `body` must already be sanitized.
const buildRichTextHtml = (body: string, textColor: string, padding: string): string => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        body {
          color: ${textColor};
          font-family: system-ui, -apple-system, sans-serif;
          margin: 0;
          padding: ${padding};
          font-size: 16px;
          line-height: 1.5;
        }
        * {
          max-width: 100%;
        }
      </style>
    </head>
    <body>${body}</body>
  </html>
`;

export default function CallDetail() {
  const { id } = useLocalSearchParams();
  const callId = Array.isArray(id) ? id[0] : (id as string | undefined);
  const router = useRouter();
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [coordinates, setCoordinates] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({
    latitude: null,
    longitude: null,
  });
  // Per-field selectors: an object destructure subscribes to every store write, so unrelated
  // updates re-rendered this screen (and with it two WebViews).
  const call = useCallDetailStore((state) => state.call);
  const callExtraData = useCallDetailStore((state) => state.callExtraData);
  const callPriority = useCallDetailStore((state) => state.callPriority);
  const isLoading = useCallDetailStore((state) => state.isLoading);
  const error = useCallDetailStore((state) => state.error);
  const fetchCallDetail = useCallDetailStore((state) => state.fetchCallDetail);
  const reset = useCallDetailStore((state) => state.reset);
  // useSecurityStore is a hook that already selects per field and memoizes its result.
  const { canUserCreateCalls } = useSecurityStore();
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isImagesModalOpen, setIsImagesModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [isCloseCallModalOpen, setIsCloseCallModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  const { colorScheme } = useColorScheme();
  const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const destinationName = call?.DestinationName?.trim() ?? '';
  const destinationAddress = call?.DestinationAddress?.trim() ?? '';
  const destinationTypeName = call?.DestinationTypeName?.trim() ?? '';
  const destinationDisplayName = destinationName || destinationAddress || destinationTypeName;
  const hasDestination = destinationDisplayName.length > 0;
  const hasDestinationCoordinates = isValidCoordinates(call?.DestinationLatitude ?? undefined, call?.DestinationLongitude ?? undefined);

  // The user's location is only ever read at the moment a route is opened. Subscribing to it --
  // even field by field -- re-rendered the whole screen, tabs and WebViews included, on every GPS
  // fix, which is continuous while responding. Read it non-reactively from the handlers instead.

  // Overdue check-in count for the tab badge. A primitive selector keeps the subscription cheap
  // and lets the badge stay live now that the tab list is memoized.
  const overdueCheckInCount = useCheckInStore((state) => state.timerStatuses.filter((status) => status.Status === 'Overdue').length);

  const handleBack = () => {
    router.back();
  };

  const openNotesModal = () => {
    setIsNotesModalOpen(true);

    // Track analytics for notes modal opening
    trackEvent('call_notes_opened', {
      timestamp: new Date().toISOString(),
      callId: call?.CallId || callId || '',
      notesCount: call?.NotesCount || 0,
    });
  };

  const openImagesModal = () => {
    setIsImagesModalOpen(true);

    // Track analytics for images modal opening
    trackEvent('call_images_opened', {
      timestamp: new Date().toISOString(),
      callId: call?.CallId || callId || '',
      imagesCount: call?.ImgagesCount || 0,
    });
  };

  const openFilesModal = () => {
    setIsFilesModalOpen(true);

    // Track analytics for files modal opening
    trackEvent('call_files_opened', {
      timestamp: new Date().toISOString(),
      callId: call?.CallId || callId || '',
      filesCount: call?.FileCount || 0,
    });
  };

  const handleEditCall = () => {
    if (!callId) {
      logger.warn({
        message: 'Cannot edit call: callId is undefined',
        context: { id },
      });
      return;
    }
    router.push(`/call/${callId}/edit`);
  };

  const handleCloseCall = () => {
    setIsCloseCallModalOpen(true);
  };

  const handleSetActiveCall = () => {
    if (call) {
      useActiveCallStore.getState().setActiveCall(call);
      showToast('success', t('home.active_call.set_active'));
    }
  };

  // Initialize the call detail menu hook
  const { isMenuOpen, openMenu, closeMenu, canEdit } = useCallDetailMenu();

  useEffect(() => {
    reset();
    if (callId) {
      fetchCallDetail(callId);
    }
  }, [callId, fetchCallDetail, reset]);

  // Track analytics when view becomes visible. Keyed on the call id and read through getState():
  // depending on the call/coordinates/extra-data object identities fired three or four duplicate
  // "viewed" events per visit as each piece of data landed.
  useFocusEffect(
    useCallback(() => {
      const viewedCall = useCallDetailStore.getState().call;

      if (!viewedCall) {
        return;
      }

      const { callPriority: viewedPriority, callExtraData: viewedExtraData } = useCallDetailStore.getState();

      trackEvent('call_detail_viewed', {
        timestamp: new Date().toISOString(),
        callId: viewedCall.CallId,
        callNumber: viewedCall.Number,
        callType: viewedCall.Type,
        priority: viewedPriority?.Name || 'Unknown',
        hasCoordinates: !!(viewedCall.Latitude && viewedCall.Longitude) || !!viewedCall.Geolocation,
        notesCount: viewedCall.NotesCount || 0,
        imagesCount: viewedCall.ImgagesCount || 0,
        filesCount: viewedCall.FileCount || 0,
        hasProtocols: !!viewedExtraData?.Protocols?.length,
        hasDispatches: !!viewedExtraData?.Dispatches?.length,
        hasActivity: !!viewedExtraData?.Activity?.length,
      });
      // Deliberately keyed on the call id only -- one event per call, per focus.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trackEvent, call?.CallId])
  );

  useEffect(() => {
    if (call) {
      if (call.Latitude && call.Longitude) {
        setCoordinates({
          latitude: parseFloat(call.Latitude),
          longitude: parseFloat(call.Longitude),
        });
      } else if (call.Geolocation) {
        const [lat, lng] = call.Geolocation.split(',');
        setCoordinates({
          latitude: lat ? parseFloat(lat) : null,
          longitude: lng ? parseFloat(lng) : null,
        });
      }
    }
  }, [call]);

  const handleDestinationRoute = useCallback(async () => {
    if (!call || !hasDestinationCoordinates || call.DestinationLatitude == null || call.DestinationLongitude == null) {
      showToast('error', t('call_detail.no_location_for_routing'));
      return;
    }

    try {
      const { latitude: userLatitude, longitude: userLongitude } = useLocationStore.getState();

      trackEvent('call_destination_route_opened', {
        timestamp: new Date().toISOString(),
        callId: call.CallId,
        destinationTypeName: destinationTypeName || 'POI',
        hasUserLocation: !!(userLatitude && userLongitude),
      });

      const success = await openMapsWithDirections(call.DestinationLatitude, call.DestinationLongitude, destinationDisplayName || t('call_detail.destination'), userLatitude ?? undefined, userLongitude ?? undefined);

      if (!success) {
        showToast('error', t('call_detail.failed_to_open_maps'));
      }
    } catch (error) {
      logger.error({
        message: 'Failed to open maps for call destination routing',
        context: {
          error,
          callId,
          destinationLatitude: call.DestinationLatitude,
          destinationLongitude: call.DestinationLongitude,
        },
      });
      showToast('error', t('call_detail.failed_to_open_maps'));
    }
  }, [call, hasDestinationCoordinates, showToast, t, trackEvent, destinationTypeName, destinationDisplayName, callId]);

  // The call's own rich-text blocks. Held in memos so the WebView `source` objects keep their
  // identity across renders -- a fresh object makes the WebView reload its content.
  const noteWebViewSource = useMemo(() => ({ html: buildRichTextHtml(sanitizeHtmlContent(call?.Note ?? ''), textColor, '0') }), [call?.Note, textColor]);

  const natureWebViewSource = useMemo(() => ({ html: buildRichTextHtml(sanitizeHtmlContent(call?.Nature ?? ''), textColor, '4px 0 16px') }), [call?.Nature, textColor]);

  // Memoized: rebuilding this array on every render remounted two or more WebViews, which was
  // visible jank for the whole time location streaming was active.
  const tabs = useMemo<TabItem[]>(() => {
    if (!call) {
      return [];
    }

    const builtTabs: TabItem[] = [
      {
        key: 'info',
        title: t('call_detail.tabs.info'),
        content: (
          <Box className="p-4">
            <VStack className="space-y-3">
              <Box className="border-b border-outline-100 pb-2">
                <Text className="text-sm text-gray-500">{t('call_detail.priority')}</Text>
                <Text className="font-medium" style={{ color: callPriority?.Color }}>
                  {callPriority?.Name}
                </Text>
              </Box>
              <Box className="border-b border-outline-100 pb-2">
                <Text className="text-sm text-gray-500">{t('call_detail.timestamp')}</Text>
                <Text className="font-medium">{format(new Date(call.LoggedOn), 'MMM d, h:mm a')}</Text>
              </Box>
              <Box className="border-b border-outline-100 pb-2">
                <Text className="text-sm text-gray-500">{t('call_detail.type')}</Text>
                <Text className="font-medium">{call.Type}</Text>
              </Box>
              <Box className="border-b border-outline-100 pb-2">
                <Text className="text-sm text-gray-500">{t('call_detail.address')}</Text>
                <ProtectedText value={call.Address} fieldId={ProtectedFieldIds.callAddress} redactedFields={call.RedactedFields} className="font-medium" />
              </Box>
              {hasDestination ? (
                <Box className="border-b border-outline-100 pb-2">
                  <Text className="text-sm text-gray-500">{t('call_detail.destination')}</Text>
                  <VStack className="space-y-2">
                    <Text className="font-medium">{destinationDisplayName}</Text>
                    {destinationAddress && destinationAddress !== destinationDisplayName ? <Text className="text-sm text-gray-500">{destinationAddress}</Text> : null}
                    {destinationTypeName ? <Text className="text-sm text-gray-500">{destinationTypeName}</Text> : null}
                    {hasDestinationCoordinates ? (
                      <Button action="secondary" className="self-start" onPress={handleDestinationRoute} size="sm" variant="outline">
                        <ButtonIcon as={RouteIcon} />
                        <ButtonText>{t('call_detail.route_to_destination')}</ButtonText>
                      </Button>
                    ) : null}
                  </VStack>
                </Box>
              ) : null}
              <Box className="border-b border-outline-100 pb-2">
                <Text className="text-sm text-gray-500">{t('call_detail.note')}</Text>
                <Box>
                  <WebView
                    style={[styles.container, styles.noteWebView]}
                    originWhitelist={['*']}
                    javaScriptEnabled={false}
                    scrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    source={noteWebViewSource}
                    androidLayerType="software"
                  />
                </Box>
              </Box>
            </VStack>
          </Box>
        ),
      },
      {
        key: 'contact',
        title: t('call_detail.tabs.contact'),
        content: (
          <Box className="p-4">
            <VStack className="space-y-3">
              <Box className="border-b border-outline-100 pb-2">
                <Text className="text-sm text-gray-500">{t('call_detail.reference_id')}</Text>
                <Text className="font-medium">{call.ReferenceId}</Text>
              </Box>
              <Box className="border-b border-outline-100 pb-2">
                <Text className="text-sm text-gray-500">{t('call_detail.external_id')}</Text>
                <Text className="font-medium">{call.ExternalId}</Text>
              </Box>
              <Box className="border-b border-outline-100 pb-2">
                <Text className="text-sm text-gray-500">{t('call_detail.contact_name')}</Text>
                <ProtectedText value={call.ContactName} fieldId={ProtectedFieldIds.callContactName} redactedFields={call.RedactedFields} className="font-medium" />
              </Box>
              <Box className="border-b border-outline-100 pb-2">
                <Text className="text-sm text-gray-500">{t('call_detail.contact_info')}</Text>
                <ProtectedText value={call.ContactInfo} fieldId={ProtectedFieldIds.callContactNumber} redactedFields={call.RedactedFields} className="font-medium" />
              </Box>
            </VStack>
          </Box>
        ),
      },
      {
        key: 'protocols',
        title: t('call_detail.tabs.protocols'),
        content: (
          <Box className="p-4">
            {callExtraData?.Protocols && callExtraData.Protocols.length > 0 ? (
              <VStack className="space-y-3">
                {callExtraData.Protocols.map((protocol, index) => (
                  <Box key={index} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                    <Text className="font-semibold">{protocol.Name}</Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">{protocol.Description}</Text>
                    <Box>
                      <WebView
                        style={[styles.container, styles.noteWebView]}
                        originWhitelist={['*']}
                        javaScriptEnabled={false}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                        source={{
                          html: generateWebViewHtml({
                            content: protocol.ProtocolText,
                            isDarkMode: colorScheme === 'dark',
                            backgroundColor: 'transparent',
                            padding: 0,
                          }),
                        }}
                        androidLayerType="software"
                      />
                    </Box>
                  </Box>
                ))}
              </VStack>
            ) : (
              <Text>{t('call_detail.no_protocols')}</Text>
            )}
          </Box>
        ),
      },
      {
        key: 'dispatched',
        title: t('call_detail.tabs.dispatched'),
        content: (
          <Box className="p-4">
            {callExtraData?.Dispatches && callExtraData.Dispatches.length > 0 ? (
              <VStack className="space-y-3">
                {callExtraData.Dispatches.map((dispatched, index) => (
                  <Box key={index} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                    <Text className="font-semibold">{dispatched.Name}</Text>
                    <HStack className="mt-1">
                      <Text className="mr-2 text-sm text-gray-600">
                        {t('call_detail.group')}: {dispatched.Group}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {t('call_detail.type')}: {dispatched.Type}
                      </Text>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            ) : (
              <Text>{t('call_detail.no_dispatched')}</Text>
            )}
          </Box>
        ),
      },
      {
        key: 'timeline',
        title: t('call_detail.tabs.timeline'),
        badge: callExtraData?.Activity?.length || 0,
        content: (
          <Box className="p-4">
            {callExtraData?.Activity && callExtraData.Activity.length > 0 ? (
              <VStack className="space-y-3">
                {callExtraData.Activity.map((event, index) => (
                  <Box key={index} className="border-l-4 border-blue-500 py-1 pl-3">
                    <Text className="font-semibold" style={{ color: event.StatusColor }}>
                      {event.StatusText}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {event.Name} - {event.Group}
                    </Text>
                    <Text className="text-xs text-gray-500">{new Date(event.Timestamp).toLocaleString()}</Text>
                    <Text className="text-xs text-gray-500">{event.Note}</Text>
                  </Box>
                ))}
              </VStack>
            ) : (
              <Text>{t('call_detail.no_timeline')}</Text>
            )}
          </Box>
        ),
      },
    ];

    builtTabs.push({
      key: 'video',
      title: t('call_detail.tabs.video'),
      content: <VideoFeedTabPanel callId={parseInt(call.CallId)} canEdit={canUserCreateCalls ?? false} />,
    });

    builtTabs.push({
      key: 'command',
      title: t('call_detail.tabs.command'),
      content: <IncidentCommandTabPanel callId={parseInt(call.CallId)} />,
    });

    if (call.CheckInTimersEnabled) {
      builtTabs.push({
        key: 'checkin',
        title: t('check_in.tab_title'),
        badge: overdueCheckInCount > 0 ? overdueCheckInCount : undefined,
        content: <CheckInTabPanel callId={parseInt(call.CallId)} checkInTimersEnabled={true} />,
      });
    }

    return builtTabs;
  }, [
    call,
    callExtraData,
    callPriority,
    canUserCreateCalls,
    colorScheme,
    destinationAddress,
    destinationDisplayName,
    destinationTypeName,
    handleDestinationRoute,
    hasDestination,
    hasDestinationCoordinates,
    noteWebViewSource,
    overdueCheckInCount,
    t,
  ]);

  // Early return if callId is undefined
  if (!callId) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('call_detail.title'),
            headerShown: true,
            headerLeft: () => <HeaderBackButton onPress={handleBack} />,
            headerRight: () => <HeaderRightMenuButton canEdit={canEdit} onPress={openMenu} />,
          }}
        />
        <SafeAreaView className="size-full flex-1">
          <FocusAwareStatusBar hidden={true} />
          <Box className="m-3 mt-5 min-h-[200px] w-full max-w-[600px] gap-5 self-center rounded-lg bg-background-50 p-5 lg:min-w-[700px]">
            <ZeroState heading={t('call_detail.invalid_call')} description={t('call_detail.call_id_missing')} isError={true} />
            <Button onPress={handleBack} className="self-center">
              <ButtonText>{t('common.go_back')}</ButtonText>
            </Button>
          </Box>
        </SafeAreaView>
      </>
    );
  }

  /**
   * Validates if coordinates are valid for routing
   */
  function isValidCoordinates(lat: number | null | undefined, lng: number | null | undefined): boolean {
    // Check if coordinates exist and are valid numbers
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      return false;
    }

    // Check if coordinates are within valid ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return false;
    }

    // Check if coordinates are not NaN
    if (isNaN(lat) || isNaN(lng)) {
      return false;
    }

    return true;
  }

  /**
   * Opens the device's native maps application with directions to the call location
   */
  const handleRoute = async () => {
    try {
      const { latitude: userLatitude, longitude: userLongitude } = useLocationStore.getState();

      // Track analytics for route action
      trackEvent('call_route_opened', {
        timestamp: new Date().toISOString(),
        callId: call?.CallId || callId || '',
        hasUserLocation: !!(userLatitude && userLongitude),
        destinationAddress: call?.Address || '',
      });

      const latitude = coordinates.latitude ?? (call?.Latitude ? parseFloat(call.Latitude) : undefined);
      const longitude = coordinates.longitude ?? (call?.Longitude ? parseFloat(call.Longitude) : undefined);

      // Guard against invalid or missing coordinates
      if (!isValidCoordinates(latitude, longitude)) {
        const reason = latitude === undefined || longitude === undefined ? 'missing_coordinates' : latitude === 0 && longitude === 0 ? 'zeroed_coordinates' : 'invalid_coordinates';

        logger.warn({
          message: 'Cannot route to call: invalid coordinates',
          context: { callId, latitude, longitude, address: call?.Address },
        });

        showToast('error', t('call_detail.no_location_for_routing'));

        // Track failed route attempt with specific reason
        trackEvent('call_route_failed', {
          timestamp: new Date().toISOString(),
          callId: call?.CallId || callId || '',
          reason,
          latitude: latitude?.toString() || 'undefined',
          longitude: longitude?.toString() || 'undefined',
        });
        return;
      }

      const destinationName = call?.Address || t('call_detail.call_location');
      const success = await openMapsWithDirections(latitude as number, longitude as number, destinationName, userLatitude ?? undefined, userLongitude ?? undefined);

      if (!success) {
        showToast('error', t('call_detail.failed_to_open_maps'));
        // Track failed route attempt
        trackEvent('call_route_failed', {
          timestamp: new Date().toISOString(),
          callId: call?.CallId || callId || '',
          reason: 'failed_to_open_maps',
        });
      }
    } catch (error) {
      logger.error({
        message: 'Failed to open maps for routing',
        context: { error, callId, coordinates },
      });
      showToast('error', t('call_detail.failed_to_open_maps'));
      // Track failed route attempt
      trackEvent('call_route_failed', {
        timestamp: new Date().toISOString(),
        callId: call?.CallId || callId || '',
        reason: 'exception',
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('call_detail.title'),
            headerShown: true,
            headerLeft: () => <HeaderBackButton onPress={handleBack} />,
            headerRight: () => <HeaderRightMenuButton canEdit={canEdit} onPress={openMenu} />,
          }}
        />
        <View className="size-full flex-1">
          <FocusAwareStatusBar hidden={true} />
          <Loading />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('call_detail.title'),
            headerShown: true,
            headerLeft: () => <HeaderBackButton onPress={handleBack} />,
            headerRight: () => <HeaderRightMenuButton canEdit={canEdit} onPress={openMenu} />,
          }}
        />
        <View className="size-full flex-1">
          <FocusAwareStatusBar hidden={true} />
          <Box className="m-3 mt-5 min-h-[200px] w-full max-w-[600px] gap-5 self-center rounded-lg bg-background-50 p-5 lg:min-w-[700px]">
            <ZeroState heading={t('call_detail.not_found')} description={error} isError={true} />
          </Box>
        </View>
      </>
    );
  }

  if (!call) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('call_detail.title'),
            headerShown: true,
            headerLeft: () => <HeaderBackButton onPress={handleBack} />,
            headerRight: () => <HeaderRightMenuButton canEdit={canEdit} onPress={openMenu} />,
          }}
        />
        <SafeAreaView className="size-full flex-1">
          <FocusAwareStatusBar hidden={true} />
          <Box className="m-3 mt-5 min-h-[200px] w-full max-w-[600px] gap-5 self-center rounded-lg bg-background-50 p-5 lg:min-w-[700px]">
            <Text className="text-center">{t('call_detail.not_found')}</Text>
            <Button onPress={handleBack} className="self-center">
              <ButtonText>{t('common.go_back')}</ButtonText>
            </Button>
          </Box>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('call_detail.title'),
          headerShown: true,
          headerLeft: () => <HeaderBackButton onPress={handleBack} />,
          headerRight: () => <HeaderRightMenuButton canEdit={canEdit} onPress={openMenu} />,
        }}
      />
      <ScrollView className="size-full w-full flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ paddingBottom: 16 }}>
        {/*
          Protected values (call name, nature, notes, address, contact details) arrive REDACTED and
          only come back decrypted on a request carrying a grant, so revealing has to re-read the
          call. Renders nothing for a department without the addon.
        */}
        <ProtectedRevealBar onRefresh={() => fetchCallDetail(callId)} />

        {/* Header */}
        <Box className="mx-4 mt-3 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
          <HStack className="mb-2 items-center">
            <Heading size="md">
              {/* The call NUMBER is not cataloged, so it stays visible and the record stays findable. */}
              {isFieldRedacted(call.RedactedFields, ProtectedFieldIds.callName, call.Name) ? (
                <ProtectedText value={call.Name} fieldId={ProtectedFieldIds.callName} redactedFields={call.RedactedFields} />
              ) : (
                <>
                  {call.Name} ({call.Number})
                </>
              )}
            </Heading>
          </HStack>
          <VStack className="space-y-1">
            <Box style={styles.natureContainer}>
              <WebView
                style={[styles.container, styles.natureWebView]}
                originWhitelist={['*']}
                javaScriptEnabled={false}
                scrollEnabled={true}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                source={natureWebViewSource}
                androidLayerType="software"
              />
            </Box>
          </VStack>
        </Box>

        {/* Map */}
        {coordinates.latitude != null && coordinates.longitude != null ? (
          <Box className="mx-4 mt-3 overflow-hidden rounded-xl shadow-xs">
            <StaticMap latitude={coordinates.latitude} longitude={coordinates.longitude} address={call.Address} zoom={15} height={200} showUserLocation={true} onPress={() => setIsMapModalOpen(true)} />
          </Box>
        ) : null}

        {/* Action Buttons */}
        <HStack className="mx-4 mt-3 justify-around rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
          <Box className="relative mx-1 flex-1">
            <Button onPress={() => openNotesModal()} variant="outline" className="w-full" size={isLandscape ? 'md' : 'sm'}>
              <ButtonText className={isLandscape ? '' : 'text-xs'}>{t('call_detail.notes')}</ButtonText>
            </Button>
            {call?.NotesCount ? (
              <Box className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1">
                <Text className="text-xs font-medium text-white">{call.NotesCount}</Text>
              </Box>
            ) : null}
          </Box>
          <Box className="relative mx-1 flex-1">
            <Button onPress={openImagesModal} variant="outline" className="w-full" size={isLandscape ? 'md' : 'sm'}>
              <ButtonText className={isLandscape ? '' : 'text-xs'}>{t('call_detail.images')}</ButtonText>
            </Button>
            {call?.ImgagesCount ? (
              <Box className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1">
                <Text className="text-xs font-medium text-white">{call.ImgagesCount}</Text>
              </Box>
            ) : null}
          </Box>
          <Box className="relative mx-1 flex-1">
            <Button onPress={openFilesModal} variant="outline" className="w-full" size={isLandscape ? 'md' : 'sm'}>
              <ButtonText className={isLandscape ? '' : 'text-xs'}>{t('call_detail.files.button')}</ButtonText>
            </Button>
            {call?.FileCount ? (
              <Box className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1">
                <Text className="text-xs font-medium text-white">{call.FileCount}</Text>
              </Box>
            ) : null}
          </Box>
          <Box className="relative mx-1 flex-1">
            <Button onPress={handleRoute} variant="outline" className="w-full" size={isLandscape ? 'md' : 'sm'}>
              <ButtonText className={isLandscape ? '' : 'text-xs'}>{t('common.route')}</ButtonText>
            </Button>
          </Box>
        </HStack>

        {/* Tabs */}
        <Box className="mx-4 mb-4 mt-3 flex-1 overflow-hidden rounded-xl bg-white pb-8 shadow-xs dark:bg-gray-800">
          <SharedTabs tabs={tabs} variant="underlined" size={isLandscape ? 'lg' : 'md'} tabClassName="min-h-11" scrollable={true} />
        </Box>
      </ScrollView>
      {isMapModalOpen && coordinates.latitude != null && coordinates.longitude != null ? (
        <FullScreenMapModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} latitude={coordinates.latitude} longitude={coordinates.longitude} address={call.Address} zoom={15} showUserLocation={true} />
      ) : null}
      <CallNotesModal isOpen={isNotesModalOpen} onClose={() => setIsNotesModalOpen(false)} callId={callId || ''} />
      <CallImagesModal isOpen={isImagesModalOpen} onClose={() => setIsImagesModalOpen(false)} callId={callId || ''} />
      <CallFilesModal isOpen={isFilesModalOpen} onClose={() => setIsFilesModalOpen(false)} callId={callId || ''} />

      {/* Close Call Bottom Sheet */}
      <CloseCallBottomSheet isOpen={isCloseCallModalOpen} onClose={() => setIsCloseCallModalOpen(false)} callId={callId || ''} />

      {/* Call Detail Menu ActionSheet */}
      <CallDetailActionSheetPanel isOpen={isMenuOpen} onClose={closeMenu} onEditCall={handleEditCall} onCloseCall={handleCloseCall} onSetActiveCall={handleSetActiveCall} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  noteWebView: {
    height: 200,
  },
  natureContainer: {
    minHeight: 132,
  },
  natureWebView: {
    height: 132,
  },
});
