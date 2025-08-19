import { Calendar, IdCard, Mail, Phone, Tag, Users, X } from 'lucide-react-native';
import React from 'react';

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

export const PersonnelDetailsSheet: React.FC = () => {
  const { personnel, selectedPersonnelId, isDetailsOpen, closeDetails } = usePersonnelStore();
  const { canUserViewPII } = useSecurityStore();

  const selectedPersonnel = personnel?.find((person) => person.UserId === selectedPersonnelId);

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

          <VStack space="md" className="flex-1">
            {/* Identification Number */}
            {selectedPersonnel.IdentificationNumber ? (
              <HStack space="xs" className="items-center">
                <IdCard size={18} className="text-gray-600 dark:text-gray-400" />
                <Text className="text-gray-700 dark:text-gray-300">ID: {selectedPersonnel.IdentificationNumber}</Text>
              </HStack>
            ) : null}

            {/* Contact Information Section */}
            {canUserViewPII ? (
              <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                <Text className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">Contact Information</Text>
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
                <Text className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">Group</Text>
                <HStack space="xs" className="items-center">
                  <Users size={16} className="text-gray-600 dark:text-gray-400" />
                  <Text className="text-gray-700 dark:text-gray-300">{selectedPersonnel.GroupName}</Text>
                </HStack>
              </Box>
            ) : null}

            {/* Status Information */}
            <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <Text className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">Current Status</Text>
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

                {selectedPersonnel.StatusTimestamp ? (
                  <HStack space="xs" className="items-center">
                    <Calendar size={16} className="text-gray-600 dark:text-gray-400" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400">{formatDateForDisplay(parseDateISOString(selectedPersonnel.StatusTimestamp), 'yyyy-MM-dd HH:mm Z')}</Text>
                  </HStack>
                ) : null}
              </VStack>
            </Box>

            {/* Staffing Information */}
            {selectedPersonnel.Staffing ? (
              <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                <Text className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">Staffing</Text>
                <VStack space="xs">
                  <HStack className="flex-wrap">
                    <Badge className="mb-1 mr-1" style={{ backgroundColor: selectedPersonnel.StaffingColor || '#10B981' }}>
                      <Text className="text-xs text-white">{selectedPersonnel.Staffing}</Text>
                    </Badge>
                  </HStack>

                  {selectedPersonnel.StaffingTimestamp ? (
                    <HStack space="xs" className="items-center">
                      <Calendar size={16} className="text-gray-600 dark:text-gray-400" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400">{formatDateForDisplay(parseDateISOString(selectedPersonnel.StaffingTimestamp), 'yyyy-MM-dd HH:mm Z')}</Text>
                    </HStack>
                  ) : null}
                </VStack>
              </Box>
            ) : null}

            {/* Roles */}
            {selectedPersonnel.Roles && selectedPersonnel.Roles.length > 0 ? (
              <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                <Text className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">Roles</Text>
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
        </Box>
      </ActionsheetContent>
    </Actionsheet>
  );
};
