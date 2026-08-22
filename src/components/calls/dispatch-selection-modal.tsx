import { CheckIcon, SearchIcon, UsersIcon, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, TouchableOpacity } from 'react-native';

import { Loading } from '@/components/common/loading';
import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '@/components/ui/actionsheet';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { type DispatchSelection, useDispatchStore } from '@/stores/dispatch/store';

interface DispatchSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (selection: DispatchSelection) => void;
  initialSelection?: DispatchSelection;
}

export const DispatchSelectionModal: React.FC<DispatchSelectionModalProps> = ({ isVisible, onClose, onConfirm, initialSelection }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { trackEvent } = useAnalytics();
  const keyboardHeight = useKeyboardHeight();
  const wasModalOpenRef = useRef(false);

  const { data, selection, isLoading, error, searchQuery, fetchDispatchData, refreshDispatchData, setSelection, toggleEveryone, toggleUser, toggleGroup, toggleRole, toggleUnit, setSearchQuery, clearSelection } =
    useDispatchStore();

  // Calculate filtered data directly in component to ensure reactivity
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return data;
    }

    const query = searchQuery.toLowerCase();
    return {
      users: data.users.filter((user) => user.Name.toLowerCase().includes(query)),
      groups: data.groups.filter((group) => group.Name.toLowerCase().includes(query)),
      roles: data.roles.filter((role) => role.Name.toLowerCase().includes(query)),
      units: data.units.filter((unit) => unit.Name.toLowerCase().includes(query)),
    };
  }, [data, searchQuery]);

  // Track analytics when modal becomes visible
  const trackViewAnalytics = useCallback(() => {
    try {
      trackEvent('dispatch_selection_modal_viewed', {
        timestamp: new Date().toISOString(),
        userCount: data.users.length,
        groupCount: data.groups.length,
        roleCount: data.roles.length,
        unitCount: data.units.length,
        isLoading,
        hasInitialSelection: !!initialSelection,
      });
    } catch (error) {
      // Analytics errors should not break the component
      console.warn('Failed to track dispatch selection modal view analytics:', error);
    }
  }, [trackEvent, data.users.length, data.groups.length, data.roles.length, data.units.length, isLoading, initialSelection]);

  useEffect(() => {
    if (isVisible && !wasModalOpenRef.current) {
      wasModalOpenRef.current = true;

      // Always fetch data when modal opens
      fetchDispatchData();

      if (initialSelection) {
        setSelection(initialSelection);
      }
      trackViewAnalytics();
    } else if (!isVisible) {
      wasModalOpenRef.current = false;
    }
  }, [isVisible, initialSelection, fetchDispatchData, setSelection, trackViewAnalytics]);

  const handleToggleEveryone = useCallback(() => {
    const wasSelected = selection.everyone;
    toggleEveryone();
    try {
      trackEvent('dispatch_selection_everyone_toggled', {
        timestamp: new Date().toISOString(),
        wasSelected,
        newState: !wasSelected,
      });
    } catch (error) {
      console.warn('Failed to track everyone toggle analytics:', error);
    }
  }, [toggleEveryone, selection.everyone, trackEvent]);

  const handleToggleUser = useCallback(
    (userId: string) => {
      const wasSelected = selection.users.includes(userId);
      toggleUser(userId);
      try {
        trackEvent('dispatch_selection_user_toggled', {
          timestamp: new Date().toISOString(),
          userId,
          wasSelected,
          newState: !wasSelected,
          currentSelectionCount: selection.users.length,
        });
      } catch (error) {
        console.warn('Failed to track user toggle analytics:', error);
      }
    },
    [toggleUser, selection.users, trackEvent]
  );

  const handleToggleGroup = useCallback(
    (groupId: string) => {
      const wasSelected = selection.groups.includes(groupId);
      toggleGroup(groupId);
      try {
        trackEvent('dispatch_selection_group_toggled', {
          timestamp: new Date().toISOString(),
          groupId,
          wasSelected,
          newState: !wasSelected,
          currentSelectionCount: selection.groups.length,
        });
      } catch (error) {
        console.warn('Failed to track group toggle analytics:', error);
      }
    },
    [toggleGroup, selection.groups, trackEvent]
  );

  const handleToggleRole = useCallback(
    (roleId: string) => {
      const wasSelected = selection.roles.includes(roleId);
      toggleRole(roleId);
      try {
        trackEvent('dispatch_selection_role_toggled', {
          timestamp: new Date().toISOString(),
          roleId,
          wasSelected,
          newState: !wasSelected,
          currentSelectionCount: selection.roles.length,
        });
      } catch (error) {
        console.warn('Failed to track role toggle analytics:', error);
      }
    },
    [toggleRole, selection.roles, trackEvent]
  );

  const handleToggleUnit = useCallback(
    (unitId: string) => {
      const wasSelected = selection.units.includes(unitId);
      toggleUnit(unitId);
      try {
        trackEvent('dispatch_selection_unit_toggled', {
          timestamp: new Date().toISOString(),
          unitId,
          wasSelected,
          newState: !wasSelected,
          currentSelectionCount: selection.units.length,
        });
      } catch (error) {
        console.warn('Failed to track unit toggle analytics:', error);
      }
    },
    [toggleUnit, selection.units, trackEvent]
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      try {
        trackEvent('dispatch_selection_search', {
          timestamp: new Date().toISOString(),
          searchQuery: query,
          searchLength: query.length,
        });
      } catch (error) {
        console.warn('Failed to track search analytics:', error);
      }
    },
    [setSearchQuery, trackEvent]
  );

  const handleConfirm = () => {
    try {
      trackEvent('dispatch_selection_confirmed', {
        timestamp: new Date().toISOString(),
        selectionCount: getSelectionCount(),
        everyoneSelected: selection.everyone,
        usersSelected: selection.users.length,
        groupsSelected: selection.groups.length,
        rolesSelected: selection.roles.length,
        unitsSelected: selection.units.length,
        hasSearchQuery: !!searchQuery,
      });
    } catch (error) {
      console.warn('Failed to track dispatch selection confirm analytics:', error);
    }
    onConfirm(selection);
    onClose();
  };

  const handleCancel = () => {
    try {
      trackEvent('dispatch_selection_cancelled', {
        timestamp: new Date().toISOString(),
        selectionCount: getSelectionCount(),
        wasModalOpen: wasModalOpenRef.current,
      });
    } catch (error) {
      console.warn('Failed to track dispatch selection cancel analytics:', error);
    }
    clearSelection();
    onClose();
  };

  const getSelectionCount = () => {
    if (selection.everyone) return 1;
    return selection.users.length + selection.groups.length + selection.roles.length + selection.units.length;
  };

  return (
    <Actionsheet isOpen={isVisible} onClose={handleCancel} snapPoints={[80]}>
      <ActionsheetBackdrop />
      {/* Single sanctioned keyboard mechanism for sheets: pad the sheet by the keyboard
          height so the search field and the results under it stay visible. Never nest a
          KeyboardAvoidingView here — see use-keyboard-height.ts. */}
      <ActionsheetContent className="w-full bg-white dark:bg-gray-900" style={{ paddingBottom: keyboardHeight }}>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        {/* Header */}
        <HStack className="w-full items-center justify-between border-b border-gray-200 p-2 pb-3 dark:border-gray-700">
          <HStack className="flex-1 items-center">
            <UsersIcon size={22} color={colorScheme === 'dark' ? '#d1d5db' : '#374151'} />
            <Text className="pl-3 text-lg font-bold" numberOfLines={1}>
              {t('calls.select_dispatch_recipients')}
            </Text>
          </HStack>
          <TouchableOpacity onPress={handleCancel} className="p-1">
            <X size={22} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
          </TouchableOpacity>
        </HStack>

        {/* Search */}
        <Box className="w-full px-2 py-3">
          <Input>
            <SearchIcon size={20} className="ml-3 mr-2 text-neutral-500" />
            <InputField placeholder={t('common.search')} value={searchQuery} onChangeText={handleSearchChange} className="flex-1" />
          </Input>
        </Box>

        {/* Content */}
        {isLoading ? (
          <Box className="w-full flex-1 items-center justify-center">
            <Loading />
          </Box>
        ) : error ? (
          <Box className="w-full flex-1 items-center justify-center p-4">
            <Text className="text-center text-red-500">{error}</Text>
            <Button variant="outline" className="mt-4" onPress={() => refreshDispatchData()}>
              <ButtonText>{t('common.retry')}</ButtonText>
            </Button>
          </Box>
        ) : (
          <ScrollView className="w-full flex-1 px-2" keyboardShouldPersistTaps="handled">
            {/* Everyone Option */}
            <Card className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <TouchableOpacity onPress={handleToggleEveryone}>
                <HStack className="items-center space-x-3">
                  <Box className={`size-6 items-center justify-center rounded border-2 ${selection.everyone ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {selection.everyone ? <CheckIcon size={16} color="#ffffff" /> : null}
                  </Box>
                  <VStack className="flex-1">
                    <Text className="pl-4 text-lg font-semibold">{t('calls.everyone')}</Text>
                    <Text className="pl-4 text-sm text-neutral-500">{t('calls.dispatch_to_everyone')}</Text>
                  </VStack>
                </HStack>
              </TouchableOpacity>
            </Card>

            {/* Groups Section */}
            {filteredData.groups.length > 0 && (
              <VStack className="mb-6">
                <Text className="mb-3 text-lg font-semibold">
                  {t('calls.groups')} ({filteredData.groups.length})
                </Text>
                {filteredData.groups.map((group) => (
                  <Card key={`group-${group.Id}`} className="mb-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <TouchableOpacity onPress={() => handleToggleGroup(group.Id)}>
                      <HStack className="items-center space-x-3">
                        <Box className={`size-5 items-center justify-center rounded border-2 ${selection.groups.includes(group.Id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                          {selection.groups.includes(group.Id) ? <CheckIcon size={12} color="#ffffff" /> : null}
                        </Box>
                        <VStack className="flex-1">
                          <Text className="pl-4 font-medium">{group.Name}</Text>
                        </VStack>
                      </HStack>
                    </TouchableOpacity>
                  </Card>
                ))}
              </VStack>
            )}

            {/* Units Section */}
            {filteredData.units.length > 0 && (
              <VStack className="mb-6">
                <Text className="mb-3 text-lg font-semibold">
                  {t('calls.units')} ({filteredData.units.length})
                </Text>
                {filteredData.units.map((unit) => (
                  <Card key={`unit-${unit.Id}`} className="mb-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <TouchableOpacity onPress={() => handleToggleUnit(unit.Id)}>
                      <HStack className="items-center space-x-3">
                        <Box className={`size-5 items-center justify-center rounded border-2 ${selection.units.includes(unit.Id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                          {selection.units.includes(unit.Id) ? <CheckIcon size={12} color="#ffffff" /> : null}
                        </Box>
                        <VStack className="flex-1">
                          <Text className="pl-4 font-medium">{unit.Name}</Text>
                        </VStack>
                      </HStack>
                    </TouchableOpacity>
                  </Card>
                ))}
              </VStack>
            )}

            {/* Roles Section */}
            {filteredData.roles.length > 0 && (
              <VStack className="mb-6">
                <Text className="mb-3 text-lg font-semibold">
                  {t('calls.roles')} ({filteredData.roles.length})
                </Text>
                {filteredData.roles.map((role) => (
                  <Card key={`role-${role.Id}`} className="mb-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <TouchableOpacity onPress={() => handleToggleRole(role.Id)}>
                      <HStack className="items-center space-x-3">
                        <Box className={`size-5 items-center justify-center rounded border-2 ${selection.roles.includes(role.Id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                          {selection.roles.includes(role.Id) ? <CheckIcon size={12} color="#ffffff" /> : null}
                        </Box>
                        <VStack className="flex-1">
                          <Text className="pl-4 font-medium">{role.Name}</Text>
                        </VStack>
                      </HStack>
                    </TouchableOpacity>
                  </Card>
                ))}
              </VStack>
            )}

            {/* Users Section */}
            {filteredData.users.length > 0 && (
              <VStack className="mb-6">
                <Text className="mb-3 text-lg font-semibold">
                  {t('calls.users')} ({filteredData.users.length})
                </Text>
                {filteredData.users.map((user) => (
                  <Card key={`user-${user.Id}`} className="mb-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <TouchableOpacity onPress={() => handleToggleUser(user.Id)}>
                      <HStack className="items-center space-x-3">
                        <Box className={`size-5 items-center justify-center rounded border-2 ${selection.users.includes(user.Id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                          {selection.users.includes(user.Id) ? <CheckIcon size={12} color="#ffffff" /> : null}
                        </Box>
                        <VStack className="flex-1">
                          <Text className="pl-4 font-medium">{user.Name}</Text>
                        </VStack>
                      </HStack>
                    </TouchableOpacity>
                  </Card>
                ))}
              </VStack>
            )}

            {/* No Results or Empty Data */}
            {!isLoading && !error && searchQuery && filteredData.users.length === 0 && filteredData.groups.length === 0 && filteredData.roles.length === 0 && filteredData.units.length === 0 && (
              <Box className="items-center justify-center py-8">
                <Text className="text-center text-neutral-500">{t('common.no_results_found')}</Text>
              </Box>
            )}

            {/* Empty State - No recipients available */}
            {!isLoading && !error && !searchQuery && data.users.length === 0 && data.groups.length === 0 && data.roles.length === 0 && data.units.length === 0 && (
              <Box className="items-center justify-center py-8">
                <Text className="text-center text-neutral-500">{t('common.no_data_available', { defaultValue: 'No recipients available' })}</Text>
                <Button variant="outline" className="mt-4" onPress={() => refreshDispatchData()}>
                  <ButtonText>{t('common.refresh', { defaultValue: 'Refresh' })}</ButtonText>
                </Button>
              </Box>
            )}
          </ScrollView>
        )}

        {/* Footer */}
        <Box className="w-full border-t border-gray-200 p-4 dark:border-gray-700">
          <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {getSelectionCount()} {t('calls.selected')}
          </Text>
          <HStack space="sm" className="w-full">
            <Button variant="outline" onPress={handleCancel} className="flex-1">
              <ButtonText>{t('common.cancel')}</ButtonText>
            </Button>
            <Button variant="solid" action="primary" onPress={handleConfirm} disabled={getSelectionCount() === 0} className="flex-1">
              <ButtonText>{t('common.confirm')}</ButtonText>
            </Button>
          </HStack>
        </Box>
      </ActionsheetContent>
    </Actionsheet>
  );
};
