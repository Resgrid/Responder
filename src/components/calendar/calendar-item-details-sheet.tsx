import { AlertCircle, Calendar, CheckCircle, Clock, FileText, MapPin, User, Users, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView } from 'react-native';

import { Loading } from '@/components/common/loading';
import { Badge } from '@/components/ui/badge';
import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';
import { useCalendarStore } from '@/stores/calendar/store';

interface CalendarItemDetailsSheetProps {
  item: CalendarItemResultData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarItemDetailsSheet: React.FC<CalendarItemDetailsSheetProps> = ({ item, isOpen, onClose }) => {
  const { t } = useTranslation();
  const [signupNote, setSignupNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const { setCalendarItemAttendingStatus, isAttendanceLoading, attendanceError } = useCalendarStore();
  const { trackEvent } = useAnalytics();

  // Track analytics when sheet becomes visible
  useEffect(() => {
    if (isOpen && item) {
      trackEvent('calendar_item_details_viewed', {
        itemId: item.CalendarItemId,
        itemType: item.ItemType,
        hasLocation: Boolean(item.Location),
        hasDescription: Boolean(item.Description),
        isAllDay: item.IsAllDay,
        canSignUp: item.SignupType > 0 && !item.LockEditing,
        isSignedUp: item.Attending,
        attendeeCount: item.Attendees?.length || 0,
        signupType: item.SignupType,
        typeName: item.TypeName || '',
        timestamp: new Date().toISOString(),
      });
    }
  }, [isOpen, item, trackEvent]);

  if (!item) return null;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const getEventDuration = () => {
    if (item.IsAllDay) {
      return t('calendar.allDay');
    }
    const start = formatDateTime(item.Start);
    const end = formatDateTime(item.End);
    return `${start.time} - ${end.time}`;
  };

  const canSignUp = item.SignupType > 0 && !item.LockEditing;
  const isSignedUp = item.Attending;

  const handleAttendanceChange = async (attending: boolean) => {
    if (attending && !showNoteInput && item.SignupType > 1) {
      // If signing up and note is optional/required, show note input
      setShowNoteInput(true);
      return;
    }

    if (!attending) {
      Alert.alert(t('calendar.confirmUnsignup.title'), t('calendar.confirmUnsignup.message'), [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('calendar.unsignup'),
          style: 'destructive',
          onPress: () => performAttendanceChange(false),
        },
      ]);
      return;
    }

    performAttendanceChange(attending);
  };

  const performAttendanceChange = async (attending: boolean) => {
    try {
      const status = attending ? 1 : 4; // 1 = attending, 4 = not attending (matching Angular)

      // Track attendance change attempt
      trackEvent('calendar_item_attendance_attempted', {
        itemId: item.CalendarItemId,
        attending,
        status,
        hasNote: Boolean(signupNote),
        noteLength: signupNote.length,
        timestamp: new Date().toISOString(),
      });

      await setCalendarItemAttendingStatus(item.CalendarItemId, signupNote, status);
      setSignupNote('');
      setShowNoteInput(false);

      // Track successful attendance change
      trackEvent('calendar_item_attendance_success', {
        itemId: item.CalendarItemId,
        attending,
        status,
        hasNote: Boolean(signupNote),
        timestamp: new Date().toISOString(),
      });

      // Show success message
      Alert.alert(t('calendar.attendanceUpdated.title'), attending ? t('calendar.attendanceUpdated.signedUp') : t('calendar.attendanceUpdated.unsignedUp'));
    } catch (error) {
      // Track attendance change failure
      trackEvent('calendar_item_attendance_failed', {
        itemId: item.CalendarItemId,
        attending,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      Alert.alert(t('calendar.error.title'), attendanceError || t('calendar.error.attendanceUpdate'));
    }
  };

  const renderAttendeesList = () => {
    if (!item.Attendees || item.Attendees.length === 0) {
      return null;
    }

    return (
      <VStack className="mt-6">
        <HStack className="mb-3 items-center">
          <Users size={18} color="#6B7280" />
          <Heading size="sm" className="ml-2 text-gray-900 dark:text-white">
            {t('calendar.attendees.title')} ({item.Attendees.length})
          </Heading>
        </HStack>
        <VStack space="sm">
          {item.Attendees.map((attendee) => (
            <HStack key={`${attendee.UserId}-${attendee.CalendarItemId}`} className="items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <User size={16} color="#6B7280" />
              <VStack className="ml-3 flex-1">
                <Text className="font-medium text-gray-900 dark:text-white">{attendee.Name}</Text>
                {attendee.GroupName ? <Text className="text-sm text-gray-500 dark:text-gray-400">{attendee.GroupName}</Text> : null}
                {attendee.Note ? <Text className="mt-1 text-sm text-gray-600 dark:text-gray-300">{attendee.Note}</Text> : null}
              </VStack>
              <Badge variant={attendee.AttendeeType === 1 ? 'solid' : 'outline'} className={attendee.AttendeeType === 1 ? 'bg-green-500' : 'border-blue-500'}>
                <Text className={`text-xs ${attendee.AttendeeType === 1 ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>{attendee.AttendeeType === 1 ? t('calendar.required') : t('calendar.optional')}</Text>
              </Badge>
            </HStack>
          ))}
        </VStack>
      </VStack>
    );
  };

  const startDateTime = formatDateTime(item.Start);

  return (
    <CustomBottomSheet isOpen={isOpen} onClose={onClose}>
      <VStack className="max-h-[80vh] p-6">
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <VStack className="mb-6">
            <HStack className="mb-2 items-start justify-between">
              <Heading size="lg" className="flex-1 text-gray-900 dark:text-white">
                {item.Title}
              </Heading>
              {isSignedUp && canSignUp ? <CheckCircle size={24} color="#10B981" className="ml-2" /> : null}
            </HStack>

            {item.TypeName ? (
              <Badge variant="solid" className="self-start" style={{ backgroundColor: item.TypeColor || '#3B82F6' }}>
                <Text className="text-sm font-medium text-white">{item.TypeName}</Text>
              </Badge>
            ) : null}
          </VStack>

          {/* Date and Time */}
          <VStack className="mb-6">
            <HStack className="mb-2 items-center">
              <Calendar size={18} color="#6B7280" />
              <Text className="ml-2 font-medium text-gray-900 dark:text-white">{startDateTime.date}</Text>
            </HStack>
            <HStack className="items-center">
              <Clock size={18} color="#6B7280" />
              <Text className="ml-2 text-gray-600 dark:text-gray-300">{getEventDuration()}</Text>
            </HStack>
          </VStack>

          {/* Location */}
          {item.Location ? (
            <HStack className="mb-6 items-center">
              <MapPin size={18} color="#6B7280" />
              <Text className="ml-2 text-gray-600 dark:text-gray-300">{item.Location}</Text>
            </HStack>
          ) : null}

          {/* Description */}
          {item.Description ? (
            <VStack className="mb-6">
              <HStack className="mb-2 items-center">
                <FileText size={18} color="#6B7280" />
                <Heading size="sm" className="ml-2 text-gray-900 dark:text-white">
                  {t('calendar.description')}
                </Heading>
              </HStack>
              <Text className="leading-6 text-gray-600 dark:text-gray-300">{item.Description}</Text>
            </VStack>
          ) : null}

          {/* Creator Info */}
          {item.CreatorUserId ? (
            <HStack className="mb-6 items-center">
              <User size={18} color="#6B7280" />
              <Text className="ml-2 text-gray-600 dark:text-gray-300">
                {t('calendar.createdBy')}: {item.CreatorUserId}
              </Text>
            </HStack>
          ) : null}

          {/* Signup Section */}
          {canSignUp ? (
            <VStack className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <HStack className="mb-3 items-center">
                <AlertCircle size={18} color="#3B82F6" />
                <Heading size="sm" className="ml-2 text-blue-900 dark:text-blue-100">
                  {t('calendar.signup.title')}
                </Heading>
              </HStack>

              {showNoteInput ? (
                <VStack space="sm" className="mb-4">
                  <Text className="text-sm text-blue-800 dark:text-blue-200">{t('calendar.signup.notePrompt')}</Text>
                  <Input>
                    <InputField placeholder={t('calendar.signup.notePlaceholder')} value={signupNote} onChangeText={setSignupNote} multiline numberOfLines={3} />
                  </Input>
                </VStack>
              ) : null}

              <HStack space="sm">
                {isSignedUp ? (
                  <Button variant="outline" onPress={() => handleAttendanceChange(false)} disabled={isAttendanceLoading} className="flex-1 border-red-500">
                    {isAttendanceLoading ? (
                      <Loading size="small" />
                    ) : (
                      <>
                        <XCircle size={16} color="#EF4444" className="mr-2" />
                        <ButtonText className="text-red-600 dark:text-red-400">{t('calendar.unsignup')}</ButtonText>
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    {showNoteInput ? (
                      <>
                        <Button
                          variant="outline"
                          onPress={() => {
                            setShowNoteInput(false);
                            setSignupNote('');
                          }}
                          className="flex-1"
                        >
                          <ButtonText>{t('common.cancel')}</ButtonText>
                        </Button>
                        <Button variant="solid" onPress={() => performAttendanceChange(true)} disabled={isAttendanceLoading} className="flex-1 bg-green-600">
                          {isAttendanceLoading ? <Loading size="small" /> : <ButtonText className="text-white">{t('calendar.confirmSignup')}</ButtonText>}
                        </Button>
                      </>
                    ) : (
                      <Button variant="solid" onPress={() => handleAttendanceChange(true)} disabled={isAttendanceLoading} className="flex-1 bg-green-600">
                        {isAttendanceLoading ? (
                          <Loading size="small" />
                        ) : (
                          <>
                            <CheckCircle size={16} color="#FFFFFF" className="mr-2" />
                            <ButtonText className="text-white">{t('calendar.signup.button')}</ButtonText>
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </HStack>
            </VStack>
          ) : null}

          {/* Attendees List */}
          {renderAttendeesList()}
        </ScrollView>
      </VStack>
    </CustomBottomSheet>
  );
};
