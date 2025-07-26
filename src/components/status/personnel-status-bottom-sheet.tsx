import { ArrowLeft, ArrowRight, CircleIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, TouchableOpacity } from 'react-native';

import { useCoreStore } from '@/stores/app/core-store';
import { useCallsStore } from '@/stores/calls/store';
import { usePersonnelStatusBottomSheetStore } from '@/stores/status/personnel-status-store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Button, ButtonText } from '../ui/button';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { Input, InputField } from '../ui/input';
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '../ui/radio';
import { Spinner } from '../ui/spinner';
import { Text } from '../ui/text';
import { Textarea, TextareaInput } from '../ui/textarea';
import { VStack } from '../ui/vstack';

export const PersonnelStatusBottomSheet = () => {
  const { t } = useTranslation();
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

  // Fetch calls and groups when bottom sheet opens
  React.useEffect(() => {
    if (isOpen) {
      fetchCalls();
      fetchGroups();
    }
  }, [isOpen, fetchCalls, fetchGroups]);

  const handleClose = () => {
    reset();
  };

  const handleCallSelect = (callId: string) => {
    const call = calls.find((c) => c.CallId === callId);
    if (call) {
      setSelectedCall(call);
    }
  };

  const handleGroupSelect = (groupId: string) => {
    const group = groups.find((g) => g.GroupId === groupId);
    if (group) {
      setSelectedGroup(group);
    }
  };

  const handleNoDestinationSelect = () => {
    setResponseType('none');
  };

  const handleNext = () => {
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleSubmit = async () => {
    await submitStatus();
  };

  // Auto-select active call if available and no destination is selected
  React.useEffect(() => {
    if (activeCall && currentStep === 'select-responding-to' && responseType === 'none') {
      setSelectedCall(activeCall);
    }
  }, [activeCall, currentStep, responseType, setSelectedCall]);

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
        return true; // Can proceed with any selection including none
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

  const { colorScheme } = useColorScheme();

  return (
    <Actionsheet isOpen={isOpen} onClose={handleClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="bg-white dark:bg-gray-900">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <VStack space="md" className="w-full p-4">
          {/* Step indicator */}
          <HStack space="sm" className="mb-2 justify-center">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('common.step')} {getStepNumber()} {t('common.of')} 3
            </Text>
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
                className={`mb-4 rounded-lg border-2 p-3 ${responseType === 'none' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'}`}
              >
                <HStack space="sm" className="items-center">
                  <CircleIcon size={20} color={responseType === 'none' ? '#3b82f6' : '#9ca3af'} fill={responseType === 'none' ? '#3b82f6' : 'none'} />
                  <VStack className="flex-1">
                    <Text className="font-bold">{t('personnel.status.no_destination')}</Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">{t('personnel.status.general_status')}</Text>
                  </VStack>
                </HStack>
              </TouchableOpacity>

              {/* Tab Headers */}
              <HStack space="xs" className="mb-4">
                <TouchableOpacity onPress={() => setSelectedTab('calls')} className={`flex-1 rounded-lg py-3 ${selectedTab === 'calls' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <Text className={`text-center font-semibold ${selectedTab === 'calls' ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{t('personnel.status.calls_tab')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedTab('stations')} className={`flex-1 rounded-lg py-3 ${selectedTab === 'stations' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <Text className={`text-center font-semibold ${selectedTab === 'stations' ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{t('personnel.status.stations_tab')}</Text>
                </TouchableOpacity>
              </HStack>

              {/* Tab Content */}
              <ScrollView className="max-h-[300px]">
                {selectedTab === 'calls' && (
                  <RadioGroup value={selectedCall?.CallId || ''} onChange={handleCallSelect}>
                    {isLoadingCalls ? (
                      <VStack space="md" className="w-full items-center justify-center">
                        <Spinner size="large" />
                        <Text className="text-center text-gray-600 dark:text-gray-400">{t('calls.loading_calls')}</Text>
                      </VStack>
                    ) : calls && calls.length > 0 ? (
                      calls.map((call) => (
                        <Radio key={call.CallId} value={call.CallId} className="mb-3 py-2">
                          <RadioIndicator>
                            <RadioIcon as={CircleIcon} />
                          </RadioIndicator>
                          <RadioLabel>
                            <VStack>
                              <Text className="font-bold">
                                {call.Number} - {call.Name}
                              </Text>
                              <Text className="text-sm text-gray-600 dark:text-gray-400">{call.Address}</Text>
                            </VStack>
                          </RadioLabel>
                        </Radio>
                      ))
                    ) : (
                      <Text className="mt-4 italic text-gray-600 dark:text-gray-400">{t('calls.no_calls_available')}</Text>
                    )}
                  </RadioGroup>
                )}

                {selectedTab === 'stations' && (
                  <RadioGroup value={selectedGroup?.GroupId || ''} onChange={handleGroupSelect}>
                    {isLoadingGroups ? (
                      <VStack space="md" className="w-full items-center justify-center">
                        <Spinner size="large" />
                        <Text className="text-center text-gray-600 dark:text-gray-400">{t('personnel.status.loading_stations')}</Text>
                      </VStack>
                    ) : groups && groups.length > 0 ? (
                      groups.map((group) => (
                        <Radio key={group.GroupId} value={group.GroupId} className="mb-3 py-2">
                          <RadioIndicator>
                            <RadioIcon as={CircleIcon} />
                          </RadioIndicator>
                          <RadioLabel>
                            <VStack>
                              <Text className="font-bold">{group.Name}</Text>
                              {group.Address && <Text className="text-sm text-gray-600 dark:text-gray-400">{group.Address}</Text>}
                              {group.GroupType && <Text className="text-xs text-gray-500 dark:text-gray-500">{group.GroupType}</Text>}
                            </VStack>
                          </RadioLabel>
                        </Radio>
                      ))
                    ) : (
                      <Text className="mt-4 italic text-gray-600 dark:text-gray-400">{t('personnel.status.no_stations_available')}</Text>
                    )}
                  </RadioGroup>
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
