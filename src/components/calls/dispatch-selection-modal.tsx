import { CheckIcon, SearchIcon, UsersIcon, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import { Loading } from '@/components/common/loading';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
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

  if (!isVisible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        backgroundColor: colorScheme === 'dark' ? '#000000' : '#ffffff',
      }}
    >
      {/* Header */}
      <Box className={`flex-row items-center justify-between p-4 ${colorScheme === 'dark' ? 'border-b border-neutral-800 bg-neutral-900' : 'border-b border-neutral-200 bg-white'}`}>
        <HStack className="items-center space-x-3">
          <UsersIcon size={24} className={colorScheme === 'dark' ? 'text-white' : 'text-neutral-900'} />
          <Text className="pl-4 text-xl font-bold">{t('calls.select_dispatch_recipients')}</Text>
        </HStack>
        <TouchableOpacity onPress={handleCancel}>
          <X size={24} className={colorScheme === 'dark' ? 'text-white' : 'text-neutral-900'} />
        </TouchableOpacity>
      </Box>

      {/* Search */}
      <Box className="p-4">
        <Input>
          <SearchIcon size={20} className="ml-3 mr-2 text-neutral-500" />
          <InputField placeholder={t('common.search')} value={searchQuery} onChangeText={handleSearchChange} className="flex-1" />
        </Input>
      </Box>

      {/* Content */}
      {isLoading ? (
        <Loading />
      ) : error ? (
        <Box className="flex-1 items-center justify-center p-4">
          <Text className="text-center text-red-500">{error}</Text>
          <Button variant="outline" className="mt-4" onPress={() => refreshDispatchData()}>
            <ButtonText>{t('common.retry')}</ButtonText>
          </Button>
        </Box>
      ) : (
        <ScrollView className="flex-1 px-4">
          {/* Everyone Option */}
          <Card className={`mb-4 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
            <TouchableOpacity onPress={handleToggleEveryone}>
              <HStack className="items-center space-x-3">
                <Box className={`size-6 items-center justify-center rounded border-2 ${selection.everyone ? 'border-blue-500 bg-blue-500' : colorScheme === 'dark' ? 'border-neutral-600' : 'border-neutral-300'}`}>
                  {selection.everyone && <CheckIcon size={16} className="text-white" />}
                </Box>
                <VStack className="flex-1">
                  <Text className="pl-4 text-lg font-semibold">{t('calls.everyone')}</Text>
                  <Text className="pl-4 text-sm text-neutral-500">{t('calls.dispatch_to_everyone')}</Text>
                </VStack>
              </HStack>
            </TouchableOpacity>
          </Card>

          {/* Users Section */}
          {filteredData.users.length > 0 && (
            <VStack className="mb-6">
              <Text className="mb-3 text-lg font-semibold">
                {t('calls.users')} ({filteredData.users.length})
              </Text>
              {filteredData.users.map((user) => (
                <Card key={`user-${user.Id}`} className={`mb-2 rounded-lg border p-3 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
                  <TouchableOpacity onPress={() => handleToggleUser(user.Id)}>
                    <HStack className="items-center space-x-3">
                      <Box
                        className={`size-5 items-center justify-center rounded border-2 ${selection.users.includes(user.Id) ? 'border-blue-500 bg-blue-500' : colorScheme === 'dark' ? 'border-neutral-600' : 'border-neutral-300'
                          }`}
                      >
                        {selection.users.includes(user.Id) && <CheckIcon size={12} className="text-white" />}
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

          {/* Groups Section */}
          {filteredData.groups.length > 0 && (
            <VStack className="mb-6">
              <Text className="mb-3 text-lg font-semibold">
                {t('calls.groups')} ({filteredData.groups.length})
              </Text>
              {filteredData.groups.map((group) => (
                <Card key={`group-${group.Id}`} className={`mb-2 rounded-lg border p-3 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
                  <TouchableOpacity onPress={() => handleToggleGroup(group.Id)}>
                    <HStack className="items-center space-x-3">
                      <Box
                        className={`size-5 items-center justify-center rounded border-2 ${selection.groups.includes(group.Id) ? 'border-blue-500 bg-blue-500' : colorScheme === 'dark' ? 'border-neutral-600' : 'border-neutral-300'
                          }`}
                      >
                        {selection.groups.includes(group.Id) && <CheckIcon size={12} className="text-white" />}
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

          {/* Roles Section */}
          {filteredData.roles.length > 0 && (
            <VStack className="mb-6">
              <Text className="mb-3 text-lg font-semibold">
                {t('calls.roles')} ({filteredData.roles.length})
              </Text>
              {filteredData.roles.map((role) => (
                <Card key={`role-${role.Id}`} className={`mb-2 rounded-lg border p-3 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
                  <TouchableOpacity onPress={() => handleToggleRole(role.Id)}>
                    <HStack className="items-center space-x-3">
                      <Box
                        className={`size-5 items-center justify-center rounded border-2 ${selection.roles.includes(role.Id) ? 'border-blue-500 bg-blue-500' : colorScheme === 'dark' ? 'border-neutral-600' : 'border-neutral-300'
                          }`}
                      >
                        {selection.roles.includes(role.Id) && <CheckIcon size={12} className="text-white" />}
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

          {/* Units Section */}
          {filteredData.units.length > 0 && (
            <VStack className="mb-6">
              <Text className="mb-3 text-lg font-semibold">
                {t('calls.units')} ({filteredData.units.length})
              </Text>
              {filteredData.units.map((unit) => (
                <Card key={`unit-${unit.Id}`} className={`mb-2 rounded-lg border p-3 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
                  <TouchableOpacity onPress={() => handleToggleUnit(unit.Id)}>
                    <HStack className="items-center space-x-3">
                      <Box
                        className={`size-5 items-center justify-center rounded border-2 ${selection.units.includes(unit.Id) ? 'border-blue-500 bg-blue-500' : colorScheme === 'dark' ? 'border-neutral-600' : 'border-neutral-300'
                          }`}
                      >
                        {selection.units.includes(unit.Id) && <CheckIcon size={12} className="text-white" />}
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
      <Box className={`p-4 ${colorScheme === 'dark' ? 'border-t border-neutral-800 bg-neutral-900' : 'border-t border-neutral-200 bg-white'}`}>
        <Text className="mb-3 text-sm text-neutral-500">
          {getSelectionCount()} {t('calls.selected')}
        </Text>
        <HStack className="space-x-4">
          <Button variant="outline" onPress={handleCancel} className="flex-1">
            <ButtonText>{t('common.cancel')}</ButtonText>
          </Button>
          <Button variant="solid" action="primary" onPress={handleConfirm} disabled={getSelectionCount() === 0} className="flex-1">
            <ButtonText>{t('common.confirm')}</ButtonText>
          </Button>
        </HStack>
      </Box>
    </View>
  );
};
