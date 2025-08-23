import { Calendar, CheckCircle, Clock, MapPin } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';

interface CompactCalendarItemProps {
  item: CalendarItemResultData;
  onPress: () => void;
  testID?: string;
}

export const CompactCalendarItem: React.FC<CompactCalendarItemProps> = ({ item, onPress, testID }) => {
  const { t } = useTranslation();

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

  return (
    <Pressable onPress={onPress} testID={testID} className="mb-2">
      <Card variant="elevated" className="shadow-sm">
        <CardContent className="p-3">
          <VStack space="xs">
            {/* Header row with title, type badge, and status */}
            <HStack className="items-center justify-between">
              <VStack className="mr-2 flex-1">
                <Heading size="sm" className="text-gray-600 dark:text-gray-300" numberOfLines={1}>
                  {item.Title}
                </Heading>
                {/* Date and time on same line as title for mobile efficiency */}
                <HStack className="mt-0.5 items-center" space="xs">
                  <Calendar size={12} className="text-gray-500 dark:text-gray-400" />
                  <Text className="text-xs text-gray-600 dark:text-gray-300">{formatDate(item.Start)}</Text>
                  <Clock size={12} className="ml-1 text-gray-500 dark:text-gray-400" />
                  <Text className="text-xs text-gray-600 dark:text-gray-300">{getEventDuration()}</Text>
                </HStack>
              </VStack>

              {/* Status indicators - compact badges and icons */}
              <HStack className="items-center" space="xs">
                {item.TypeName ? (
                  <Badge variant="solid" className="px-2 py-1" style={{ backgroundColor: item.TypeColor || '#3B82F6' }}>
                    <Text className="text-xs font-medium text-white" numberOfLines={1}>
                      {item.TypeName}
                    </Text>
                  </Badge>
                ) : null}
                {isSignedUp && canSignUp ? <CheckCircle size={16} className="text-success-500 dark:text-success-400" /> : null}
              </HStack>
            </HStack>

            {/* Location row - only if location exists */}
            {item.Location ? (
              <HStack className="items-center" space="xs">
                <MapPin size={12} className="text-gray-500 dark:text-gray-400" />
                <Text className="flex-1 text-xs text-gray-600 dark:text-gray-300" numberOfLines={1}>
                  {item.Location}
                </Text>
              </HStack>
            ) : null}

            {/* Signup status - compact version only when available */}
            {canSignUp ? (
              <HStack className="items-center justify-between border-t border-gray-200 pt-1 dark:border-gray-700">
                <Text className="text-xs text-gray-500 dark:text-gray-400">{t('calendar.signupAvailable')}</Text>
                {isSignedUp ? (
                  <Badge action="success" variant="solid" className="px-2 py-0.5">
                    <Text className="text-xs text-white">{t('calendar.signedUp')}</Text>
                  </Badge>
                ) : (
                  <Badge action="info" variant="outline" className="px-2 py-0.5">
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
