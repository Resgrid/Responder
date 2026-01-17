import { Calendar, Tag, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

import { useAnalytics } from '@/hooks/use-analytics';
import { formatDateForDisplay, parseDateISOString, stripHtmlTags } from '@/lib/utils';
import { useProtocolsStore } from '@/stores/protocols/store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Box } from '../ui/box';
import { Button } from '../ui/button';
import { Divider } from '../ui/divider';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

export const ProtocolDetailsSheet: React.FC = () => {
  const { colorScheme } = useColorScheme();
  const { protocols, selectedProtocolId, isDetailsOpen, closeDetails } = useProtocolsStore();
  const { trackEvent } = useAnalytics();

  const selectedProtocol = protocols.find((protocol) => protocol.ProtocolId === selectedProtocolId);

  // Track analytics when the protocol details sheet becomes visible
  const trackViewAnalytics = useCallback(() => {
    if (!selectedProtocol) return;

    try {
      trackEvent('protocol_details_viewed', {
        timestamp: new Date().toISOString(),
        protocolId: selectedProtocol.ProtocolId || '',
        protocolName: selectedProtocol.Name || '',
        protocolCode: selectedProtocol.Code || '',
        hasDescription: !!selectedProtocol.Description,
        hasProtocolText: !!selectedProtocol.ProtocolText,
        hasCode: !!selectedProtocol.Code,
        protocolState: selectedProtocol.State || 0,
        isDisabled: !!selectedProtocol.IsDisabled,
        contentLength: selectedProtocol.ProtocolText?.length || 0,
        departmentId: selectedProtocol.DepartmentId || '',
      });
    } catch (error) {
      // Analytics errors should not break the component
      console.warn('Failed to track protocol details view analytics:', error);
    }
  }, [trackEvent, selectedProtocol]);

  // Track analytics when sheet becomes visible
  useEffect(() => {
    if (isDetailsOpen && selectedProtocol) {
      trackViewAnalytics();
    }
  }, [isDetailsOpen, selectedProtocol, trackViewAnalytics]);

  // Handle close with analytics
  const handleClose = useCallback(() => {
    if (selectedProtocol) {
      try {
        trackEvent('protocol_details_closed', {
          timestamp: new Date().toISOString(),
          protocolId: selectedProtocol.ProtocolId || '',
          protocolName: selectedProtocol.Name || '',
        });
      } catch (error) {
        // Analytics errors should not break the component
        console.warn('Failed to track protocol details close analytics:', error);
      }
    }
    closeDetails();
  }, [trackEvent, selectedProtocol, closeDetails]);

  if (!selectedProtocol) return null;

  const textColor = colorScheme === 'dark' ? '#E5E7EB' : '#1F2937'; // gray-200 : gray-800

  return (
    <Actionsheet isOpen={isDetailsOpen} onClose={handleClose} snapPoints={[67]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="w-full rounded-t-xl bg-white dark:bg-gray-800">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <Box className="w-full flex-1 p-4">
          <HStack className="mb-4 items-center justify-between">
            <Heading size="lg" className="text-gray-800 dark:text-gray-100">
              {selectedProtocol.Name}
            </Heading>
            <Button variant="link" onPress={handleClose} className="p-1" testID="close-button">
              <X size={24} className="text-gray-600 dark:text-gray-400" />
            </Button>
          </HStack>

          <VStack space="md" className="flex-1">
            {/* Protocol code */}
            {selectedProtocol.Code && (
              <HStack space="xs" className="items-center">
                <Tag size={18} className="text-gray-600 dark:text-gray-400" />
                <Text className="text-gray-700 dark:text-gray-300">{selectedProtocol.Code}</Text>
              </HStack>
            )}

            {/* Protocol description */}
            {selectedProtocol.Description && (
              <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                <Text className="text-gray-700 dark:text-gray-300">{stripHtmlTags(selectedProtocol.Description)}</Text>
              </Box>
            )}

            {/* Protocol content in WebView */}
            <Box className="w-full flex-1 rounded-lg bg-gray-50 p-1 dark:bg-gray-700">
              <WebView
                style={styles.container}
                originWhitelist={['*']}
                scrollEnabled={true}
                showsVerticalScrollIndicator={true}
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
                            padding: 8px;
                            font-size: 16px;
                            line-height: 1.5;
                            background-color: ${colorScheme === 'dark' ? '#374151' : '#F9FAFB'};
                          }
                          * {
                            max-width: 100%;
                          }
                        </style>
                      </head>
                      <body>${selectedProtocol.ProtocolText}</body>
                    </html>
                  `,
                }}
                androidLayerType="software"
              />
            </Box>

            <Divider />

            {/* Date information */}
            <HStack space="xs" className="items-center">
              <Calendar size={18} className="text-gray-600 dark:text-gray-400" />
              <Text className="text-gray-700 dark:text-gray-300">{formatDateForDisplay(parseDateISOString(selectedProtocol.UpdatedOn || selectedProtocol.CreatedOn), 'yyyy-MM-dd HH:mm Z')}</Text>
            </HStack>
          </VStack>
        </Box>
      </ActionsheetContent>
    </Actionsheet>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 380, // Larger height for 2/3 screen
    backgroundColor: 'transparent',
  },
});
