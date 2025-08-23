import { Calendar, CheckCircle, Clock, MapPin, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

import { Badge } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Card, CardContent } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';
import { defaultWebViewProps, generateWebViewHtml } from '@/utils/webview-html';

interface CalendarCardProps {
  item: CalendarItemResultData;
  onPress: () => void;
  testID?: string;
}

export const CalendarCard: React.FC<CalendarCardProps> = ({ item, onPress, testID }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEventDuration = () => {
    if (item.IsAllDay) {
      return t('calendar.allDay');
    }
    const start = formatTime(item.Start);
    const end = formatTime(item.End);
    return `${start} - ${end}`;
  };

  const canSignUp = item.SignupType > 0 && !item.LockEditing;
  const isSignedUp = item.Attending;
  const isDarkMode = colorScheme === 'dark';

  return (
    <Pressable onPress={onPress} testID={testID} className="mb-3">
      <Card variant="elevated" className="shadow-sm">
        <CardContent className="p-4">
          <VStack space="sm">
            {/* Header with type and attendance status */}
            <HStack className="items-start justify-between">
              <VStack className="flex-1">
                <Heading size="sm" className="text-gray-600 dark:text-gray-300" numberOfLines={2}>
                  {item.Title}
                </Heading>
                {item.TypeName ? (
                  <Badge variant="solid" className="mt-1 self-start" style={{ backgroundColor: item.TypeColor || '#3B82F6' }}>
                    <Text className="text-xs font-medium text-white">{item.TypeName}</Text>
                  </Badge>
                ) : null}
              </VStack>
              {isSignedUp && canSignUp ? <CheckCircle size={20} className="ml-2 mt-1 text-success-500 dark:text-success-400" /> : null}
            </HStack>

            {/* Date and Time */}
            <HStack className="items-center" space="sm">
              <Calendar size={16} className="text-gray-500 dark:text-gray-400" />
              <Text className="text-sm text-gray-600 dark:text-gray-300">{formatDate(item.Start)}</Text>
              <Clock size={16} className="ml-2 text-gray-500 dark:text-gray-400" />
              <Text className="text-sm text-gray-600 dark:text-gray-300">{getEventDuration()}</Text>
            </HStack>

            {/* Location */}
            {item.Location ? (
              <HStack className="items-center" space="sm">
                <MapPin size={16} className="text-gray-500 dark:text-gray-400" />
                <Text className="flex-1 text-sm text-gray-600 dark:text-gray-300" numberOfLines={1}>
                  {item.Location}
                </Text>
              </HStack>
            ) : null}

            {/* Description preview */}
            {item.Description ? (
              <Box className="w-full rounded bg-gray-50 p-1 dark:bg-gray-700">
                <WebView
                  style={styles.webView}
                  {...defaultWebViewProps}
                  scrollEnabled={false}
                  source={{
                    html: generateWebViewHtml({
                      content: item.Description,
                      isDarkMode,
                      fontSize: 14,
                      lineHeight: 1.4,
                      padding: 6,
                    }),
                  }}
                  testID="description-webview"
                />
              </Box>
            ) : null}

            {/* Attendees count */}
            {item.Attendees && item.Attendees.length > 0 ? (
              <HStack className="items-center" space="sm">
                <Users size={16} className="text-gray-500 dark:text-gray-400" />
                <Text className="text-sm text-gray-600 dark:text-gray-300">{t('calendar.attendeesCount', { count: item.Attendees.length })}</Text>
              </HStack>
            ) : null}

            {/* Signup info */}
            {canSignUp ? (
              <HStack className="items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                <Text className="text-sm text-gray-500 dark:text-gray-400">{t('calendar.signupAvailable')}</Text>
                {isSignedUp ? (
                  <Badge action="success" variant="solid">
                    <Text className="text-xs text-white">{t('calendar.signedUp')}</Text>
                  </Badge>
                ) : (
                  <Badge action="info" variant="outline">
                    <Text className="text-xs text-info-600 dark:text-info-400">{t('calendar.tapToSignUp')}</Text>
                  </Badge>
                )}
              </HStack>
            ) : null}
          </VStack>
        </CardContent>
      </Card>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  webView: {
    height: 60, // Compact height for card preview
    backgroundColor: 'transparent',
    width: '100%',
  },
});
