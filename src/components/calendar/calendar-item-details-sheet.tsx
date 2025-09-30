import { AlertCircle, Calendar, CheckCircle, Clock, FileText, MapPin, User, Users, XCircle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

import { Loading } from '@/components/common/loading';
import { Badge } from '@/components/ui/badge';
import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { useToast } from '@/hooks/use-toast';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';
import { useCalendarStore } from '@/stores/calendar/store';
import { usePersonnelStore } from '@/stores/personnel/store';
import { sanitizeHtmlContent } from '@/utils/webview-html';

interface CalendarItemDetailsSheetProps {
  item: CalendarItemResultData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarItemDetailsSheet: React.FC<CalendarItemDetailsSheetProps> = ({ item, isOpen, onClose }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const [signupNote, setSignupNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(120);

  const { setCalendarItemAttendingStatus, isAttendanceLoading, attendanceError, fetchCalendarItem } = useCalendarStore();
  const { personnel, fetchPersonnel, isLoading: isPersonnelLoading } = usePersonnelStore();
  const { trackEvent } = useAnalytics();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

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

  // Auto-fetch personnel when component mounts and personnel store is empty
  useEffect(() => {
    if (isOpen && personnel.length === 0 && !isPersonnelLoading) {
      setIsInitializing(true);
      fetchPersonnel().finally(() => {
        setIsInitializing(false);
      });
    }
  }, [isOpen, personnel.length, isPersonnelLoading, fetchPersonnel]);

  if (!item) return null;

  const getCreatorName = (createdByUserId: string): string => {
    // Show loading if we're initializing or loading personnel
    if (isInitializing || isPersonnelLoading) {
      return t('loading');
    }

    // If no creator ID, show unknown
    if (!createdByUserId) {
      return t('unknown_user');
    }

    // Find the creator in the personnel list
    const creator = personnel.find((person) => person.UserId === createdByUserId);

    if (creator) {
      const fullName = `${creator.FirstName} ${creator.LastName}`.trim();
      if (fullName) {
        return fullName;
      }
      return t('unknown_user');
    }

    // Fallback to a user-friendly message if person not found in personnel list
    return t('unknown_user');
  };

  const formatDateTime = (dateTime: string): { date: string; time: string } => {
    const date = new Date(dateTime);
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

      // Refresh the calendar item data to get the latest state from server
      await fetchCalendarItem(item.CalendarItemId);

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

      // Show success toast message
      showSuccessToast(attending ? t('calendar.attendanceUpdated.signedUp') : t('calendar.attendanceUpdated.unsignedUp'), t('calendar.attendanceUpdated.title'));
    } catch (error) {
      // Track attendance change failure
      trackEvent('calendar_item_attendance_failed', {
        itemId: item.CalendarItemId,
        attending,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      // Show error toast message
      showErrorToast(t('calendar.error.attendanceUpdate'), t('calendar.error.title'));
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
      <VStack className="h-[80vh]">
        <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ padding: 24 }}>
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
              <Box className="w-full rounded-lg bg-gray-50 p-1 dark:bg-gray-700">
                <WebView
                  style={[styles.container, { height: webViewHeight }]}
                  originWhitelist={['about:blank']}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  javaScriptEnabled={true}
                  domStorageEnabled={false}
                  allowFileAccess={false}
                  allowUniversalAccessFromFileURLs={false}
                  onMessage={(event) => {
                    const height = parseInt(event.nativeEvent.data, 10);
                    if (height && height > 0) {
                      // Add some padding to ensure all content is visible
                      setWebViewHeight(Math.max(height + 20, 120));
                    }
                  }}
                  onShouldStartLoadWithRequest={(request) => {
                    // Only allow the initial HTML load with about:blank or data URLs
                    return request.url === 'about:blank' || request.url.startsWith('data:');
                  }}
                  onNavigationStateChange={(navState) => {
                    // Prevent any navigation away from the initial HTML
                    if (navState.url !== 'about:blank' && !navState.url.startsWith('data:')) {
                      return false;
                    }
                  }}
                  source={{
                    html: `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
                          <style>
                            body {
                              color: ${colorScheme === 'dark' ? '#E5E7EB' : '#1F2937'};
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
                        <body>
                          ${sanitizeHtmlContent(item.Description)}
                          <script>
                            function updateHeight() {
                              const height = document.body.scrollHeight;
                              window.ReactNativeWebView.postMessage(height.toString());
                            }
                            
                            // Update height after content loads
                            if (document.readyState === 'loading') {
                              document.addEventListener('DOMContentLoaded', updateHeight);
                            } else {
                              updateHeight();
                            }
                            
                            // Also update on window resize or content changes
                            window.addEventListener('resize', updateHeight);
                            
                            // Use MutationObserver to detect content changes
                            if (typeof MutationObserver !== 'undefined') {
                              const observer = new MutationObserver(updateHeight);
                              observer.observe(document.body, { 
                                childList: true, 
                                subtree: true, 
                                attributes: true, 
                                characterData: true 
                              });
                            }
                          </script>
                        </body>
                      </html>
                    `,
                    baseUrl: 'about:blank',
                  }}
                  androidLayerType="software"
                  testID="webview"
                />
              </Box>
            </VStack>
          ) : null}

          {/* Creator Info */}
          {item.CreatorUserId ? (
            <HStack className="mb-6 items-center">
              <User size={18} color="#6B7280" />
              <Text className="ml-2 text-gray-600 dark:text-gray-300">
                {t('calendar.createdBy')}: {getCreatorName(item.CreatorUserId)}
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

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
  },
});
