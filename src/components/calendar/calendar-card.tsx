import { Calendar, CheckCircle, Clock, MapPin, Users } from 'lucide-react-native';
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

interface CalendarCardProps {
  item: CalendarItemResultData;
  onPress: () => void;
  testID?: string;
}

export const CalendarCard: React.FC<CalendarCardProps> = ({ item, onPress, testID }) => {
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
    <Pressable onPress={onPress} testID={testID}>
      <Card className="mb-3 shadow-sm">
        <CardContent className="p-4">
          <VStack space="sm">
            {/* Header with type and attendance status */}
            <HStack className="items-start justify-between">
              <VStack className="flex-1">
                <Heading size="sm" className="text-gray-900 dark:text-white" numberOfLines={2}>
                  {item.Title}
                </Heading>
                {item.TypeName ? (
                  <Badge variant="solid" className="mt-1 self-start" style={{ backgroundColor: item.TypeColor || '#3B82F6' }}>
                    <Text className="text-xs font-medium text-white">{item.TypeName}</Text>
                  </Badge>
                ) : null}
              </VStack>
              {isSignedUp && canSignUp ? <CheckCircle size={20} color="#10B981" className="ml-2 mt-1" /> : null}
            </HStack>

            {/* Date and Time */}
            <HStack className="items-center" space="sm">
              <Calendar size={16} color="#6B7280" />
              <Text className="text-sm text-gray-600 dark:text-gray-300">{formatDate(item.Start)}</Text>
              <Clock size={16} color="#6B7280" className="ml-2" />
              <Text className="text-sm text-gray-600 dark:text-gray-300">{getEventDuration()}</Text>
            </HStack>

            {/* Location */}
            {item.Location ? (
              <HStack className="items-center" space="sm">
                <MapPin size={16} color="#6B7280" />
                <Text className="flex-1 text-sm text-gray-600 dark:text-gray-300" numberOfLines={1}>
                  {item.Location}
                </Text>
              </HStack>
            ) : null}

            {/* Description preview */}
            {item.Description ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
                {item.Description}
              </Text>
            ) : null}

            {/* Attendees count */}
            {item.Attendees && item.Attendees.length > 0 ? (
              <HStack className="items-center" space="sm">
                <Users size={16} color="#6B7280" />
                <Text className="text-sm text-gray-600 dark:text-gray-300">{t('calendar.attendeesCount', { count: item.Attendees.length })}</Text>
              </HStack>
            ) : null}

            {/* Signup info */}
            {canSignUp ? (
              <HStack className="items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-700">
                <Text className="text-sm text-gray-500 dark:text-gray-400">{t('calendar.signupAvailable')}</Text>
                {isSignedUp ? (
                  <Badge variant="solid" className="bg-green-500">
                    <Text className="text-xs text-white">{t('calendar.signedUp')}</Text>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-primary-500">
                    <Text className="text-xs text-primary-600 dark:text-primary-400">{t('calendar.tapToSignUp')}</Text>
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
