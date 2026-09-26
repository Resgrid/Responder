import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { formatShiftDate, formatShiftTime, getShiftErrorTranslationKey } from '@/lib/shift-utils';
import { type PendingShiftSignupResultData } from '@/models/v4/shifts/pendingShiftSignupResultData';
import { ShiftDayMyStatus } from '@/models/v4/shifts/shiftEnums';
import { type ShiftActionOutcome, useShiftsStore } from '@/stores/shifts/store';
import { useToastStore } from '@/stores/toast/store';

import { ShiftSelectRow } from './shift-select-row';
import { type ShiftTradeAction } from './shift-trade-card';

/** A confirmation the Trades or Approvals view asks for before calling the server. */
export type ShiftSheetAction = ShiftTradeAction | { kind: 'review-signup'; signup: PendingShiftSignupResultData; approve: boolean };

interface ShiftActionSheetProps {
  action: ShiftSheetAction | null;
  onClose: () => void;
}

const NO_SWAP = '';

interface SheetCopy {
  title: string;
  description: string;
  confirm: string;
  tone: 'primary' | 'positive' | 'negative';
  withNote: boolean;
}

export const ShiftActionSheet: React.FC<ShiftActionSheetProps> = ({ action, onClose }) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const showToast = useToastStore((state) => state.showToast);

  const myShiftDays = useShiftsStore((state) => state.myShiftDays);
  const activeMutation = useShiftsStore((state) => state.activeMutation);
  const respondToTrade = useShiftsStore((state) => state.respondToTrade);
  const finishTrade = useShiftsStore((state) => state.finishTrade);
  const cancelTrade = useShiftsStore((state) => state.cancelTrade);
  const reviewTrade = useShiftsStore((state) => state.reviewTrade);
  const reviewSignup = useShiftsStore((state) => state.reviewSignup);

  const [note, setNote] = useState('');
  const [offeredSignupId, setOfferedSignupId] = useState<string>(NO_SWAP);

  useEffect(() => {
    setNote('');
    setOfferedSignupId(NO_SWAP);
  }, [action]);

  // An accepted trade may offer one of the caller's own approved, upcoming sign-ups back.
  const swapOptions = useMemo(() => {
    if (action?.kind !== 'accept-trade') return [];
    return myShiftDays.filter((day) => !!day.MySignupId && day.MyStatus === ShiftDayMyStatus.OnRoster && !day.MyTradeId && day.ShiftDayId !== action.trade.ShiftDayId);
  }, [action, myShiftDays]);

  const copy: SheetCopy | null = useMemo(() => {
    if (!action) return null;
    switch (action.kind) {
      case 'accept-trade':
        return { title: t('shifts.trade.accept_title'), description: t('shifts.trade.accept_description'), confirm: t('shifts.actions.accept'), tone: 'positive', withNote: true };
      case 'decline-trade':
        return { title: t('shifts.trade.decline_title'), description: t('shifts.trade.decline_description'), confirm: t('shifts.actions.decline'), tone: 'negative', withNote: true };
      case 'cancel-trade':
        return { title: t('shifts.trade.cancel_title'), description: t('shifts.trade.cancel_description'), confirm: t('shifts.actions.cancel_trade'), tone: 'negative', withNote: false };
      case 'finish-trade':
        return {
          title: t('shifts.trade.finish_title'),
          description: action.offeredShift
            ? t('shifts.trade.finish_swap_description', { name: action.user.Name, shift: action.offeredShift.ShiftName, date: formatShiftDate(action.offeredShift.ShiftDay) })
            : t('shifts.trade.finish_give_description', { name: action.user.Name }),
          confirm: t('shifts.actions.confirm'),
          tone: 'primary',
          withNote: false,
        };
      case 'review-trade':
        return {
          title: action.approve ? t('shifts.review.approve_trade_title') : t('shifts.review.deny_trade_title'),
          description: t('shifts.review.trade_summary', { from: action.trade.SourceUserName, to: action.trade.AcceptedUserName || t('shifts.unknown') }),
          confirm: action.approve ? t('shifts.actions.approve') : t('shifts.actions.deny'),
          tone: action.approve ? 'positive' : 'negative',
          withNote: true,
        };
      case 'review-signup':
        return {
          title: action.approve ? t('shifts.review.approve_signup_title') : t('shifts.review.deny_signup_title'),
          description: `${action.signup.UserName} · ${action.signup.GroupName}`,
          confirm: action.approve ? t('shifts.actions.approve') : t('shifts.actions.deny'),
          tone: action.approve ? 'positive' : 'negative',
          withNote: true,
        };
      default:
        return null;
    }
  }, [action, t]);

  const subject = useMemo(() => {
    if (!action) return '';
    if (action.kind === 'review-signup') {
      return `${action.signup.ShiftName} · ${formatShiftDate(action.signup.ShiftDay || action.signup.Start)} · ${formatShiftTime(action.signup.Start)} – ${formatShiftTime(action.signup.End)}`;
    }
    return `${action.trade.ShiftName} · ${formatShiftDate(action.trade.ShiftDay || action.trade.Start)} · ${formatShiftTime(action.trade.Start)} – ${formatShiftTime(action.trade.End)}`;
  }, [action]);

  const handleConfirm = useCallback(async () => {
    if (!action) return;
    const trimmed = note.trim();
    let outcome: ShiftActionOutcome;
    let successKey: string;

    switch (action.kind) {
      case 'accept-trade':
        outcome = await respondToTrade(action.trade.ShiftSignupTradeId, true, trimmed, offeredSignupId ? [offeredSignupId] : []);
        successKey = 'shifts.toast.trade_accepted';
        break;
      case 'decline-trade':
        outcome = await respondToTrade(action.trade.ShiftSignupTradeId, false, trimmed, []);
        successKey = 'shifts.toast.trade_declined';
        break;
      case 'cancel-trade':
        outcome = await cancelTrade(action.trade.ShiftSignupTradeId);
        successKey = 'shifts.toast.trade_cancelled';
        break;
      case 'finish-trade':
        outcome = await finishTrade(action.trade.ShiftSignupTradeId, action.user.UserId, action.offeredShift?.ShiftSignupId ?? null);
        successKey = outcome.approvalPending ? 'shifts.toast.trade_finished_pending' : 'shifts.toast.trade_finished';
        break;
      case 'review-trade':
        outcome = await reviewTrade(action.trade.ShiftSignupTradeId, action.approve, trimmed);
        successKey = action.approve ? 'shifts.toast.approved' : 'shifts.toast.denied';
        break;
      case 'review-signup':
        outcome = await reviewSignup(action.signup.ShiftSignupId, action.approve, trimmed);
        successKey = action.approve ? 'shifts.toast.approved' : 'shifts.toast.denied';
        break;
      default:
        return;
    }

    trackEvent('shift_action_submitted', { timestamp: new Date().toISOString(), kind: action.kind, success: outcome.success, errorCode: outcome.errorCode ?? '' });

    if (outcome.success) {
      showToast('success', t(successKey));
      onClose();
    } else {
      showToast('error', t(getShiftErrorTranslationKey(outcome.errorCode)));
    }
  }, [action, note, offeredSignupId, respondToTrade, cancelTrade, finishTrade, reviewTrade, reviewSignup, trackEvent, showToast, t, onClose]);

  const isOpen = action !== null;
  const isBusy = activeMutation !== null;

  return (
    <CustomBottomSheet isOpen={isOpen} onClose={onClose} snapPoints={[70]} minHeight="min-h-[320px]" testID="shift-action-sheet">
      {action && copy ? (
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
          <VStack space="md" className="p-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white" accessibilityRole="header">
              {copy.title}
            </Text>
            <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">{subject}</Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">{copy.description}</Text>

            {action.kind === 'accept-trade' ? (
              <VStack space="sm" testID="shift-action-swap-options">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">{t('shifts.trade.offer_back')}</Text>
                <ShiftSelectRow id={NO_SWAP} mode="radio" title={t('shifts.trade.no_swap')} selected={offeredSignupId === NO_SWAP} onToggle={setOfferedSignupId} testID="swap-option-none" />
                {swapOptions.map((day) => (
                  <ShiftSelectRow
                    key={day.MySignupId}
                    id={day.MySignupId}
                    mode="radio"
                    title={day.ShiftName}
                    subtitle={`${formatShiftDate(day.ShiftDay || day.Start)} · ${formatShiftTime(day.Start)} – ${formatShiftTime(day.End)}`}
                    selected={offeredSignupId === day.MySignupId}
                    onToggle={setOfferedSignupId}
                    testID={`swap-option-${day.MySignupId}`}
                  />
                ))}
              </VStack>
            ) : null}

            {action.kind === 'finish-trade' && action.trade.RequireApproval ? <Text className="text-sm text-amber-700 dark:text-amber-400">{t('shifts.trade.finish_pending_note')}</Text> : null}

            {copy.withNote ? (
              <VStack space="xs">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('shifts.note_label')}</Text>
                <Textarea size="md" className="min-h-[80px] w-full">
                  <TextareaInput value={note} onChangeText={setNote} placeholder={t('shifts.note_optional_placeholder')} accessibilityLabel={t('shifts.note_label')} testID="shift-action-note" />
                </Textarea>
              </VStack>
            ) : null}

            <HStack space="sm" className="mt-2">
              <Button variant="outline" action="secondary" className="flex-1" onPress={onClose} isDisabled={isBusy} testID="shift-action-cancel">
                <ButtonText>{t('common.cancel')}</ButtonText>
              </Button>
              <Button action={copy.tone} className="flex-1" onPress={handleConfirm} isDisabled={isBusy} accessibilityState={{ disabled: isBusy, busy: isBusy }} testID="shift-action-confirm">
                {isBusy ? <ButtonSpinner /> : null}
                <ButtonText>{copy.confirm}</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </ScrollView>
      ) : null}
    </CustomBottomSheet>
  );
};
