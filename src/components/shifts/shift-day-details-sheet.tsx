import { format, parseISO } from 'date-fns';
import { AlertCircle, Calendar, CheckCircle, Clock, UserMinus, UserPlus, Users } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@/components/ui';
import { Alert, AlertText } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { BottomSheet, BottomSheetBackdrop, BottomSheetContent, BottomSheetHeader } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAuthStore } from '@/lib/auth';
import { type ShiftDayGroupNeedsResultData, type ShiftDaySignupResultData } from '@/models/v4/shifts/shiftDayResultData';
import { useShiftsStore } from '@/stores/shifts/store';

interface ShiftDayDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftDayDetailsSheet: React.FC<ShiftDayDetailsSheetProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { userId } = useAuthStore();

  const { selectedShiftDay, isShiftDayLoading, isSignupLoading, signupError, signupForShift, withdrawFromShift, clearSignupError } = useShiftsStore();

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
        return 'Regular';
      case 1:
        return 'Emergency';
      case 2:
        return 'Training';
      default:
        return 'Unknown';
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

  const isUserSignedUp = () => {
    if (!userId || !selectedShiftDay.Signups) return false;
    return selectedShiftDay.Signups.some((signup) => signup.UserId === userId);
  };

  const handleSignupToggle = async () => {
    if (!userId || !selectedShiftDay) return;

    try {
      if (isUserSignedUp()) {
        await withdrawFromShift(selectedShiftDay.ShiftDayId, userId);
      } else {
        await signupForShift(selectedShiftDay.ShiftDayId, userId);
      }
    } catch (error) {
      // Error is handled by the store
    }
  };

  const renderSignupButton = () => {
    const userSignedUp = isUserSignedUp();

    return (
      <Button
        onPress={handleSignupToggle}
        disabled={isSignupLoading}
        variant={userSignedUp ? 'outline' : 'solid'}
        className={`w-full ${userSignedUp ? 'border-red-300 bg-white dark:border-red-600 dark:bg-gray-800' : 'border-primary-600 bg-primary-600'}`}
      >
        <HStack className="items-center space-x-2">
          {isSignupLoading && <Spinner size="small" />}
          <Icon as={userSignedUp ? UserMinus : UserPlus} size={16} className={userSignedUp ? 'text-red-600 dark:text-red-400' : 'text-white'} />
          <ButtonText className={userSignedUp ? 'font-medium text-red-600 dark:text-red-400' : 'font-semibold text-white'}>{userSignedUp ? t('shifts.withdraw') : t('shifts.signup')}</ButtonText>
        </HStack>
      </Button>
    );
  };

  const renderGroupNeeds = (group: ShiftDayGroupNeedsResultData) => {
    if (!group.GroupNeeds || group.GroupNeeds.length === 0) return null;

    return (
      <Card key={group.GroupId} className="mb-3 bg-white dark:bg-gray-800">
        <CardContent className="p-4">
          <VStack className="space-y-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">{group.GroupName}</Text>

            <VStack className="space-y-2">
              {group.GroupNeeds.map((role) => (
                <HStack key={role.RoleId} className="items-center justify-between">
                  <Text className="text-sm text-gray-700 dark:text-gray-300">{role.RoleName}</Text>
                  <Badge className="border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900">
                    <Text className="text-xs text-blue-700 dark:text-blue-300">
                      {t('shifts.needs')}: {role.Needed}
                    </Text>
                  </Badge>
                </HStack>
              ))}
            </VStack>
          </VStack>
        </CardContent>
      </Card>
    );
  };

  const renderSignupsList = (signups: ShiftDaySignupResultData[]) => {
    if (!signups || signups.length === 0) {
      return <Text className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No signups yet</Text>;
    }

    return (
      <VStack className="space-y-2">
        {signups.map((signup, index) => (
          <HStack key={`${signup.UserId}-${index}`} className="items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <VStack className="flex-1">
              <Text className="text-sm font-medium text-gray-900 dark:text-white">{signup.Name}</Text>
              {signup.Roles && signup.Roles.length > 0 && <Text className="text-xs text-gray-600 dark:text-gray-400">Roles: {signup.Roles.join(', ')}</Text>}
            </VStack>

            {signup.UserId === userId && (
              <Badge className="border-green-200 bg-green-100 dark:border-green-700 dark:bg-green-900">
                <Text className="text-xs text-green-800 dark:text-green-200">You</Text>
              </Badge>
            )}
          </HStack>
        ))}
      </VStack>
    );
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <BottomSheetBackdrop onPress={onClose} />
      <BottomSheetContent className="h-[90%] bg-white dark:bg-gray-900">
        <BottomSheetHeader className="border-b border-gray-200 p-4 dark:border-gray-700">
          <Text className="text-center text-xl font-semibold text-gray-900 dark:text-white">{t('shifts.day_details')}</Text>
        </BottomSheetHeader>

        <ScrollView className="flex-1">
          <VStack className="space-y-6 p-4">
            {/* Error Alert */}
            {signupError && (
              <Alert variant="destructive" className="mb-4">
                <Icon as={AlertCircle} className="text-destructive-600" size={16} />
                <AlertText className="ml-2">{signupError}</AlertText>
                <Button onPress={clearSignupError} variant="ghost" size="sm" className="ml-auto">
                  <ButtonText>✕</ButtonText>
                </Button>
              </Alert>
            )}

            {/* Header */}
            <VStack className="space-y-3">
              <HStack className="items-start justify-between">
                <VStack className="mr-3 flex-1">
                  <Text className="text-2xl font-bold text-gray-900 dark:text-white">{selectedShiftDay.ShiftName}</Text>
                  <Text className="text-lg text-gray-600 dark:text-gray-400">{formatDate(selectedShiftDay.ShiftDay)}</Text>
                </VStack>

                {selectedShiftDay.SignedUp ? (
                  <Badge className="border-green-200 bg-green-100 dark:border-green-700 dark:bg-green-900">
                    <HStack className="items-center space-x-1">
                      <Icon as={CheckCircle} size={14} className="text-green-600 dark:text-green-400" />
                      <Text className="text-sm font-medium text-green-800 dark:text-green-200">{t('shifts.you_are_signed_up')}</Text>
                    </HStack>
                  </Badge>
                ) : (
                  <Badge className="border-orange-200 bg-orange-100 dark:border-orange-700 dark:bg-orange-900">
                    <HStack className="items-center space-x-1">
                      <Icon as={AlertCircle} size={14} className="text-orange-600 dark:text-orange-400" />
                      <Text className="text-sm font-medium text-orange-800 dark:text-orange-200">Available</Text>
                    </HStack>
                  </Badge>
                )}
              </HStack>
            </VStack>

            {/* Time Information */}
            <Card className="bg-blue-50 dark:bg-blue-900">
              <CardContent className="p-4">
                <HStack className="items-center space-x-3">
                  <Icon as={Clock} size={24} className="text-blue-600 dark:text-blue-400" />
                  <VStack className="flex-1">
                    <Text className="text-base font-medium text-blue-900 dark:text-blue-100">{t('shifts.scheduled_for')}</Text>
                    <Text className="text-sm text-blue-700 dark:text-blue-300">
                      {formatTime(selectedShiftDay.Start)} - {formatTime(selectedShiftDay.End)}
                    </Text>
                  </VStack>

                  <Badge className="border-blue-200 bg-blue-100 dark:border-blue-600 dark:bg-blue-800">
                    <Text className="text-xs text-blue-800 dark:text-blue-200">{getShiftTypeText(selectedShiftDay.ShiftType)}</Text>
                  </Badge>
                </HStack>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-4">
                <VStack className="space-y-3">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.signups')} Status</Text>

                  <HStack className="items-center justify-between">
                    <HStack className="items-center space-x-2">
                      <Icon as={Users} size={20} className="text-primary-600" />
                      <Text className="text-base text-gray-700 dark:text-gray-300">
                        {getTotalSignups()} / {getTotalNeeds()} {t('shifts.signups')}
                      </Text>
                    </HStack>

                    <Text className="text-sm font-medium text-primary-600">{getTotalNeeds() > 0 ? Math.round((getTotalSignups() / getTotalNeeds()) * 100) : 0}%</Text>
                  </HStack>

                  {/* Progress Bar */}
                  <View className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <View
                      className="h-3 rounded-full bg-primary-600"
                      style={{
                        width: `${getTotalNeeds() > 0 ? (getTotalSignups() / getTotalNeeds()) * 100 : 0}%`,
                      }}
                    />
                  </View>
                </VStack>
              </CardContent>
            </Card>

            {/* Signup Button */}
            {renderSignupButton()}

            {/* Group Needs */}
            {selectedShiftDay.Needs && selectedShiftDay.Needs.length > 0 && (
              <VStack className="space-y-3">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.needs')}</Text>
                {selectedShiftDay.Needs.map(renderGroupNeeds)}
              </VStack>
            )}

            {/* Current Signups */}
            <VStack className="space-y-3">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Current {t('shifts.signups')} ({getTotalSignups()})
              </Text>
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4">{renderSignupsList(selectedShiftDay.Signups || [])}</CardContent>
              </Card>
            </VStack>
          </VStack>
        </ScrollView>
      </BottomSheetContent>
    </BottomSheet>
  );
};
