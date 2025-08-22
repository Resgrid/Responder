import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, TouchableOpacity } from 'react-native';

import { useAnalytics } from '@/hooks/use-analytics';
import { useCoreStore } from '@/stores/app/core-store';
import { useCallsStore } from '@/stores/calls/store';
import { usePersonnelStatusBottomSheetStore } from '@/stores/status/personnel-status-store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Button, ButtonText } from '../ui/button';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { Input, InputField } from '../ui/input';
import { Spinner } from '../ui/spinner';
import { Text } from '../ui/text';
import { Textarea, TextareaInput } from '../ui/textarea';
import { VStack } from '../ui/vstack';

export const PersonnelStatusBottomSheet = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const {
    isOpen,
    currentStep,
    selectedCall,
    selectedGroup,
    selectedStatus,
    responseType,
    selectedTab,
    note,
    respondingTo,
    isLoading,
    groups,
    isLoadingGroups,
    setCurrentStep,
    setSelectedCall,
    setSelectedGroup,
    setResponseType,
    setSelectedTab,
    setNote,
    setRespondingTo,
    fetchGroups,
    nextStep,
    previousStep,
    submitStatus,
    reset,
  } = usePersonnelStatusBottomSheetStore();

  const { activeCall } = useCoreStore();
  const { calls, isLoading: isLoadingCalls, fetchCalls } = useCallsStore();
  const { colorScheme } = useColorScheme();

  // Fetch calls and groups when bottom sheet opens
  React.useEffect(() => {
    if (isOpen) {
      fetchCalls();
      fetchGroups();
    }
  }, [isOpen, fetchCalls, fetchGroups]);

  const handleClose = () => {
    // Track close analytics
    try {
      trackEvent('personnel_status_bottom_sheet_closed', {
        timestamp: new Date().toISOString(),
        currentStep,
        selectedStatusId: selectedStatus?.Id ?? 0,
        responseType,
        hasSelectedCall: !!selectedCall,
        hasSelectedGroup: !!selectedGroup,
        hasNote: note.length > 0,
        completed: false, // User closed without completing
      });
    } catch (error) {
      console.warn('Failed to track personnel status bottom sheet close analytics:', error);
    }

    reset();
  };

  const handleCallSelect = (callId: string) => {
    const call = calls.find((c) => c.CallId === callId);
    if (call) {
      setSelectedCall(call);

      // Track call selection analytics
      try {
        trackEvent('personnel_status_call_selected', {
          timestamp: new Date().toISOString(),
          callId: call.CallId,
          callNumber: call.Number || '',
          callName: call.Name || '',
          currentStep,
        });
      } catch (error) {
        console.warn('Failed to track call selection analytics:', error);
      }
    }
  };

  const handleGroupSelect = (groupId: string) => {
    const group = groups.find((g) => g.GroupId === groupId);
    if (group) {
      setSelectedGroup(group);

      // Track group selection analytics
      try {
        trackEvent('personnel_status_group_selected', {
          timestamp: new Date().toISOString(),
          groupId: group.GroupId,
          groupName: group.Name || '',
          groupType: group.GroupType || '',
          currentStep,
        });
      } catch (error) {
        console.warn('Failed to track group selection analytics:', error);
      }
    }
  };

  const handleNoDestinationSelect = () => {
    setResponseType('none');

    // Track no destination selection analytics
    try {
      trackEvent('personnel_status_no_destination_selected', {
        timestamp: new Date().toISOString(),
        currentStep,
        selectedStatusId: selectedStatus?.Id ?? 0,
      });
    } catch (error) {
      console.warn('Failed to track no destination selection analytics:', error);
    }
  };

  const handleNext = () => {
    // Track step progression analytics
    try {
      trackEvent('personnel_status_step_next', {
        timestamp: new Date().toISOString(),
        fromStep: currentStep,
        selectedStatusId: selectedStatus?.Id ?? 0,
        responseType,
        hasSelectedCall: !!selectedCall,
        hasSelectedGroup: !!selectedGroup,
      });
    } catch (error) {
      console.warn('Failed to track step next analytics:', error);
    }

    nextStep();
  };

  const handlePrevious = () => {
    // Track step backward analytics
    try {
      trackEvent('personnel_status_step_previous', {
        timestamp: new Date().toISOString(),
        fromStep: currentStep,
        selectedStatusId: selectedStatus?.Id ?? 0,
        responseType,
      });
    } catch (error) {
      console.warn('Failed to track step previous analytics:', error);
    }

    previousStep();
  };

  const handleSubmit = async () => {
    // Track submission analytics
    try {
      trackEvent('personnel_status_submitted', {
        timestamp: new Date().toISOString(),
        selectedStatusId: selectedStatus?.Id ?? 0,
        selectedStatusText: selectedStatus?.Text ?? '',
        responseType,
        selectedCallId: selectedCall?.CallId ?? '',
        selectedGroupId: selectedGroup?.GroupId ?? '',
        hasNote: note.length > 0,
        noteLength: note.length,
        hasRespondingTo: respondingTo.length > 0,
        respondingToLength: respondingTo.length,
      });
    } catch (error) {
      console.warn('Failed to track submission analytics:', error);
    }

    await submitStatus();
  };

  const handleTabSelect = (tab: 'calls' | 'stations') => {
    const fromTab = selectedTab;
    setSelectedTab(tab);

    // Track tab selection analytics
    try {
      trackEvent('personnel_status_tab_changed', {
        timestamp: new Date().toISOString(),
        fromTab,
        toTab: tab,
        currentStep,
        selectedStatusId: selectedStatus?.Id ?? 0,
      });
    } catch (error) {
      console.warn('Failed to track tab change analytics:', error);
    }
  };

  // Auto-select active call if available and no destination is selected
  React.useEffect(() => {
    if (activeCall && currentStep === 'select-responding-to' && responseType === 'none') {
      setSelectedCall(activeCall);
    }
  }, [activeCall, currentStep, responseType, setSelectedCall]);

  // Analytics tracking function
  const trackViewAnalytics = useCallback(() => {
    try {
      trackEvent('personnel_status_bottom_sheet_viewed', {
        timestamp: new Date().toISOString(),
        currentStep,
        selectedStatusId: selectedStatus?.Id ?? 0,
        selectedStatusText: selectedStatus?.Text ?? '',
        responseType,
        selectedTab,
        hasSelectedCall: !!selectedCall,
        selectedCallId: selectedCall?.CallId ?? '',
        hasSelectedGroup: !!selectedGroup,
        selectedGroupId: selectedGroup?.GroupId ?? '',
        hasNote: note.length > 0,
        noteLength: note.length,
        hasRespondingTo: respondingTo.length > 0,
        availableCallsCount: calls?.length || 0,
        availableGroupsCount: groups?.length || 0,
        hasActiveCall: !!activeCall,
        colorScheme: colorScheme || 'light',
      });
    } catch (error) {
      // Analytics errors should not break the component
      console.warn('Failed to track personnel status bottom sheet view analytics:', error);
    }
  }, [trackEvent, currentStep, selectedStatus, responseType, selectedTab, selectedCall, selectedGroup, note, respondingTo, calls, groups, activeCall, colorScheme]);

  // Track analytics when sheet becomes visible or step changes
  useEffect(() => {
    if (isOpen) {
      trackViewAnalytics();
    }
  }, [isOpen, currentStep, trackViewAnalytics]);

  const getStepTitle = () => {
    switch (currentStep) {
      case 'select-responding-to':
        return t('personnel.status.select_responding_to', { status: selectedStatus?.Text });
      case 'add-note':
        return t('personnel.status.add_note');
      case 'confirm':
        return t('personnel.status.confirm_status', { status: selectedStatus?.Text });
      default:
        return t('personnel.status.set_status');
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'select-responding-to':
        return 1;
      case 'add-note':
        return 2;
      case 'confirm':
        return 3;
      default:
        return 1;
    }
  };

  const canProceedFromCurrentStep = () => {
    switch (currentStep) {
      case 'select-responding-to':
        // "No Destination" is always valid regardless of status Detail value
        // User can always proceed with any selection (call, station, or none)
        return true;
      case 'add-note':
        return true; // Note is optional
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const getSelectedDestinationDisplay = () => {
    if (responseType === 'call' && selectedCall) {
      return `${selectedCall.Number} - ${selectedCall.Name}`;
    } else if (responseType === 'station' && selectedGroup) {
      return selectedGroup.Name;
    } else {
      return t('personnel.status.no_destination');
    }
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={handleClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="bg-white dark:bg-gray-900">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <VStack space="md" className="w-full p-4">
          {/* Step indicator with close button */}
          <HStack className="mb-2 items-center justify-between">
            <VStack className="flex-1" />
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('common.step')} {getStepNumber()} {t('common.of')} 3
            </Text>
            <VStack className="flex-1 items-end">
              <TouchableOpacity onPress={handleClose} className="p-1">
                <X size={20} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            </VStack>
          </HStack>

          <Heading size="lg" className="mb-4 text-center">
            {getStepTitle()}
          </Heading>

          {currentStep === 'select-responding-to' && (
            <VStack space="md" className="w-full">
              <Text className="mb-2 font-medium">{t('personnel.status.select_destination')}</Text>

              {/* No Destination Option */}
              <TouchableOpacity
                onPress={handleNoDestinationSelect}
                className={`mb-4 rounded-lg border-2 p-3 ${responseType === 'none' ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'}`}
              >
                <HStack space="sm" className="items-center">
                  <VStack
                    className="flex size-5 items-center justify-center rounded border-2"
                    style={{
                      borderColor: responseType === 'none' ? '#3b82f6' : '#9ca3af',
                      backgroundColor: responseType === 'none' ? '#3b82f6' : 'transparent',
                    }}
                  >
                    {responseType === 'none' && <Check size={12} color="#fff" />}
                  </VStack>
                  <VStack className="flex-1">
                    <Text className="font-bold">{t('personnel.status.no_destination')}</Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">{t('personnel.status.general_status')}</Text>
                  </VStack>
                </HStack>
              </TouchableOpacity>

              {/* Tab Headers */}
              <HStack space="xs" className="mb-4">
                <TouchableOpacity onPress={() => handleTabSelect('calls')} className={`flex-1 rounded-lg py-3 ${selectedTab === 'calls' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <Text className={`text-center font-semibold ${selectedTab === 'calls' ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{t('personnel.status.calls_tab')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleTabSelect('stations')} className={`flex-1 rounded-lg py-3 ${selectedTab === 'stations' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <Text className={`text-center font-semibold ${selectedTab === 'stations' ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{t('personnel.status.stations_tab')}</Text>
                </TouchableOpacity>
              </HStack>

              {/* Tab Content */}
              <ScrollView className="max-h-[300px]">
                {selectedTab === 'calls' && (
                  <VStack space="sm">
                    {isLoadingCalls ? (
                      <VStack space="md" className="w-full items-center justify-center">
                        <Spinner size="large" />
                        <Text className="text-center text-gray-600 dark:text-gray-400">{t('calls.loading_calls')}</Text>
                      </VStack>
                    ) : calls && calls.length > 0 ? (
                      calls.map((call) => (
                        <TouchableOpacity
                          key={call.CallId}
                          onPress={() => handleCallSelect(call.CallId)}
                          className={`mb-3 rounded-lg border-2 p-3 ${selectedCall?.CallId === call.CallId ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'}`}
                        >
                          <HStack space="sm" className="items-center">
                            <VStack
                              className="flex size-5 items-center justify-center rounded border-2"
                              style={{
                                borderColor: selectedCall?.CallId === call.CallId ? '#3b82f6' : '#9ca3af',
                                backgroundColor: selectedCall?.CallId === call.CallId ? '#3b82f6' : 'transparent',
                              }}
                            >
                              {selectedCall?.CallId === call.CallId && <Check size={12} color="#fff" />}
                            </VStack>
                            <VStack className="flex-1">
                              <Text className="font-bold">
                                {call.Number} - {call.Name}
                              </Text>
                              <Text className="text-sm text-gray-600 dark:text-gray-400">{call.Address}</Text>
                            </VStack>
                          </HStack>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text className="mt-4 italic text-gray-600 dark:text-gray-400">{t('calls.no_calls_available')}</Text>
                    )}
                  </VStack>
                )}

                {selectedTab === 'stations' && (
                  <VStack space="sm">
                    {isLoadingGroups ? (
                      <VStack space="md" className="w-full items-center justify-center">
                        <Spinner size="large" />
                        <Text className="text-center text-gray-600 dark:text-gray-400">{t('personnel.status.loading_stations')}</Text>
                      </VStack>
                    ) : groups && groups.length > 0 ? (
                      groups.map((group) => (
                        <TouchableOpacity
                          key={group.GroupId}
                          onPress={() => handleGroupSelect(group.GroupId)}
                          className={`mb-3 rounded-lg border-2 p-3 ${selectedGroup?.GroupId === group.GroupId ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'}`}
                        >
                          <HStack space="sm" className="items-center">
                            <VStack
                              className="flex size-5 items-center justify-center rounded border-2"
                              style={{
                                borderColor: selectedGroup?.GroupId === group.GroupId ? '#3b82f6' : '#9ca3af',
                                backgroundColor: selectedGroup?.GroupId === group.GroupId ? '#3b82f6' : 'transparent',
                              }}
                            >
                              {selectedGroup?.GroupId === group.GroupId && <Check size={12} color="#fff" />}
                            </VStack>
                            <VStack className="flex-1">
                              <Text className="font-bold">{group.Name}</Text>
                              {group.Address && <Text className="text-sm text-gray-600 dark:text-gray-400">{group.Address}</Text>}
                              {group.GroupType && <Text className="text-xs text-gray-500 dark:text-gray-500">{group.GroupType}</Text>}
                            </VStack>
                          </HStack>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text className="mt-4 italic text-gray-600 dark:text-gray-400">{t('personnel.status.no_stations_available')}</Text>
                    )}
                  </VStack>
                )}
              </ScrollView>

              <HStack space="sm" className="mt-4 justify-end">
                <Button onPress={handleNext} isDisabled={!canProceedFromCurrentStep()} className="bg-blue-600">
                  <ButtonText>{t('common.next')}</ButtonText>
                  <ArrowRight size={16} color={colorScheme === 'dark' ? '#fff' : '#fff'} />
                </Button>
              </HStack>
            </VStack>
          )}

          {currentStep === 'add-note' && (
            <VStack space="md" className="w-full">
              <VStack space="sm">
                <Text className="font-medium">{t('personnel.status.selected_destination')}:</Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">{getSelectedDestinationDisplay()}</Text>
              </VStack>

              <VStack space="sm">
                <Text className="font-medium">
                  {t('personnel.status.note')} ({t('common.optional')}):
                </Text>
                <Textarea size="md" className="min-h-[100px] w-full">
                  <TextareaInput placeholder={t('personnel.status.note_placeholder')} value={note} onChangeText={setNote} />
                </Textarea>
              </VStack>

              <HStack space="sm" className="mt-4 justify-between">
                <Button variant="outline" onPress={handlePrevious} className="flex-1">
                  <ArrowLeft size={16} color={colorScheme === 'dark' ? '#737373' : '#737373'} />
                  <ButtonText>{t('common.previous')}</ButtonText>
                </Button>
                <Button onPress={handleNext} isDisabled={!canProceedFromCurrentStep()} className="flex-1 bg-blue-600">
                  <ButtonText>{t('common.next')}</ButtonText>
                  <ArrowRight size={16} color={colorScheme === 'dark' ? '#fff' : '#fff'} />
                </Button>
              </HStack>
            </VStack>
          )}

          {currentStep === 'confirm' && (
            <VStack space="md" className="w-full">
              <Text className="mb-4 text-center text-lg font-semibold">{t('personnel.status.review_and_confirm')}</Text>

              <VStack space="sm" className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                <VStack space="xs">
                  <Text className="font-medium">{t('personnel.status.status')}:</Text>
                  <Text className="text-sm">{selectedStatus?.Text}</Text>
                </VStack>

                <VStack space="xs">
                  <Text className="font-medium">{t('personnel.status.responding_to')}:</Text>
                  <Text className="text-sm">{getSelectedDestinationDisplay()}</Text>
                </VStack>

                {respondingTo && (
                  <VStack space="xs">
                    <Text className="font-medium">{t('personnel.status.custom_responding_to')}:</Text>
                    <Text className="text-sm">{respondingTo}</Text>
                  </VStack>
                )}

                {note && (
                  <VStack space="xs">
                    <Text className="font-medium">{t('personnel.status.note')}:</Text>
                    <Text className="text-sm">{note}</Text>
                  </VStack>
                )}
              </VStack>

              <HStack space="sm" className="mt-4 justify-between">
                <Button variant="outline" onPress={handlePrevious} className="flex-1" isDisabled={isLoading}>
                  <ArrowLeft size={16} color={colorScheme === 'dark' ? '#737373' : '#737373'} />
                  <ButtonText>{t('common.previous')}</ButtonText>
                </Button>
                <Button onPress={handleSubmit} isDisabled={isLoading} className="flex-1 bg-green-600">
                  <ButtonText>{isLoading ? t('common.submitting') : t('common.submit')}</ButtonText>
                </Button>
              </HStack>
            </VStack>
          )}
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
};
