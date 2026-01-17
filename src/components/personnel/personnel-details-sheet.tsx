import { Calendar, IdCard, Mail, Phone, Tag, Users, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { useAnalytics } from '@/hooks/use-analytics';
import { formatDateForDisplay, parseDateISOString } from '@/lib/utils';
import { usePersonnelStore } from '@/stores/personnel/store';
import { useSecurityStore } from '@/stores/security/store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Badge } from '../ui/badge';
import { Box } from '../ui/box';
import { Button } from '../ui/button';
import { Divider } from '../ui/divider';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

/**
 * Safely formats a timestamp string with error handling.
 * Returns formatted date string on success, empty string on failure.
 */
const safeFormatTimestamp = (timestamp: string | undefined | null, format: string): string => {
  if (!timestamp) return '';

  try {
    const parsed = parseDateISOString(timestamp);
    return formatDateForDisplay(parsed, format);
  } catch (error) {
    console.warn('Failed to parse timestamp:', timestamp, error);
    return '';
  }
};

export const PersonnelDetailsSheet: React.FC = () => {
  const { t } = useTranslation();
  const { personnel, selectedPersonnelId, isDetailsOpen, closeDetails } = usePersonnelStore();
  const { canUserViewPII } = useSecurityStore();
  const { trackEvent } = useAnalytics();

  const selectedPersonnel = personnel?.find((person) => person.UserId === selectedPersonnelId);

  // Cache formatted timestamps to avoid double parsing
  const formattedStatusTimestamp = useMemo(
    () => safeFormatTimestamp(selectedPersonnel?.StatusTimestamp, 'yyyy-MM-dd HH:mm Z'),
    [selectedPersonnel?.StatusTimestamp]
  );

  const formattedStaffingTimestamp = useMemo(
    () => safeFormatTimestamp(selectedPersonnel?.StaffingTimestamp, 'yyyy-MM-dd HH:mm Z'),
    [selectedPersonnel?.StaffingTimestamp]
  );

  // Track analytics when sheet becomes visible
  const trackViewAnalytics = useCallback(() => {
    if (!selectedPersonnel) return;

    try {
      const hasContactInfo = !!(selectedPersonnel.EmailAddress || selectedPersonnel.MobilePhone);
      const hasGroupInfo = !!selectedPersonnel.GroupName;
      const hasStatus = !!selectedPersonnel.Status;
      const hasStaffing = !!selectedPersonnel.Staffing;
      const hasRoles = !!(selectedPersonnel.Roles && selectedPersonnel.Roles.length > 0);
      const hasIdentificationNumber = !!selectedPersonnel.IdentificationNumber;

      trackEvent('personnel_details_sheet_viewed', {
        timestamp: new Date().toISOString(),
        personnelId: selectedPersonnel.UserId,
        hasContactInfo,
        hasGroupInfo,
        hasStatus,
        hasStaffing,
        hasRoles,
        hasIdentificationNumber,
        roleCount: selectedPersonnel.Roles?.length || 0,
        canViewPII: !!canUserViewPII,
      });
    } catch (error) {
      // Analytics errors should not break the component
      console.warn('Failed to track personnel details sheet view analytics:', error);
    }
  }, [trackEvent, selectedPersonnel, canUserViewPII]);

  useEffect(() => {
    if (isDetailsOpen && selectedPersonnel) {
      trackViewAnalytics();
    }
  }, [isDetailsOpen, selectedPersonnel, trackViewAnalytics]);

  if (!selectedPersonnel || !isDetailsOpen) return null;

  const fullName = `${selectedPersonnel.FirstName} ${selectedPersonnel.LastName}`.trim();

  return (
    <Actionsheet isOpen={isDetailsOpen} onClose={closeDetails} snapPoints={[67]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="w-full rounded-t-xl bg-white dark:bg-gray-800">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <Box className="w-full flex-1 p-4">
          <HStack className="mb-4 items-center justify-between">
            <Heading size="lg" className="text-gray-800 dark:text-gray-100">
              {fullName}
            </Heading>
            <Button variant="link" onPress={closeDetails} className="p-1" testID="close-button">
              <X size={24} className="text-gray-600 dark:text-gray-400" />
            </Button>
          </HStack>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <VStack space="md" className="flex-1">
              {/* Identification Number */}
              {selectedPersonnel.IdentificationNumber ? (
                <HStack space="xs" className="items-center">
                  <IdCard size={18} className="text-gray-600 dark:text-gray-400" />
                  <Text className="text-gray-700 dark:text-gray-300">
                    {t('personnel.id')}: {selectedPersonnel.IdentificationNumber}
                  </Text>
                </HStack>
              ) : null}

              {/* Contact Information Section */}
              {canUserViewPII ? (
                <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                  <Text className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">{t('personnel.contactInformation')}</Text>
                  <VStack space="xs">
                    {selectedPersonnel.EmailAddress ? (
                      <HStack space="xs" className="items-center">
                        <Mail size={16} className="text-gray-600 dark:text-gray-400" />
                        <Text className="text-gray-700 dark:text-gray-300">{selectedPersonnel.EmailAddress}</Text>
                      </HStack>
                    ) : null}

                    {selectedPersonnel.MobilePhone ? (
                      <HStack space="xs" className="items-center">
                        <Phone size={16} className="text-gray-600 dark:text-gray-400" />
                        <Text className="text-gray-700 dark:text-gray-300">{selectedPersonnel.MobilePhone}</Text>
                      </HStack>
                    ) : null}
                  </VStack>
                </Box>
              ) : null}

              {/* Group Information */}
              {selectedPersonnel.GroupName ? (
                <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                  <Text className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">{t('personnel.group')}</Text>
                  <HStack space="xs" className="items-center">
                    <Users size={16} className="text-gray-600 dark:text-gray-400" />
                    <Text className="text-gray-700 dark:text-gray-300">{selectedPersonnel.GroupName}</Text>
                  </HStack>
                </Box>
              ) : null}

              {/* Status Information */}
              <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                <Text className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">{t('personnel.currentStatus')}</Text>
                <VStack space="xs">
                  {selectedPersonnel.Status ? (
                    <HStack className="flex-wrap">
                      <Badge className="mb-1 mr-1" style={{ backgroundColor: selectedPersonnel.StatusColor || '#3B82F6' }}>
                        <Text className="text-xs text-white">{selectedPersonnel.Status}</Text>
                      </Badge>
                      {selectedPersonnel.StatusDestinationName ? (
                        <Badge className="mb-1 mr-1 bg-blue-100 dark:bg-blue-900">
                          <Text className="text-xs text-blue-800 dark:text-blue-100">{selectedPersonnel.StatusDestinationName}</Text>
                        </Badge>
                      ) : null}
                    </HStack>
                  ) : null}

                  {formattedStatusTimestamp ? (
                    <HStack space="xs" className="items-center">
                      <Calendar size={16} className="text-gray-600 dark:text-gray-400" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400">{formattedStatusTimestamp}</Text>
                    </HStack>
                  ) : null}
                </VStack>
              </Box>

              {/* Staffing Information */}
              {selectedPersonnel.Staffing ? (
                <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                  <Text className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">{t('personnel.staffing')}</Text>
                  <VStack space="xs">
                    <HStack className="flex-wrap">
                      <Badge className="mb-1 mr-1" style={{ backgroundColor: selectedPersonnel.StaffingColor || '#10B981' }}>
                        <Text className="text-xs text-white">{selectedPersonnel.Staffing}</Text>
                      </Badge>
                    </HStack>

                    {formattedStaffingTimestamp ? (
                      <HStack space="xs" className="items-center">
                        <Calendar size={16} className="text-gray-600 dark:text-gray-400" />
                        <Text className="text-sm text-gray-600 dark:text-gray-400">{formattedStaffingTimestamp}</Text>
                      </HStack>
                    ) : null}
                  </VStack>
                </Box>
              ) : null}

              {/* Roles */}
              {selectedPersonnel.Roles && selectedPersonnel.Roles.length > 0 ? (
                <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                  <Text className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">{t('personnel.roles')}</Text>
                  <HStack space="xs" className="items-center">
                    <Tag size={16} className="text-gray-600 dark:text-gray-400" />
                    <HStack className="flex-wrap">
                      {selectedPersonnel.Roles.map((role, index) => (
                        <Badge key={index} className="mb-1 mr-1 bg-gray-100 dark:bg-gray-700">
                          <Text className="text-xs text-gray-800 dark:text-gray-100">{role}</Text>
                        </Badge>
                      ))}
                    </HStack>
                  </HStack>
                </Box>
              ) : null}

              <Divider />
            </VStack>
          </ScrollView>
        </Box>
      </ActionsheetContent>
    </Actionsheet>
  );
};
