import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, useWindowDimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { FormControl, FormControlLabel, FormControlLabelText } from '@/components/ui/form-control';
import { HStack } from '@/components/ui/hstack';
import { Select, SelectBackdrop, SelectContent, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { useCallDetailStore } from '@/stores/calls/detail-store';
import { useCallsStore } from '@/stores/calls/store';
import { useToastStore } from '@/stores/toast/store';

interface CloseCallBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
  isLoading?: boolean;
}

export const CloseCallBottomSheet: React.FC<CloseCallBottomSheetProps> = ({ isOpen, onClose, callId, isLoading = false }) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const showToast = useToastStore((state) => state.showToast);
  const { closeCall } = useCallDetailStore();
  const { fetchCalls } = useCallsStore();
  const [closeCallType, setCloseCallType] = useState('');
  const [closeCallNote, setCloseCallNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track if modal was actually opened to avoid false close events
  const wasModalOpenRef = useRef(false);

  // Track analytics when modal becomes visible
  useFocusEffect(
    useCallback(() => {
      if (isOpen) {
        wasModalOpenRef.current = true;
        try {
          trackEvent('close_call_bottom_sheet_viewed', {
            timestamp: new Date().toISOString(),
            callId,
            isLoading,
          });
        } catch (error) {
          // Analytics errors should not break the component
          console.warn('Failed to track close call bottom sheet analytics:', error);
        }
      }
    }, [isOpen, trackEvent, callId, isLoading])
  );

  const handleClose = React.useCallback(() => {
    // Only track close analytics if modal was actually opened
    if (wasModalOpenRef.current) {
      try {
        trackEvent('close_call_bottom_sheet_closed', {
          timestamp: new Date().toISOString(),
          callId,
          wasManualClose: true,
          hadCloseCallType: closeCallType.trim().length > 0,
          hadCloseCallNote: closeCallNote.trim().length > 0,
        });
      } catch (error) {
        console.warn('Failed to track close call bottom sheet close analytics:', error);
      }
      wasModalOpenRef.current = false;
    }

    setCloseCallType('');
    setCloseCallNote('');
    onClose();
  }, [onClose, trackEvent, callId, closeCallType, closeCallNote]);

  const handleSubmit = React.useCallback(async () => {
    if (!closeCallType) {
      showToast('error', t('call_detail.close_call_type_required'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Track call closure attempt analytics
      try {
        trackEvent('close_call_attempted', {
          timestamp: new Date().toISOString(),
          callId,
          closeType: parseInt(closeCallType),
          hasNote: closeCallNote.trim().length > 0,
          noteLength: closeCallNote.trim().length,
        });
      } catch (error) {
        console.warn('Failed to track close call attempt analytics:', error);
      }

      // Call the closeCall API
      await closeCall({
        callId,
        type: parseInt(closeCallType),
        note: closeCallNote,
      });

      // Track successful call closure analytics
      try {
        trackEvent('close_call_succeeded', {
          timestamp: new Date().toISOString(),
          callId,
          closeType: parseInt(closeCallType),
          hasNote: closeCallNote.trim().length > 0,
          noteLength: closeCallNote.trim().length,
        });
      } catch (error) {
        console.warn('Failed to track close call success analytics:', error);
      }

      // Show success toast
      showToast('success', t('call_detail.close_call_success'));

      // Close the bottom sheet
      handleClose();

      // Navigate back to the calls list and refresh it
      router.replace('/(app)/home/calls');
      await fetchCalls();
    } catch (error) {
      console.error('Error closing call:', error);

      // Track failed call closure analytics
      try {
        trackEvent('close_call_failed', {
          timestamp: new Date().toISOString(),
          callId,
          closeType: parseInt(closeCallType),
          hasNote: closeCallNote.trim().length > 0,
          noteLength: closeCallNote.trim().length,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (analyticsError) {
        console.warn('Failed to track close call failure analytics:', analyticsError);
      }

      // Show error toast
      showToast('error', t('call_detail.close_call_error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [closeCallType, showToast, t, callId, closeCallNote, handleClose, fetchCalls, router, closeCall, trackEvent]);

  // Handle close call type change with analytics tracking
  const handleCloseCallTypeChange = useCallback(
    (value: string) => {
      setCloseCallType(value);

      // Track analytics for close call type selection
      try {
        trackEvent('close_call_type_selected', {
          timestamp: new Date().toISOString(),
          callId,
          closeType: parseInt(value),
          previousType: closeCallType ? parseInt(closeCallType) : 0,
        });
      } catch (error) {
        console.warn('Failed to track close call type selection analytics:', error);
      }
    },
    [setCloseCallType, trackEvent, callId, closeCallType]
  );

  const isButtonDisabled = isLoading || isSubmitting;

  return (
    <CustomBottomSheet isOpen={isOpen} onClose={handleClose} isLoading={isButtonDisabled}>
      <KeyboardAwareScrollView keyboardShouldPersistTaps={Platform.OS === 'android' ? 'handled' : 'always'} showsVerticalScrollIndicator={false} bottomOffset={20} style={{ flexGrow: 0, width: '100%' }}>
        <VStack space="md" className="w-full p-4">
          <Text className="mb-4 text-center text-lg font-semibold text-gray-900 dark:text-white">{t('call_detail.close_call')}</Text>

          <FormControl>
            <FormControlLabel>
              <FormControlLabelText className="font-medium text-gray-900 dark:text-gray-100">{t('call_detail.close_call_type')}</FormControlLabelText>
            </FormControlLabel>
            <Select selectedValue={closeCallType} onValueChange={handleCloseCallTypeChange} testID="close-call-type-select">
              <SelectTrigger className="border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
                <SelectInput placeholder={t('call_detail.close_call_type_placeholder')} className="text-gray-900 dark:text-white" />
                <SelectIcon />
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent className="max-h-[60vh] bg-white pb-20 dark:bg-gray-900">
                  <SelectItem label={t('call_detail.close_call_types.closed')} value="1" />
                  <SelectItem label={t('call_detail.close_call_types.cancelled')} value="2" />
                  <SelectItem label={t('call_detail.close_call_types.unfounded')} value="3" />
                  <SelectItem label={t('call_detail.close_call_types.founded')} value="4" />
                  <SelectItem label={t('call_detail.close_call_types.minor')} value="5" />
                  <SelectItem label={t('call_detail.close_call_types.transferred')} value="6" />
                  <SelectItem label={t('call_detail.close_call_types.false_alarm')} value="7" />
                </SelectContent>
              </SelectPortal>
            </Select>
          </FormControl>

          <VStack space="sm">
            <Text className="font-medium text-gray-900 dark:text-gray-100">
              {t('call_detail.close_call_note')} ({t('common.optional')}):
            </Text>
            <Textarea size="md" className="min-h-[100px] w-full border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
              <TextareaInput placeholder={t('call_detail.close_call_note_placeholder')} value={closeCallNote} onChangeText={setCloseCallNote} className="text-gray-900 dark:text-white" testID="close-call-note-input" />
            </Textarea>
          </VStack>

          <HStack space="sm" className="mt-4 justify-between">
            <Button variant="outline" className="flex-1" onPress={handleClose} disabled={isButtonDisabled} size={isLandscape ? 'md' : 'sm'}>
              <ButtonText className={isLandscape ? '' : 'text-xs'}>{t('common.cancel')}</ButtonText>
            </Button>
            <Button className="flex-1 bg-blue-600" onPress={handleSubmit} disabled={isButtonDisabled} size={isLandscape ? 'md' : 'sm'}>
              <ButtonText className={`text-white ${isLandscape ? '' : 'text-xs'}`}>{t('call_detail.close_call')}</ButtonText>
            </Button>
          </HStack>
        </VStack>
      </KeyboardAwareScrollView>
    </CustomBottomSheet>
  );
};
