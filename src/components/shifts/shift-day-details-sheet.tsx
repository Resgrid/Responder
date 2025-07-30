import { format, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, UserPlus, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAuthStore } from '@/lib/auth';
import { type ShiftDayGroupNeedsResultData, type ShiftDaySignupResultData } from '@/models/v4/shifts/shiftDayResultData';
import { useShiftsStore } from '@/stores/shifts/store';
import { useToastStore } from '@/stores/toast/store';

interface ShiftDayDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftDayDetailsSheet: React.FC<ShiftDayDetailsSheetProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { userId } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const showToast = useToastStore((state) => state.showToast);

  const { selectedShiftDay, isShiftDayLoading, isSignupLoading, signupForShift } = useShiftsStore();

  if (!selectedShiftDay) return null;

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    try {
      return format(parseISO(timeString), 'h:mm a');
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'EEEE, MMMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getShiftTypeText = (shiftType: number) => {
    switch (shiftType) {
      case 0:
        return t('shifts.type_regular');
      case 1:
        return t('shifts.type_emergency');
      case 2:
        return t('shifts.type_training');
      default:
        return t('shifts.type_unknown');
    }
  };

  const getTotalSignups = () => {
    return selectedShiftDay.Signups?.length || 0;
  };

  const getTotalNeeds = () => {
    return (
      selectedShiftDay.Needs?.reduce((total, group) => {
        return (
          total +
          (group.GroupNeeds?.reduce((groupTotal, role) => {
            return groupTotal + (role.Needed || 0);
          }, 0) || 0)
        );
      }, 0) || 0
    );
  };

  const hasAvailableNeeds = () => {
    return selectedShiftDay.Needs && selectedShiftDay.Needs.length > 0 && getTotalNeeds() > 0;
  };

  const isUserSignedUp = () => {
    if (!userId || !selectedShiftDay.Signups) return false;
    return selectedShiftDay.Signups.some((signup) => signup.UserId === userId);
  };

  const canUserSignUp = () => {
    return hasAvailableNeeds() && !isUserSignedUp();
  };

  const handleSignup = async () => {
    if (!userId || !selectedShiftDay || !canUserSignUp()) return;

    try {
      await signupForShift(selectedShiftDay.ShiftDayId, userId);
      showToast('success', t('shifts.signup_success'));
      onClose();
    } catch (error) {
      showToast('error', t('shifts.signup_error'));
    }
  };

  const renderGroupNeeds = (group: ShiftDayGroupNeedsResultData) => {
    if (!group.GroupNeeds || group.GroupNeeds.length === 0) return null;

    return (
      <Card key={group.GroupId} className="mb-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <Text className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">{group.GroupName}</Text>

        <VStack space="sm">
          {group.GroupNeeds.map((role) => (
            <HStack key={role.RoleId} className="items-center justify-between">
              <Text className="text-sm text-gray-700 dark:text-gray-300">{role.RoleName}</Text>
              <Box className="rounded-full bg-blue-100 px-2 py-1 dark:bg-blue-900">
                <Text className="text-xs font-medium text-blue-800 dark:text-blue-200">
                  {t('shifts.needed')}: {role.Needed}
                </Text>
              </Box>
            </HStack>
          ))}
        </VStack>
      </Card>
    );
  };

  const renderSignupsList = (signups: ShiftDaySignupResultData[]) => {
    if (!signups || signups.length === 0) {
      return (
        <Box className="py-8 text-center">
          <Text className="text-sm text-gray-500 dark:text-gray-400">{t('shifts.no_signups_yet')}</Text>
        </Box>
      );
    }

    return (
      <VStack space="sm">
        {signups.map((signup, index) => (
          <HStack key={`${signup.UserId}-${index}`} className="items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
            <VStack className="flex-1">
              <Text className="text-sm font-medium text-gray-900 dark:text-white">{signup.Name}</Text>
              {signup.Roles && signup.Roles.length > 0 && (
                <Text className="text-xs text-gray-600 dark:text-gray-400">
                  {t('shifts.roles')}: {signup.Roles.join(', ')}
                </Text>
              )}
            </VStack>

            {signup.UserId === userId && (
              <Box className="rounded-full bg-green-100 px-2 py-1 dark:bg-green-900">
                <Text className="text-xs font-medium text-green-800 dark:text-green-200">{t('shifts.you')}</Text>
              </Box>
            )}
          </HStack>
        ))}
      </VStack>
    );
  };

  return (
    <CustomBottomSheet isOpen={isOpen} onClose={onClose} isLoading={isShiftDayLoading} loadingText={t('shifts.loading_details')}>
      <ScrollView className="flex-1">
        <VStack space="lg" className="p-4">
          {/* Header */}
          <VStack space="sm">
            <HStack className="items-start justify-between">
              <VStack className="mr-3 flex-1" space="xs">
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">{selectedShiftDay.ShiftName}</Text>
                <Text className="text-lg text-gray-600 dark:text-gray-400">{formatDate(selectedShiftDay.ShiftDay)}</Text>
              </VStack>

              {selectedShiftDay.SignedUp ? (
                <Box className="rounded-full bg-green-100 px-3 py-1 dark:bg-green-900">
                  <HStack className="items-center" space="xs">
                    <CheckCircle size={14} color={colorScheme === 'dark' ? '#10b981' : '#059669'} />
                    <Text className="text-sm font-medium text-green-800 dark:text-green-200">{t('shifts.signed_up')}</Text>
                  </HStack>
                </Box>
              ) : (
                <Box className="rounded-full bg-orange-100 px-3 py-1 dark:bg-orange-900">
                  <HStack className="items-center" space="xs">
                    <AlertCircle size={14} color={colorScheme === 'dark' ? '#f59e0b' : '#d97706'} />
                    <Text className="text-sm font-medium text-orange-800 dark:text-orange-200">{t('shifts.available')}</Text>
                  </HStack>
                </Box>
              )}
            </HStack>
          </VStack>

          {/* Time Information */}
          <Card className="bg-blue-50 dark:bg-blue-900/30">
            <Box className="p-4">
              <HStack className="items-center" space="md">
                <Clock size={24} color={colorScheme === 'dark' ? '#60a5fa' : '#2563eb'} />
                <VStack className="flex-1" space="xs">
                  <Text className="text-base font-medium text-blue-900 dark:text-blue-100">{t('shifts.scheduled_for')}</Text>
                  <Text className="text-sm text-blue-700 dark:text-blue-300">
                    {formatTime(selectedShiftDay.Start)} - {formatTime(selectedShiftDay.End)}
                  </Text>
                </VStack>

                <Box className="rounded-full bg-blue-100 px-2 py-1 dark:bg-blue-800">
                  <Text className="text-xs font-medium text-blue-800 dark:text-blue-200">{getShiftTypeText(selectedShiftDay.ShiftType)}</Text>
                </Box>
              </HStack>
            </Box>
          </Card>

          {/* Stats */}
          <Card>
            <Box className="p-4">
              <VStack space="md">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.signup_status')}</Text>

                <HStack className="items-center justify-between">
                  <HStack className="items-center" space="sm">
                    <Users size={20} color={colorScheme === 'dark' ? '#60a5fa' : '#2563eb'} />
                    <Text className="text-base text-gray-700 dark:text-gray-300">
                      {getTotalSignups()} / {getTotalNeeds()} {t('shifts.signups')}
                    </Text>
                  </HStack>

                  <Text className="text-sm font-medium text-blue-600 dark:text-blue-400">{getTotalNeeds() > 0 ? Math.round((getTotalSignups() / getTotalNeeds()) * 100) : 0}%</Text>
                </HStack>

                {/* Progress Bar */}
                <Box className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <Box
                    className="h-2 rounded-full bg-blue-600"
                    style={{
                      width: `${getTotalNeeds() > 0 ? (getTotalSignups() / getTotalNeeds()) * 100 : 0}%`,
                    }}
                  />
                </Box>
              </VStack>
            </Box>
          </Card>

          {/* Signup Button */}
          {hasAvailableNeeds() ? (
            <Button onPress={handleSignup} disabled={isSignupLoading || isUserSignedUp()} className={`w-full ${isUserSignedUp() ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              <HStack className="items-center" space="sm">
                {isSignupLoading && <Spinner size="small" />}
                <UserPlus size={16} color={isUserSignedUp() ? (colorScheme === 'dark' ? '#9ca3af' : '#6b7280') : 'white'} />
                <ButtonText className={`font-semibold ${isUserSignedUp() ? 'text-gray-600 dark:text-gray-400' : 'text-white'}`}>{isUserSignedUp() ? t('shifts.already_signed_up') : t('shifts.signup')}</ButtonText>
              </HStack>
            </Button>
          ) : (
            <Box className="rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
              <HStack className="items-center" space="sm">
                <AlertCircle size={16} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                <Text className="text-sm text-gray-600 dark:text-gray-400">{t('shifts.no_positions_available')}</Text>
              </HStack>
            </Box>
          )}

          {/* Group Needs */}
          {selectedShiftDay.Needs && selectedShiftDay.Needs.length > 0 && (
            <VStack space="sm">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.position_needs')}</Text>
              {selectedShiftDay.Needs.map(renderGroupNeeds)}
            </VStack>
          )}

          {/* Current Signups */}
          <VStack space="sm">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('shifts.current_signups')} ({getTotalSignups()})
            </Text>
            <Card>
              <Box className="p-4">{renderSignupsList(selectedShiftDay.Signups || [])}</Box>
            </Card>
          </VStack>
        </VStack>
      </ScrollView>
    </CustomBottomSheet>
  );
};
