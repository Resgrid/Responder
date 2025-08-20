import { ArrowLeft, ArrowRight, CircleIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { useAnalytics } from '@/hooks/use-analytics';
import { translate } from '@/lib/i18n/utils';
import { invertColor } from '@/lib/utils';
import { useCoreStore } from '@/stores/app/core-store';
import { useStaffingBottomSheetStore } from '@/stores/staffing/staffing-bottom-sheet-store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Button, ButtonText } from '../ui/button';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '../ui/radio';
import { Text } from '../ui/text';
import { Textarea, TextareaInput } from '../ui/textarea';
import { VStack } from '../ui/vstack';

export const StaffingBottomSheet = () => {
  const { t, ready } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { isOpen, currentStep, selectedStaffing, note, isLoading, setCurrentStep, setSelectedStaffing, setNote, nextStep, previousStep, submitStaffing, reset } = useStaffingBottomSheetStore();

  const { activeStaffing } = useCoreStore();
  const { colorScheme } = useColorScheme();

  // Create a safe translation function that falls back to the direct translate function
  const safeT = React.useCallback(
    (key: string, options?: any): string => {
      if (ready) {
        return String(t(key, options));
      }
      // Fallback to the direct translate function if not ready
      return String(translate(key as any, options) || key);
    },
    [t, ready]
  );

  // Analytics tracking function
  const trackViewAnalytics = useCallback(() => {
    try {
      trackEvent('staffing_bottom_sheet_viewed', {
        timestamp: new Date().toISOString(),
        currentStep,
        selectedStaffingId: selectedStaffing?.Id ?? 0,
        selectedStaffingText: selectedStaffing?.Text ?? '',
        hasNote: note.length > 0,
        noteLength: note.length,
        availableStaffingCount: activeStaffing?.length || 0,
        colorScheme: colorScheme || 'light',
      });
    } catch (error) {
      // Analytics errors should not break the component
      console.warn('Failed to track staffing bottom sheet view analytics:', error);
    }
  }, [trackEvent, currentStep, selectedStaffing, note, activeStaffing, colorScheme]);

  // Track analytics when sheet becomes visible or step changes
  useEffect(() => {
    if (isOpen) {
      trackViewAnalytics();
    }
  }, [isOpen, currentStep, trackViewAnalytics]);

  const handleClose = () => {
    // Track close analytics
    try {
      trackEvent('staffing_bottom_sheet_closed', {
        timestamp: new Date().toISOString(),
        currentStep,
        selectedStaffingId: selectedStaffing?.Id ?? 0,
        hasNote: note.length > 0,
        completed: false, // User closed without completing
      });
    } catch (error) {
      console.warn('Failed to track staffing bottom sheet close analytics:', error);
    }

    reset();
  };

  const handleStaffingSelect = (staffingId: string) => {
    const staffing = activeStaffing?.find((s) => s.Id.toString() === staffingId);
    if (staffing) {
      setSelectedStaffing(staffing);

      // Track staffing selection analytics
      try {
        trackEvent('staffing_option_selected', {
          timestamp: new Date().toISOString(),
          staffingId: staffing.Id,
          staffingText: staffing.Text,
          currentStep,
        });
      } catch (error) {
        console.warn('Failed to track staffing selection analytics:', error);
      }
    }
  };

  const handleNext = () => {
    // Track step progression analytics
    try {
      trackEvent('staffing_bottom_sheet_step_next', {
        timestamp: new Date().toISOString(),
        fromStep: currentStep,
        toStep: currentStep === 'select-staffing' ? 'add-note' : 'confirm',
        selectedStaffingId: selectedStaffing?.Id ?? 0,
      });
    } catch (error) {
      console.warn('Failed to track step next analytics:', error);
    }

    nextStep();
  };

  const handlePrevious = () => {
    // Track step regression analytics
    try {
      trackEvent('staffing_bottom_sheet_step_previous', {
        timestamp: new Date().toISOString(),
        fromStep: currentStep,
        toStep: currentStep === 'confirm' ? 'add-note' : 'select-staffing',
        selectedStaffingId: selectedStaffing?.Id ?? 0,
      });
    } catch (error) {
      console.warn('Failed to track step previous analytics:', error);
    }

    previousStep();
  };

  const handleSubmit = async () => {
    // Track submit analytics
    try {
      trackEvent('staffing_bottom_sheet_submitted', {
        timestamp: new Date().toISOString(),
        selectedStaffingId: selectedStaffing?.Id ?? 0,
        selectedStaffingText: selectedStaffing?.Text ?? '',
        hasNote: note.length > 0,
        noteLength: note.length,
        completed: true, // User completed the flow
      });
    } catch (error) {
      console.warn('Failed to track staffing submit analytics:', error);
    }

    await submitStaffing();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'select-staffing':
        return t('home.staffing.select_staffing_level');
      case 'add-note':
        return t('home.staffing.add_note');
      case 'confirm':
        return t('home.staffing.confirm_staffing', { staffing: selectedStaffing?.Text });
      default:
        return t('home.staffing.set_staffing');
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'select-staffing':
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
      case 'select-staffing':
        return selectedStaffing !== null;
      case 'add-note':
        if (selectedStaffing?.Note === 2) {
          return note.trim().length > 0; // Note is not optional, but if provided, it must not be empty
        }
        return true; // Note is optional
      case 'confirm':
        return true;
      default:
        return false;
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
          {/* Step indicator */}
          <HStack space="sm" className="mb-2 justify-center">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('common.step')} {getStepNumber()} {t('common.of')} 3
            </Text>
          </HStack>

          <Heading size="lg" className="mb-4 text-center">
            {getStepTitle()}
          </Heading>

          {currentStep === 'select-staffing' && (
            <VStack space="md" className="w-full">
              <Text className="mb-2 font-medium">{safeT('home.staffing.select_staffing_level_description')}</Text>

              <ScrollView className="max-h-[400px]">
                <RadioGroup value={selectedStaffing?.Id.toString() || ''} onChange={handleStaffingSelect}>
                  {activeStaffing && activeStaffing.length > 0 ? (
                    activeStaffing.map((staffing) => (
                      <Radio key={staffing.Id} value={staffing.Id.toString()} className="mb-3 py-2">
                        <RadioIndicator>
                          <RadioIcon as={CircleIcon} />
                        </RadioIndicator>
                        <RadioLabel>
                          <VStack>
                            <HStack space="sm" className="items-center">
                              <Text className="min-w-[60px] rounded px-2 py-1 text-center text-xs font-bold text-white" style={{ backgroundColor: staffing.BColor, color: invertColor(staffing.BColor, true) }}>
                                {staffing.Text}
                              </Text>
                            </HStack>
                          </VStack>
                        </RadioLabel>
                      </Radio>
                    ))
                  ) : (
                    <Text className="mt-4 italic text-gray-600 dark:text-gray-400">{safeT('home.staffing.no_staffing_options')}</Text>
                  )}
                </RadioGroup>
              </ScrollView>

              <HStack space="sm" className="mt-4 justify-end">
                <Button onPress={handleNext} isDisabled={!canProceedFromCurrentStep()} className="bg-blue-600">
                  <ButtonText>{safeT('common.next')}</ButtonText>
                  <ArrowRight size={16} color={colorScheme === 'dark' ? '#fff' : '#fff'} />
                </Button>
              </HStack>
            </VStack>
          )}

          {currentStep === 'add-note' && (
            <VStack space="md" className="w-full">
              <VStack space="sm">
                <Text className="font-medium">{safeT('home.staffing.selected_staffing')}:</Text>
                <HStack space="sm" className="items-center">
                  <Text className="rounded px-2 py-1 text-sm font-bold text-white" style={{ backgroundColor: selectedStaffing?.BColor, color: invertColor(selectedStaffing?.BColor || '#000000', true) }}>
                    {selectedStaffing?.Text}
                  </Text>
                </HStack>
              </VStack>

              <VStack space="sm">
                <Text className="font-medium">
                  {safeT('home.staffing.note')} ({safeT('common.optional')}):
                </Text>
                <Textarea size="md" className="min-h-[100px] w-full">
                  <TextareaInput placeholder={safeT('home.staffing.note_placeholder')} value={note} onChangeText={setNote} />
                </Textarea>
              </VStack>

              <HStack space="sm" className="mt-4 justify-between">
                <Button variant="outline" onPress={handlePrevious} className="flex-1">
                  <ArrowLeft size={16} color={colorScheme === 'dark' ? '#737373' : '#737373'} />
                  <ButtonText>{safeT('common.previous')}</ButtonText>
                </Button>
                <Button onPress={handleNext} isDisabled={!canProceedFromCurrentStep()} className="flex-1 bg-blue-600">
                  <ButtonText>{safeT('common.next')}</ButtonText>
                  <ArrowRight size={16} color={colorScheme === 'dark' ? '#fff' : '#fff'} />
                </Button>
              </HStack>
            </VStack>
          )}

          {currentStep === 'confirm' && (
            <VStack space="md" className="w-full">
              <Text className="mb-4 text-center text-lg font-semibold">{safeT('home.staffing.review_and_confirm')}</Text>

              <VStack space="sm" className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                <VStack space="xs">
                  <Text className="font-medium">{safeT('home.staffing.staffing_level')}:</Text>
                  <HStack space="sm" className="items-center">
                    <Text className="rounded px-2 py-1 text-sm font-bold text-white" style={{ backgroundColor: selectedStaffing?.BColor, color: invertColor(selectedStaffing?.BColor || '#000000', true) }}>
                      {selectedStaffing?.Text}
                    </Text>
                  </HStack>
                </VStack>

                {note && (
                  <VStack space="xs">
                    <Text className="font-medium">{safeT('home.staffing.note')}:</Text>
                    <Text className="text-sm">{note}</Text>
                  </VStack>
                )}
              </VStack>

              <HStack space="sm" className="mt-4 justify-between">
                <Button variant="outline" onPress={handlePrevious} className="flex-1" isDisabled={isLoading}>
                  <ArrowLeft size={16} color={colorScheme === 'dark' ? '#737373' : '#737373'} />
                  <ButtonText>{safeT('common.previous')}</ButtonText>
                </Button>
                <Button onPress={handleSubmit} isDisabled={isLoading} className="flex-1 bg-green-600">
                  <ButtonText>{isLoading ? safeT('common.submitting') : safeT('common.submit')}</ButtonText>
                </Button>
              </HStack>
            </VStack>
          )}
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
};
