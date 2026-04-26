import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useAnalytics } from '@/hooks/use-analytics';
import { arePoisAllowedForStatus, getCallDestinationDisplay, getPoiDestinationDisplay, getStationDestinationDisplay, type StatusDestinationTab } from '@/lib/status-destinations';
import { invertColor } from '@/lib/utils';
import { useCoreStore } from '@/stores/app/core-store';
import { useCallsStore } from '@/stores/calls/store';
import { usePersonnelStatusBottomSheetStore } from '@/stores/status/personnel-status-store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Button, ButtonText } from '../ui/button';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { Spinner } from '../ui/spinner';
import { Text } from '../ui/text';
import { Textarea, TextareaInput } from '../ui/textarea';
import { VStack } from '../ui/vstack';

export const PersonnelStatusBottomSheet = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const {
    isOpen,
    requiresStatusSelection = false,
    currentStep,
    selectedCall,
    selectedGroup,
    selectedPoi = null,
    selectedStatus,
    responseType,
    selectedTab,
    note,
    respondingTo,
    isLoading,
    groups,
    isLoadingGroups,
    pois = [],
    isLoadingPois = false,
    setSelectedCall,
    setSelectedGroup,
    setSelectedPoi = () => undefined,
    setSelectedStatus = () => undefined,
    setResponseType,
    setSelectedTab,
    setNote,
    fetchGroups,
    fetchDestinationPois = async () => undefined,
    nextStep,
    previousStep,
    submitStatus,
    reset,
    isDestinationRequired = () => false,
    areCallsAllowed = () => true,
    areStationsAllowed = () => true,
    arePoisAllowed = () => false,
  } = usePersonnelStatusBottomSheetStore();

  const { activeCall, activeStatuses } = useCoreStore();
  const { calls, isLoading: isLoadingCalls, fetchCalls } = useCallsStore();
  const { colorScheme } = useColorScheme();

  const callsAllowed = areCallsAllowed();
  const stationsAllowed = areStationsAllowed();
  const poisAllowed = arePoisAllowed();
  const destinationRequired = isDestinationRequired();
  const totalSteps = requiresStatusSelection ? 4 : 3;

  const allowedTabs = useMemo<StatusDestinationTab[]>(() => {
    const tabs: StatusDestinationTab[] = [];

    if (callsAllowed) {
      tabs.push('calls');
    }

    if (stationsAllowed) {
      tabs.push('stations');
    }

    if (poisAllowed) {
      tabs.push('pois');
    }

    return tabs;
  }, [callsAllowed, poisAllowed, stationsAllowed]);

  const visibleStatuses = useMemo(() => {
    const nextStatuses = activeStatuses || [];
    return selectedPoi ? nextStatuses.filter((status) => arePoisAllowedForStatus(status.Detail)) : nextStatuses;
  }, [activeStatuses, selectedPoi]);

  useEffect(() => {
    if (isOpen) {
      fetchCalls();
      void fetchGroups();
      void fetchDestinationPois();
    }
  }, [fetchCalls, fetchDestinationPois, fetchGroups, isOpen]);

  useEffect(() => {
    if (activeCall && currentStep === 'select-responding-to' && responseType === 'none' && callsAllowed && !selectedGroup && !selectedPoi) {
      setSelectedCall(activeCall);
    }
  }, [activeCall, callsAllowed, currentStep, responseType, selectedGroup, selectedPoi, setSelectedCall]);

  const trackViewAnalytics = useCallback(() => {
    try {
      trackEvent('personnel_status_bottom_sheet_viewed', {
        timestamp: new Date().toISOString(),
        currentStep,
        requiresStatusSelection,
        selectedStatusId: selectedStatus?.Id ?? 0,
        selectedStatusText: selectedStatus?.Text ?? '',
        responseType,
        selectedTab,
        hasSelectedCall: !!selectedCall,
        selectedCallId: selectedCall?.CallId ?? '',
        hasSelectedGroup: !!selectedGroup,
        selectedGroupId: selectedGroup?.GroupId ?? '',
        hasSelectedPoi: !!selectedPoi,
        selectedPoiId: selectedPoi?.PoiId ?? 0,
        hasNote: note.length > 0,
        noteLength: note.length,
        hasRespondingTo: respondingTo.length > 0,
        availableCallsCount: calls?.length || 0,
        availableGroupsCount: groups?.length || 0,
        availablePoisCount: pois?.length || 0,
        hasActiveCall: !!activeCall,
        colorScheme: colorScheme || 'light',
      });
    } catch (error) {
      console.warn('Failed to track personnel status bottom sheet view analytics:', error);
    }
  }, [trackEvent, currentStep, requiresStatusSelection, selectedStatus, responseType, selectedTab, selectedCall, selectedGroup, selectedPoi, note, respondingTo, calls, groups, pois, activeCall, colorScheme]);

  useEffect(() => {
    if (isOpen) {
      trackViewAnalytics();
    }
  }, [isOpen, currentStep, trackViewAnalytics]);

  const handleClose = () => {
    try {
      trackEvent('personnel_status_bottom_sheet_closed', {
        timestamp: new Date().toISOString(),
        currentStep,
        selectedStatusId: selectedStatus?.Id ?? 0,
        responseType,
        hasSelectedCall: !!selectedCall,
        hasSelectedGroup: !!selectedGroup,
        hasSelectedPoi: !!selectedPoi,
        hasNote: note.length > 0,
        completed: false,
      });
    } catch (error) {
      console.warn('Failed to track personnel status bottom sheet close analytics:', error);
    }

    reset();
  };

  const handleStatusSelect = (statusId: number) => {
    const status = visibleStatuses.find((currentStatus) => currentStatus.Id === statusId);

    if (!status) {
      return;
    }

    setSelectedStatus(status);

    try {
      trackEvent('personnel_status_option_selected', {
        timestamp: new Date().toISOString(),
        statusId: status.Id,
        statusText: status.Text,
        statusDetail: status.Detail,
      });
    } catch (error) {
      console.warn('Failed to track status option analytics:', error);
    }
  };

  const handleCallSelect = (callId: string) => {
    const call = calls.find((currentCall) => currentCall.CallId === callId);

    if (!call) {
      return;
    }

    setSelectedCall(call);

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
  };

  const handleGroupSelect = (groupId: string) => {
    const group = groups.find((currentGroup) => currentGroup.GroupId === groupId);

    if (!group) {
      return;
    }

    setSelectedGroup(group);

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
  };

  const handlePoiSelect = (poiId: number) => {
    const poi = pois.find((currentPoi) => currentPoi.PoiId === poiId);

    if (!poi) {
      return;
    }

    setSelectedPoi(poi);

    try {
      trackEvent('personnel_status_poi_selected', {
        timestamp: new Date().toISOString(),
        poiId: poi.PoiId,
        poiTypeId: poi.PoiTypeId,
        poiTypeName: poi.PoiTypeName || '',
        currentStep,
      });
    } catch (error) {
      console.warn('Failed to track POI selection analytics:', error);
    }
  };

  const handleNoDestinationSelect = () => {
    setResponseType('none');

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
    try {
      trackEvent('personnel_status_step_next', {
        timestamp: new Date().toISOString(),
        fromStep: currentStep,
        selectedStatusId: selectedStatus?.Id ?? 0,
        responseType,
        hasSelectedCall: !!selectedCall,
        hasSelectedGroup: !!selectedGroup,
        hasSelectedPoi: !!selectedPoi,
      });
    } catch (error) {
      console.warn('Failed to track step next analytics:', error);
    }

    nextStep();
  };

  const handlePrevious = () => {
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
    try {
      trackEvent('personnel_status_submitted', {
        timestamp: new Date().toISOString(),
        selectedStatusId: selectedStatus?.Id ?? 0,
        selectedStatusText: selectedStatus?.Text ?? '',
        responseType,
        selectedCallId: selectedCall?.CallId ?? '',
        selectedGroupId: selectedGroup?.GroupId ?? '',
        selectedPoiId: selectedPoi?.PoiId ?? 0,
        hasNote: note.length > 0,
        noteLength: note.length,
      });
    } catch (error) {
      console.warn('Failed to track submission analytics:', error);
    }

    await submitStatus();
  };

  const handleTabSelect = (tab: StatusDestinationTab) => {
    const fromTab = selectedTab;
    setSelectedTab(tab);

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

  const getStepTitle = () => {
    switch (currentStep) {
      case 'select-status':
        return t('personnel.status.set_status');
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
    if (requiresStatusSelection) {
      switch (currentStep) {
        case 'select-status':
          return 1;
        case 'select-responding-to':
          return 2;
        case 'add-note':
          return 3;
        case 'confirm':
          return 4;
        default:
          return 1;
      }
    }

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
      case 'select-status':
        return selectedStatus !== null;
      case 'select-responding-to':
        if (!selectedStatus) {
          return false;
        }

        if (!destinationRequired) {
          return true;
        }

        if (responseType === 'call') {
          return selectedCall !== null;
        }

        if (responseType === 'station') {
          return selectedGroup !== null;
        }

        if (responseType === 'poi') {
          return selectedPoi !== null;
        }

        return false;
      case 'add-note':
        return true;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const getSelectedDestinationDisplay = () => {
    if (responseType === 'call' && selectedCall) {
      return getCallDestinationDisplay(selectedCall);
    }

    if (responseType === 'station' && selectedGroup) {
      return getStationDestinationDisplay(selectedGroup);
    }

    if (responseType === 'poi' && selectedPoi) {
      return getPoiDestinationDisplay(selectedPoi);
    }

    return t('personnel.status.no_destination');
  };

  const selectedDestinationTabBackgroundColor = colorScheme === 'dark' ? '#2563eb' : '#1d4ed8';
  const selectedDestinationTabBorderColor = colorScheme === 'dark' ? '#60a5fa' : '#1d4ed8';
  const unselectedDestinationTabBackgroundColor = colorScheme === 'dark' ? '#171717' : '#f5f5f5';
  const unselectedDestinationTabBorderColor = colorScheme === 'dark' ? '#262626' : '#e5e5e5';
  const unselectedDestinationTabTextColor = colorScheme === 'dark' ? '#d4d4d8' : '#525252';

  return (
    <Actionsheet isOpen={isOpen} onClose={handleClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="bg-white dark:bg-gray-900">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <VStack space="md" className="w-full p-4">
          <HStack className="mb-2 items-center justify-between">
            <VStack className="flex-1" />
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('common.step')} {getStepNumber()} {t('common.of')} {totalSteps}
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

          {currentStep === 'select-status' ? (
            <VStack space="md" className="w-full">
              <Text className="mb-2 font-medium">{t('personnel.status.status')}</Text>

              <ScrollView className="max-h-[320px]">
                {activeStatuses === null ? (
                  <VStack space="md" className="w-full items-center justify-center py-6">
                    <Spinner size="large" />
                    <Text className="text-center text-gray-600 dark:text-gray-400">{t('common.loading')}</Text>
                  </VStack>
                ) : visibleStatuses.length > 0 ? (
                  visibleStatuses.map((status) => {
                    const isSelected = selectedStatus?.Id === status.Id;
                    const textColor = invertColor(status.BColor, true);

                    return (
                      <TouchableOpacity
                        key={status.Id}
                        onPress={() => handleStatusSelect(status.Id)}
                        className={`mb-3 rounded-lg border-2 p-3 ${isSelected ? 'border-primary-500 dark:border-primary-400' : 'border-transparent'}`}
                        style={{ backgroundColor: status.BColor }}
                      >
                        <HStack space="sm" className="items-center">
                          <VStack
                            className="flex size-5 items-center justify-center rounded border-2"
                            style={{
                              borderColor: textColor,
                              backgroundColor: isSelected ? textColor : 'transparent',
                            }}
                          >
                            {isSelected ? <Check size={12} color={status.BColor} /> : null}
                          </VStack>
                          <VStack className="flex-1">
                            <Text className="font-bold" style={{ color: textColor }}>
                              {status.Text}
                            </Text>
                          </VStack>
                        </HStack>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text className="mt-4 italic text-gray-600 dark:text-gray-400">{t('home.status.no_options_available')}</Text>
                )}
              </ScrollView>

              <HStack space="sm" className="mt-4 justify-between">
                <Button variant="outline" onPress={handleClose} className="flex-1">
                  <ButtonText>{t('common.cancel')}</ButtonText>
                </Button>
                <Button onPress={handleNext} isDisabled={!canProceedFromCurrentStep()} className="flex-1 bg-blue-600">
                  <ButtonText>{t('common.next')}</ButtonText>
                  <ArrowRight size={16} color="#fff" />
                </Button>
              </HStack>
            </VStack>
          ) : null}

          {currentStep === 'select-responding-to' ? (
            <VStack space="md" className="w-full">
              <Text className="mb-2 font-medium">{t('personnel.status.select_destination')}</Text>

              {!destinationRequired ? (
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
                      {responseType === 'none' ? <Check size={12} color="#fff" /> : null}
                    </VStack>
                    <VStack className="flex-1">
                      <Text className="font-bold">{t('personnel.status.no_destination')}</Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">{t('personnel.status.general_status')}</Text>
                    </VStack>
                  </HStack>
                </TouchableOpacity>
              ) : null}

              {allowedTabs.length > 1 ? (
                <HStack space="xs" className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-100 p-1.5 dark:border-neutral-800 dark:bg-neutral-900">
                  {allowedTabs.map((tab) => {
                    const isSelected = selectedTab === tab;

                    return (
                      <TouchableOpacity
                        key={tab}
                        testID={`status-destination-tab-${tab}`}
                        onPress={() => handleTabSelect(tab)}
                        className="flex-1 rounded-xl border p-3"
                        style={{
                          backgroundColor: isSelected ? selectedDestinationTabBackgroundColor : unselectedDestinationTabBackgroundColor,
                          borderColor: isSelected ? selectedDestinationTabBorderColor : unselectedDestinationTabBorderColor,
                        }}
                      >
                        <Text className="text-center font-semibold" style={{ color: isSelected ? '#ffffff' : unselectedDestinationTabTextColor }}>
                          {tab === 'calls' ? t('personnel.status.calls_tab') : tab === 'stations' ? t('personnel.status.stations_tab') : t('personnel.status.pois_tab')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </HStack>
              ) : null}

              <ScrollView className="max-h-[300px]">
                {selectedTab === 'calls' && callsAllowed ? (
                  <VStack space="sm">
                    {isLoadingCalls ? (
                      <VStack space="md" className="w-full items-center justify-center py-6">
                        <Spinner size="large" />
                        <Text className="text-center text-gray-600 dark:text-gray-400">{t('calls.loading_calls')}</Text>
                      </VStack>
                    ) : calls.length > 0 ? (
                      calls.map((call) => {
                        const isSelected = selectedCall?.CallId === call.CallId;

                        return (
                          <TouchableOpacity
                            key={call.CallId}
                            onPress={() => handleCallSelect(call.CallId)}
                            className={`mb-3 rounded-lg border-2 p-3 ${isSelected ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'}`}
                          >
                            <HStack space="sm" className="items-center">
                              <VStack
                                className="flex size-5 items-center justify-center rounded border-2"
                                style={{
                                  borderColor: isSelected ? '#3b82f6' : '#9ca3af',
                                  backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                                }}
                              >
                                {isSelected ? <Check size={12} color="#fff" /> : null}
                              </VStack>
                              <VStack className="flex-1">
                                <Text className="font-bold">{getCallDestinationDisplay(call)}</Text>
                                {call.Address ? <Text className="text-sm text-gray-600 dark:text-gray-400">{call.Address}</Text> : null}
                              </VStack>
                            </HStack>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <Text className="mt-4 italic text-gray-600 dark:text-gray-400">{t('calls.no_calls_available')}</Text>
                    )}
                  </VStack>
                ) : null}

                {selectedTab === 'stations' && stationsAllowed ? (
                  <VStack space="sm">
                    {isLoadingGroups ? (
                      <VStack space="md" className="w-full items-center justify-center py-6">
                        <Spinner size="large" />
                        <Text className="text-center text-gray-600 dark:text-gray-400">{t('personnel.status.loading_stations')}</Text>
                      </VStack>
                    ) : groups.length > 0 ? (
                      groups.map((group) => {
                        const isSelected = selectedGroup?.GroupId === group.GroupId;

                        return (
                          <TouchableOpacity
                            key={group.GroupId}
                            onPress={() => handleGroupSelect(group.GroupId)}
                            className={`mb-3 rounded-lg border-2 p-3 ${isSelected ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'}`}
                          >
                            <HStack space="sm" className="items-center">
                              <VStack
                                className="flex size-5 items-center justify-center rounded border-2"
                                style={{
                                  borderColor: isSelected ? '#3b82f6' : '#9ca3af',
                                  backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                                }}
                              >
                                {isSelected ? <Check size={12} color="#fff" /> : null}
                              </VStack>
                              <VStack className="flex-1">
                                <Text className="font-bold">{getStationDestinationDisplay(group)}</Text>
                                {group.Address ? <Text className="text-sm text-gray-600 dark:text-gray-400">{group.Address}</Text> : null}
                                {group.GroupType ? <Text className="text-xs text-gray-500 dark:text-gray-500">{group.GroupType}</Text> : null}
                              </VStack>
                            </HStack>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <Text className="mt-4 italic text-gray-600 dark:text-gray-400">{t('personnel.status.no_stations_available')}</Text>
                    )}
                  </VStack>
                ) : null}

                {selectedTab === 'pois' && poisAllowed ? (
                  <VStack space="sm">
                    {isLoadingPois ? (
                      <VStack space="md" className="w-full items-center justify-center py-6">
                        <Spinner size="large" />
                        <Text className="text-center text-gray-600 dark:text-gray-400">{t('personnel.status.loading_pois')}</Text>
                      </VStack>
                    ) : pois.length > 0 ? (
                      pois.map((poi) => {
                        const isSelected = selectedPoi?.PoiId === poi.PoiId;

                        return (
                          <TouchableOpacity
                            key={poi.PoiId}
                            onPress={() => handlePoiSelect(poi.PoiId)}
                            className={`mb-3 rounded-lg border-2 p-3 ${isSelected ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'}`}
                          >
                            <HStack space="sm" className="items-center">
                              <VStack
                                className="flex size-5 items-center justify-center rounded border-2"
                                style={{
                                  borderColor: isSelected ? '#3b82f6' : '#9ca3af',
                                  backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                                }}
                              >
                                {isSelected ? <Check size={12} color="#fff" /> : null}
                              </VStack>
                              <VStack className="flex-1">
                                <Text className="font-bold">{getPoiDestinationDisplay(poi)}</Text>
                                {poi.Address ? <Text className="text-sm text-gray-600 dark:text-gray-400">{poi.Address}</Text> : null}
                                {poi.Note ? <Text className="text-xs text-gray-500 dark:text-gray-500">{poi.Note}</Text> : null}
                              </VStack>
                            </HStack>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <Text className="mt-4 italic text-gray-600 dark:text-gray-400">{t('poi.empty_title')}</Text>
                    )}
                  </VStack>
                ) : null}
              </ScrollView>

              <HStack space="sm" className="mt-4 justify-between">
                {requiresStatusSelection ? (
                  <Button variant="outline" onPress={handlePrevious} className="flex-1">
                    <ArrowLeft size={16} color={colorScheme === 'dark' ? '#737373' : '#737373'} />
                    <ButtonText>{t('common.previous')}</ButtonText>
                  </Button>
                ) : (
                  <Button variant="outline" onPress={handleClose} className="flex-1">
                    <ButtonText>{t('common.cancel')}</ButtonText>
                  </Button>
                )}
                <Button onPress={handleNext} isDisabled={!canProceedFromCurrentStep()} className="flex-1 bg-blue-600">
                  <ButtonText>{t('common.next')}</ButtonText>
                  <ArrowRight size={16} color="#fff" />
                </Button>
              </HStack>
            </VStack>
          ) : null}

          {currentStep === 'add-note' ? (
            <KeyboardAwareScrollView keyboardShouldPersistTaps={Platform.OS === 'android' ? 'handled' : 'always'} showsVerticalScrollIndicator={false} bottomOffset={20} style={{ flexGrow: 0, width: '100%' }}>
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
                    <ArrowRight size={16} color="#fff" />
                  </Button>
                </HStack>
              </VStack>
            </KeyboardAwareScrollView>
          ) : null}

          {currentStep === 'confirm' ? (
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

                {responseType === 'none' && respondingTo ? (
                  <VStack space="xs">
                    <Text className="font-medium">{t('personnel.status.custom_responding_to')}:</Text>
                    <Text className="text-sm">{respondingTo}</Text>
                  </VStack>
                ) : null}

                {note ? (
                  <VStack space="xs">
                    <Text className="font-medium">{t('personnel.status.note')}:</Text>
                    <Text className="text-sm">{note}</Text>
                  </VStack>
                ) : null}
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
          ) : null}
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
};
