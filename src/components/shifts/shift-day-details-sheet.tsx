import { AlertCircle, CheckCircle, Clock, Repeat, UserMinus, UserPlus } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, useWindowDimensions } from 'react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Box } from '@/components/ui/box';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { useAuthStore } from '@/lib/auth';
import { canManageRosterEntry, formatShiftLongDate, formatShiftTime, getGroupOpenSlots, getManageableGroups, getShiftErrorTranslationKey, isOvernightShift } from '@/lib/shift-utils';
import { type ShiftDayGroupNeedsResultData, type ShiftDayResultData, type ShiftDayRosterResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftDayMyStatus } from '@/models/v4/shifts/shiftEnums';
import { type ShiftActionOutcome, type ShiftMutationKind, useShiftsStore } from '@/stores/shifts/store';
import { useToastStore } from '@/stores/toast/store';

import { canRequestTradeForDay, canWithdrawFromDay, getAssignmentTypeKey, getMyStatusLabel, getRosterSourceLabel } from './shift-labels';
import { ShiftSelectRow } from './shift-select-row';

interface ShiftDayDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type DayPanel = 'details' | 'signup' | 'withdraw' | 'trade' | 'cancel-trade' | 'add' | 'remove' | 'review';

interface RosterGroup {
  key: string;
  name: string;
  entries: ShiftDayRosterResultData[];
}

const groupRoster = (roster: ShiftDayRosterResultData[], noGroupLabel: string): RosterGroup[] => {
  const groups = new Map<string, RosterGroup>();
  roster.forEach((entry) => {
    const key = entry.GroupId || '';
    const existing = groups.get(key) ?? { key, name: entry.GroupName || noGroupLabel, entries: [] };
    existing.entries.push(entry);
    groups.set(key, existing);
  });
  return Array.from(groups.values());
};

interface RosterRowProps {
  entry: ShiftDayRosterResultData;
  isMe: boolean;
  canManage: boolean;
  onReview: (entry: ShiftDayRosterResultData, approve: boolean) => void;
  onRemove: (entry: ShiftDayRosterResultData) => void;
}

const RosterRow: React.FC<RosterRowProps> = React.memo(({ entry, isMe, canManage, onReview, onRemove }) => {
  const { t } = useTranslation();
  const source = getRosterSourceLabel(entry.Source);
  const roles = (entry.Roles ?? []).join(', ');

  const handleApprove = useCallback(() => onReview(entry, true), [entry, onReview]);
  const handleDeny = useCallback(() => onReview(entry, false), [entry, onReview]);
  const handleRemove = useCallback(() => onRemove(entry), [entry, onRemove]);

  return (
    <VStack space="xs" className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/60" testID={`roster-entry-${entry.UserId}`}>
      <HStack className="items-center justify-between" space="sm">
        <Text className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{entry.Name}</Text>
        {isMe ? (
          <Badge action="success" size="sm">
            <BadgeText>{t('shifts.you')}</BadgeText>
          </Badge>
        ) : null}
      </HStack>
      {roles ? <Text className="text-xs text-gray-600 dark:text-gray-400">{roles}</Text> : null}
      <HStack space="xs" className="flex-wrap">
        {entry.ApprovalPending ? (
          <Badge action="warning" size="sm" className="mb-1 mr-1" testID={`roster-pending-${entry.UserId}`}>
            <BadgeText>{t('shifts.status.pending_approval')}</BadgeText>
          </Badge>
        ) : null}
        <Badge action={source.action} size="sm" className="mb-1 mr-1">
          <BadgeText>{t(source.key)}</BadgeText>
        </Badge>
        {entry.TradedFromName ? (
          <Badge action="info" size="sm" className="mb-1 mr-1" testID={`roster-trade-${entry.UserId}`}>
            <BadgeText>{t('shifts.day.covering_for', { name: entry.TradedFromName })}</BadgeText>
          </Badge>
        ) : null}
      </HStack>
      {canManage ? (
        <HStack space="sm" className="mt-1 flex-wrap">
          {entry.ApprovalPending && entry.ShiftSignupId ? (
            <>
              <Button size="sm" action="positive" onPress={handleApprove} accessibilityLabel={t('shifts.review.approve_person', { name: entry.Name })} testID={`roster-approve-${entry.UserId}`}>
                <ButtonText>{t('shifts.actions.approve')}</ButtonText>
              </Button>
              <Button size="sm" action="negative" variant="outline" onPress={handleDeny} accessibilityLabel={t('shifts.review.deny_person', { name: entry.Name })} testID={`roster-deny-${entry.UserId}`}>
                <ButtonText>{t('shifts.actions.deny')}</ButtonText>
              </Button>
            </>
          ) : null}
          <Button size="sm" action="negative" variant="link" onPress={handleRemove} accessibilityLabel={t('shifts.remove_panel.remove_person', { name: entry.Name })} testID={`roster-remove-${entry.UserId}`}>
            <UserMinus size={14} color="#dc2626" />
            <ButtonText>{t('shifts.actions.remove')}</ButtonText>
          </Button>
        </HStack>
      ) : null}
    </VStack>
  );
});

RosterRow.displayName = 'RosterRow';

interface GroupNeedsCardProps {
  group: ShiftDayGroupNeedsResultData;
}

const GroupNeedsCard: React.FC<GroupNeedsCardProps> = React.memo(({ group }) => {
  const { t } = useTranslation();
  const open = getGroupOpenSlots(group);
  return (
    <Card className="mb-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800" testID={`group-needs-${group.GroupId}`}>
      <HStack className="items-center justify-between">
        <Text className="font-semibold text-gray-900 dark:text-white">{group.GroupName}</Text>
        <Badge action={open > 0 ? 'warning' : 'success'} size="sm">
          <BadgeText>{open > 0 ? t('shifts.day.group_open', { count: open }) : t('shifts.day.group_filled')}</BadgeText>
        </Badge>
      </HStack>
      {(group.GroupNeeds ?? []).length > 0 ? (
        <VStack space="xs" className="mt-2">
          {group.GroupNeeds.map((role) => (
            <HStack key={role.RoleId} className="items-center justify-between">
              <Text className="text-sm text-gray-700 dark:text-gray-300">{role.RoleName}</Text>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('shifts.needed')}: {role.Needed}
              </Text>
            </HStack>
          ))}
        </VStack>
      ) : (
        <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('shifts.day.no_role_requirements')}</Text>
      )}
    </Card>
  );
});

GroupNeedsCard.displayName = 'GroupNeedsCard';

export const ShiftDayDetailsSheet: React.FC<ShiftDayDetailsSheetProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const userId = useAuthStore((state) => state.userId);
  const { colorScheme } = useColorScheme();
  const { trackEvent } = useAnalytics();
  const showToast = useToastStore((state) => state.showToast);

  const selectedShiftDay = useShiftsStore((state) => state.selectedShiftDay);
  const isShiftDayLoading = useShiftsStore((state) => state.isShiftDayLoading);
  const activeMutation = useShiftsStore((state) => state.activeMutation);
  const tradeCandidates = useShiftsStore((state) => state.tradeCandidates);
  const isCandidatesLoading = useShiftsStore((state) => state.isCandidatesLoading);
  const personnelOptions = useShiftsStore((state) => state.personnelOptions);
  const isPersonnelOptionsLoading = useShiftsStore((state) => state.isPersonnelOptionsLoading);
  const signupForShift = useShiftsStore((state) => state.signupForShift);
  const withdrawFromShift = useShiftsStore((state) => state.withdrawFromShift);
  const requestTrade = useShiftsStore((state) => state.requestTrade);
  const cancelTrade = useShiftsStore((state) => state.cancelTrade);
  const reviewSignup = useShiftsStore((state) => state.reviewSignup);
  const assignToShiftDay = useShiftsStore((state) => state.assignToShiftDay);
  const removeFromShiftDay = useShiftsStore((state) => state.removeFromShiftDay);
  const fetchTradeCandidates = useShiftsStore((state) => state.fetchTradeCandidates);
  const fetchPersonnelOptions = useShiftsStore((state) => state.fetchPersonnelOptions);

  const [panel, setPanel] = useState<DayPanel>('details');
  const [signupGroupId, setSignupGroupId] = useState<string>('');
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [addGroupId, setAddGroupId] = useState<string>('');
  const [addUserId, setAddUserId] = useState<string>('');
  const [personSearch, setPersonSearch] = useState('');
  const [targetEntry, setTargetEntry] = useState<ShiftDayRosterResultData | null>(null);
  const [reviewApprove, setReviewApprove] = useState(true);

  const dayId = selectedShiftDay?.ShiftDayId ?? '';

  // A different day (or closing the sheet) starts again from the overview.
  useEffect(() => {
    setPanel('details');
    setNote('');
    setCandidateIds([]);
    setAddUserId('');
    setPersonSearch('');
    setTargetEntry(null);
  }, [dayId, isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedShiftDay) return;
    try {
      trackEvent('shift_day_details_viewed', {
        timestamp: new Date().toISOString(),
        shiftDayId: selectedShiftDay.ShiftDayId,
        shiftName: selectedShiftDay.ShiftName,
        shiftType: selectedShiftDay.ShiftType,
        openSlots: selectedShiftDay.OpenSlots,
        myStatus: selectedShiftDay.MyStatus,
        canManage: selectedShiftDay.CanManage,
        isLandscape,
        colorScheme: colorScheme || 'light',
      });
    } catch (error) {
      console.warn('Failed to track shift day details view analytics:', error);
    }
    // Once per opened day, not on every roster refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dayId]);

  const handleClose = useCallback(() => {
    if (selectedShiftDay) {
      try {
        trackEvent('shift_day_details_closed', {
          timestamp: new Date().toISOString(),
          shiftDayId: selectedShiftDay.ShiftDayId,
          myStatus: selectedShiftDay.MyStatus,
        });
      } catch (error) {
        console.warn('Failed to track shift day details close analytics:', error);
      }
    }
    onClose();
  }, [selectedShiftDay, trackEvent, onClose]);

  /** Toast + analytics for a finished action. Events are `<action>_success` / `<action>_failed`. */
  const notify = useCallback(
    (outcome: ShiftActionOutcome, successKey: string, events: { success: string; failed: string }) => {
      trackEvent(outcome.success ? events.success : events.failed, { timestamp: new Date().toISOString(), shiftDayId: dayId, errorCode: outcome.errorCode ?? '', approvalPending: outcome.approvalPending });
      if (outcome.success) {
        showToast('success', t(successKey));
        setPanel('details');
        setNote('');
      } else {
        showToast('error', t(getShiftErrorTranslationKey(outcome.errorCode)));
      }
    },
    [dayId, showToast, t, trackEvent]
  );

  const manageableGroups = useMemo(() => (selectedShiftDay ? getManageableGroups(selectedShiftDay) : []), [selectedShiftDay]);
  const rosterGroups = useMemo(() => groupRoster(selectedShiftDay?.Roster ?? [], t('shifts.day.no_group')), [selectedShiftDay, t]);

  const filteredPersonnel = useMemo(() => {
    const query = personSearch.trim().toLowerCase();
    if (!query) return personnelOptions;
    return personnelOptions.filter((option) => option.Name.toLowerCase().includes(query) || (option.GroupName ?? '').toLowerCase().includes(query));
  }, [personnelOptions, personSearch]);

  // Panel openers
  const openSignup = useCallback(() => {
    // Preselect only when there is no choice to make; otherwise the responder picks their team.
    const needs = selectedShiftDay?.Needs ?? [];
    setSignupGroupId(needs.length === 1 ? (needs[0]?.GroupId ?? '') : '');
    setPanel('signup');
  }, [selectedShiftDay]);

  const openWithdraw = useCallback(() => {
    setPanel('withdraw');
  }, []);

  const openCancelTrade = useCallback(() => {
    setPanel('cancel-trade');
  }, []);

  const openTrade = useCallback(() => {
    if (!selectedShiftDay) return;
    setCandidateIds([]);
    setNote('');
    setPanel('trade');
    void fetchTradeCandidates(selectedShiftDay.ShiftDayId);
  }, [selectedShiftDay, fetchTradeCandidates]);

  const openAdd = useCallback(() => {
    if (!selectedShiftDay) return;
    setAddGroupId(manageableGroups[0]?.GroupId ?? '');
    setAddUserId('');
    setPersonSearch('');
    setPanel('add');
    void fetchPersonnelOptions(selectedShiftDay.ShiftDayId);
  }, [selectedShiftDay, manageableGroups, fetchPersonnelOptions]);

  const openRemove = useCallback((entry: ShiftDayRosterResultData) => {
    setTargetEntry(entry);
    setNote('');
    setPanel('remove');
  }, []);

  const openReview = useCallback((entry: ShiftDayRosterResultData, approve: boolean) => {
    setTargetEntry(entry);
    setReviewApprove(approve);
    setNote('');
    setPanel('review');
  }, []);

  const backToDetails = useCallback(() => {
    setPanel('details');
    setNote('');
  }, []);

  const toggleCandidate = useCallback((id: string) => {
    setCandidateIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }, []);

  // Submitters
  const submitSignup = useCallback(async () => {
    if (!selectedShiftDay || !signupGroupId) return;
    trackEvent('shift_day_signup_attempted', { timestamp: new Date().toISOString(), shiftDayId: selectedShiftDay.ShiftDayId, groupId: signupGroupId });
    const outcome = await signupForShift(selectedShiftDay.ShiftDayId, signupGroupId);
    notify(outcome, outcome.approvalPending ? 'shifts.toast.signup_pending' : 'shifts.signup_success', { success: 'shift_day_signup_success', failed: 'shift_day_signup_failed' });
  }, [selectedShiftDay, signupGroupId, signupForShift, notify, trackEvent]);

  const submitWithdraw = useCallback(async () => {
    if (!selectedShiftDay?.MySignupId) return;
    const outcome = await withdrawFromShift(selectedShiftDay.ShiftDayId, selectedShiftDay.MySignupId);
    notify(outcome, 'shifts.withdraw_success', { success: 'shift_day_withdraw_success', failed: 'shift_day_withdraw_failed' });
  }, [selectedShiftDay, withdrawFromShift, notify]);

  const submitTrade = useCallback(async () => {
    if (!selectedShiftDay || candidateIds.length === 0) return;
    const outcome = await requestTrade(selectedShiftDay.ShiftDayId, candidateIds, note.trim());
    notify(outcome, 'shifts.toast.trade_requested', { success: 'shift_day_trade_request_success', failed: 'shift_day_trade_request_failed' });
  }, [selectedShiftDay, candidateIds, note, requestTrade, notify]);

  const submitCancelTrade = useCallback(async () => {
    if (!selectedShiftDay?.MyTradeId) return;
    const outcome = await cancelTrade(selectedShiftDay.MyTradeId);
    notify(outcome, 'shifts.toast.trade_cancelled', { success: 'shift_day_trade_cancel_success', failed: 'shift_day_trade_cancel_failed' });
  }, [selectedShiftDay, cancelTrade, notify]);

  const submitAdd = useCallback(async () => {
    if (!selectedShiftDay || !addGroupId || !addUserId) return;
    const outcome = await assignToShiftDay(selectedShiftDay.ShiftDayId, addUserId, addGroupId);
    notify(outcome, 'shifts.toast.person_added', { success: 'shift_day_person_add_success', failed: 'shift_day_person_add_failed' });
  }, [selectedShiftDay, addGroupId, addUserId, assignToShiftDay, notify]);

  const submitRemove = useCallback(async () => {
    if (!selectedShiftDay || !targetEntry) return;
    const outcome = await removeFromShiftDay(selectedShiftDay.ShiftDayId, targetEntry.UserId, note.trim());
    notify(outcome, 'shifts.toast.person_removed', { success: 'shift_day_person_remove_success', failed: 'shift_day_person_remove_failed' });
  }, [selectedShiftDay, targetEntry, note, removeFromShiftDay, notify]);

  const submitReview = useCallback(async () => {
    if (!targetEntry?.ShiftSignupId) return;
    const outcome = await reviewSignup(targetEntry.ShiftSignupId, reviewApprove, note.trim());
    notify(outcome, reviewApprove ? 'shifts.toast.approved' : 'shifts.toast.denied', { success: 'shift_day_signup_review_success', failed: 'shift_day_signup_review_failed' });
  }, [targetEntry, reviewApprove, note, reviewSignup, notify]);

  if (!selectedShiftDay) {
    return (
      <CustomBottomSheet isOpen={isOpen} onClose={handleClose} isLoading={isShiftDayLoading} loadingText={t('shifts.loading_details')} snapPoints={[90]} minHeight="min-h-[400px]" testID="shift-day-details-sheet">
        {null}
      </CustomBottomSheet>
    );
  }

  const day: ShiftDayResultData = selectedShiftDay;
  const isBusy = (kind: ShiftMutationKind) => activeMutation === kind;
  const anyBusy = activeMutation !== null;
  const myStatus = getMyStatusLabel(day.MyStatus);
  const overnight = isOvernightShift(day.Start, day.End);
  const iconColor = colorScheme === 'dark' ? '#60a5fa' : '#2563eb';
  const canWithdraw = canWithdrawFromDay(day, userId);
  const canTrade = canRequestTradeForDay(day);
  const isRosterLoading = isShiftDayLoading && (day.Roster ?? []).length === 0;

  const renderNoteField = (placeholderKey: string, testID: string) => (
    <VStack space="xs">
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('shifts.note_label')}</Text>
      <Textarea size="md" className="min-h-[80px] w-full">
        <TextareaInput value={note} onChangeText={setNote} placeholder={t(placeholderKey)} accessibilityLabel={t('shifts.note_label')} testID={testID} />
      </Textarea>
    </VStack>
  );

  const renderPanelFooter = (confirmLabel: string, onConfirm: () => void, busy: boolean, disabled: boolean, action: 'primary' | 'positive' | 'negative', testID: string) => (
    <HStack space="sm" className="mt-2">
      <Button variant="outline" action="secondary" className="flex-1" onPress={backToDetails} isDisabled={busy} testID={`${testID}-back`}>
        <ButtonText>{t('common.back')}</ButtonText>
      </Button>
      <Button action={action} className="flex-1" onPress={onConfirm} isDisabled={disabled || busy} accessibilityState={{ disabled: disabled || busy, busy }} testID={testID}>
        {busy ? <ButtonSpinner /> : null}
        <ButtonText>{confirmLabel}</ButtonText>
      </Button>
    </HStack>
  );

  const renderDetails = () => (
    <VStack space="lg">
      {myStatus ? (
        <Card
          className={`p-3 ${day.MyStatus === ShiftDayMyStatus.OnRoster ? 'bg-green-50 dark:bg-green-900/30' : day.MyStatus === ShiftDayMyStatus.PendingApproval ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}
          testID="shift-day-my-status-card"
        >
          <HStack space="sm" className="items-center">
            {day.MyStatus === ShiftDayMyStatus.OnRoster ? <CheckCircle size={18} color="#059669" /> : <AlertCircle size={18} color={day.MyStatus === ShiftDayMyStatus.PendingApproval ? '#d97706' : '#dc2626'} />}
            <VStack className="flex-1">
              <Text className="font-semibold text-gray-900 dark:text-white">{t(myStatus.key)}</Text>
              {day.MyStatus === ShiftDayMyStatus.PendingApproval ? <Text className="text-sm text-gray-700 dark:text-gray-300">{t('shifts.day.pending_note')}</Text> : null}
              {day.MyStatus === ShiftDayMyStatus.Denied ? <Text className="text-sm text-gray-700 dark:text-gray-300">{t('shifts.day.denied_note')}</Text> : null}
            </VStack>
          </HStack>
        </Card>
      ) : null}

      {day.MyTradeId ? (
        <Card className="bg-blue-50 p-3 dark:bg-blue-900/30" testID="shift-day-trade-card">
          <HStack space="sm" className="items-center">
            <Repeat size={18} color={iconColor} />
            <Text className="flex-1 text-sm text-gray-800 dark:text-gray-200">{t('shifts.day.trade_pending_note')}</Text>
          </HStack>
        </Card>
      ) : null}

      {day.RequireApproval ? <Text className="text-sm text-gray-600 dark:text-gray-400">{t('shifts.day.require_approval_note')}</Text> : null}

      <VStack space="sm">
        {day.CanSignup ? (
          <Button action="primary" onPress={openSignup} isDisabled={isShiftDayLoading || anyBusy} accessibilityHint={t('shifts.signup_panel.hint')} testID="shift-day-signup-button">
            <UserPlus size={16} color="#ffffff" />
            <ButtonText>{t('shifts.signup')}</ButtonText>
          </Button>
        ) : null}
        {canTrade ? (
          <Button variant="outline" action="primary" onPress={openTrade} isDisabled={anyBusy} testID="shift-day-trade-button">
            <Repeat size={16} color={iconColor} />
            <ButtonText>{t('shifts.actions.request_trade')}</ButtonText>
          </Button>
        ) : null}
        {day.MyTradeId ? (
          <Button variant="outline" action="secondary" onPress={openCancelTrade} isDisabled={anyBusy} testID="shift-day-cancel-trade-button">
            <ButtonText>{t('shifts.actions.cancel_trade')}</ButtonText>
          </Button>
        ) : null}
        {canWithdraw ? (
          <Button variant="outline" action="negative" onPress={openWithdraw} isDisabled={anyBusy} testID="shift-day-withdraw-button">
            <ButtonText>{t('shifts.withdraw')}</ButtonText>
          </Button>
        ) : null}
        {day.CanManage ? (
          <Button variant="outline" action="secondary" onPress={openAdd} isDisabled={anyBusy || isShiftDayLoading} testID="shift-day-add-person-button">
            <UserPlus size={16} color={iconColor} />
            <ButtonText>{t('shifts.actions.add_person')}</ButtonText>
          </Button>
        ) : null}
      </VStack>

      {(day.Needs ?? []).length > 0 ? (
        <VStack space="sm">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white" accessibilityRole="header">
            {t('shifts.day.open_needs')}
          </Text>
          {day.Needs.map((group) => (
            <GroupNeedsCard key={group.GroupId} group={group} />
          ))}
        </VStack>
      ) : null}

      <VStack space="sm">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white" accessibilityRole="header">
          {t('shifts.day.roster')}
        </Text>
        {isRosterLoading ? (
          <HStack space="sm" className="items-center py-4">
            <Spinner size="small" />
            <Text className="text-sm text-gray-500 dark:text-gray-400">{t('shifts.loading_details')}</Text>
          </HStack>
        ) : rosterGroups.length === 0 ? (
          <Text className="py-4 text-sm text-gray-500 dark:text-gray-400">{t('shifts.day.roster_empty')}</Text>
        ) : (
          rosterGroups.map((group) => (
            <VStack key={group.key || 'no-group'} space="xs" testID={`roster-group-${group.key || 'none'}`}>
              <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">{group.name}</Text>
              {group.entries.map((entry) => (
                <RosterRow key={`${entry.UserId}-${entry.ShiftSignupId}`} entry={entry} isMe={entry.UserId === userId} canManage={canManageRosterEntry(day, entry)} onReview={openReview} onRemove={openRemove} />
              ))}
            </VStack>
          ))
        )}
      </VStack>
    </VStack>
  );

  const renderSignup = () => (
    <VStack space="md" testID="shift-day-signup-panel">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.signup_panel.title')}</Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400">{t('shifts.signup_panel.description')}</Text>
      {(day.Needs ?? []).length === 0 ? (
        <Text className="text-sm text-gray-500 dark:text-gray-400">{t('shifts.signup_panel.no_groups')}</Text>
      ) : (
        <VStack space="sm" accessibilityRole="radiogroup">
          {day.Needs.map((group) => {
            const open = getGroupOpenSlots(group);
            return (
              <ShiftSelectRow
                key={group.GroupId}
                id={group.GroupId}
                mode="radio"
                title={group.GroupName}
                subtitle={(group.GroupNeeds ?? []).map((role) => `${role.RoleName}: ${role.Needed}`).join(', ')}
                trailing={open > 0 ? t('shifts.day.group_open', { count: open }) : t('shifts.day.group_filled')}
                selected={signupGroupId === group.GroupId}
                onToggle={setSignupGroupId}
                testID={`signup-group-${group.GroupId}`}
              />
            );
          })}
        </VStack>
      )}
      {day.RequireApproval ? <Text className="text-sm text-amber-700 dark:text-amber-400">{t('shifts.signup_panel.approval_notice')}</Text> : null}
      {renderPanelFooter(t('shifts.actions.confirm_signup'), submitSignup, isBusy('signup'), !signupGroupId, 'primary', 'shift-day-signup-confirm')}
    </VStack>
  );

  const renderWithdraw = () => (
    <VStack space="md" testID="shift-day-withdraw-panel">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.withdraw_panel.title')}</Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400">{t('shifts.withdraw_panel.description', { date: formatShiftLongDate(day.ShiftDay || day.Start) })}</Text>
      {renderPanelFooter(t('shifts.withdraw'), submitWithdraw, isBusy('withdraw'), false, 'negative', 'shift-day-withdraw-confirm')}
    </VStack>
  );

  const renderTrade = () => (
    <VStack space="md" testID="shift-day-trade-panel">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.trade_panel.title')}</Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400">{t('shifts.trade_panel.description')}</Text>
      {isCandidatesLoading ? (
        <HStack space="sm" className="items-center py-2">
          <Spinner size="small" />
          <Text className="text-sm text-gray-500 dark:text-gray-400">{t('shifts.loading')}</Text>
        </HStack>
      ) : tradeCandidates.length === 0 ? (
        <Text className="text-sm text-gray-500 dark:text-gray-400">{t('shifts.trade_panel.no_candidates')}</Text>
      ) : (
        <VStack space="sm">
          {tradeCandidates.map((candidate) => (
            <ShiftSelectRow
              key={candidate.UserId}
              id={candidate.UserId}
              mode="checkbox"
              title={candidate.Name}
              subtitle={[candidate.GroupName, (candidate.Roles ?? []).join(', ')].filter((part) => !!part).join(' · ')}
              selected={candidateIds.includes(candidate.UserId)}
              onToggle={toggleCandidate}
              testID={`trade-candidate-${candidate.UserId}`}
            />
          ))}
        </VStack>
      )}
      {candidateIds.length > 0 ? <Text className="text-sm text-gray-600 dark:text-gray-400">{t('shifts.trade_panel.selected_count', { count: candidateIds.length })}</Text> : null}
      {renderNoteField('shifts.note_optional_placeholder', 'shift-day-trade-note')}
      {renderPanelFooter(t('shifts.actions.send_request'), submitTrade, isBusy('request-trade'), candidateIds.length === 0, 'primary', 'shift-day-trade-confirm')}
    </VStack>
  );

  const renderCancelTrade = () => (
    <VStack space="md" testID="shift-day-cancel-trade-panel">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.trade.cancel_title')}</Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400">{t('shifts.trade.cancel_description')}</Text>
      {renderPanelFooter(t('shifts.actions.cancel_trade'), submitCancelTrade, isBusy('cancel-trade'), false, 'negative', 'shift-day-cancel-trade-confirm')}
    </VStack>
  );

  const renderAdd = () => (
    <VStack space="md" testID="shift-day-add-panel">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.add_panel.title')}</Text>
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('shifts.add_panel.group')}</Text>
      <VStack space="sm">
        {manageableGroups.map((group) => (
          <ShiftSelectRow
            key={group.GroupId}
            id={group.GroupId}
            mode="radio"
            title={group.GroupName}
            trailing={getGroupOpenSlots(group) > 0 ? t('shifts.day.group_open', { count: getGroupOpenSlots(group) }) : t('shifts.day.group_filled')}
            selected={addGroupId === group.GroupId}
            onToggle={setAddGroupId}
            testID={`add-group-${group.GroupId}`}
          />
        ))}
      </VStack>
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('shifts.add_panel.person')}</Text>
      <Input variant="outline" size="md" className="rounded-lg">
        <InputField
          value={personSearch}
          onChangeText={setPersonSearch}
          placeholder={t('shifts.add_panel.search_placeholder')}
          accessibilityLabel={t('shifts.add_panel.search_placeholder')}
          testID="shift-day-add-search"
        />
      </Input>
      {isPersonnelOptionsLoading ? (
        <HStack space="sm" className="items-center py-2">
          <Spinner size="small" />
          <Text className="text-sm text-gray-500 dark:text-gray-400">{t('shifts.loading')}</Text>
        </HStack>
      ) : filteredPersonnel.length === 0 ? (
        <Text className="text-sm text-gray-500 dark:text-gray-400">{t('shifts.add_panel.no_options')}</Text>
      ) : (
        <VStack space="sm">
          {filteredPersonnel.map((option) => (
            <ShiftSelectRow
              key={option.UserId}
              id={option.UserId}
              mode="radio"
              title={option.Name}
              subtitle={[option.GroupName, (option.Roles ?? []).join(', ')].filter((part) => !!part).join(' · ')}
              selected={addUserId === option.UserId}
              onToggle={setAddUserId}
              testID={`add-person-${option.UserId}`}
            />
          ))}
        </VStack>
      )}
      {renderPanelFooter(t('shifts.add_panel.submit'), submitAdd, isBusy('assign'), !addGroupId || !addUserId, 'primary', 'shift-day-add-confirm')}
    </VStack>
  );

  const renderRemove = () => (
    <VStack space="md" testID="shift-day-remove-panel">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.remove_panel.title', { name: targetEntry?.Name ?? '' })}</Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400">{t('shifts.remove_panel.description')}</Text>
      {renderNoteField('shifts.note_optional_placeholder', 'shift-day-remove-note')}
      {renderPanelFooter(t('shifts.actions.remove'), submitRemove, isBusy('remove'), !targetEntry, 'negative', 'shift-day-remove-confirm')}
    </VStack>
  );

  const renderReview = () => (
    <VStack space="md" testID="shift-day-review-panel">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white">{reviewApprove ? t('shifts.review.approve_signup_title') : t('shifts.review.deny_signup_title')}</Text>
      <Text className="text-sm text-gray-700 dark:text-gray-300">{targetEntry ? `${targetEntry.Name}${targetEntry.GroupName ? ` · ${targetEntry.GroupName}` : ''}` : ''}</Text>
      {renderNoteField('shifts.note_optional_placeholder', 'shift-day-review-note')}
      {renderPanelFooter(reviewApprove ? t('shifts.actions.approve') : t('shifts.actions.deny'), submitReview, isBusy('review-signup'), !targetEntry, reviewApprove ? 'positive' : 'negative', 'shift-day-review-confirm')}
    </VStack>
  );

  const renderPanel = () => {
    switch (panel) {
      case 'signup':
        return renderSignup();
      case 'withdraw':
        return renderWithdraw();
      case 'trade':
        return renderTrade();
      case 'cancel-trade':
        return renderCancelTrade();
      case 'add':
        return renderAdd();
      case 'remove':
        return renderRemove();
      case 'review':
        return renderReview();
      case 'details':
      default:
        return renderDetails();
    }
  };

  return (
    <CustomBottomSheet isOpen={isOpen} onClose={handleClose} snapPoints={[90]} minHeight="min-h-[600px]" testID="shift-day-details-sheet">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}>
        <VStack space="lg" className="p-4">
          <VStack space="xs">
            <HStack className="items-start justify-between" space="sm">
              <Text className="flex-1 text-2xl font-bold text-gray-900 dark:text-white" accessibilityRole="header">
                {day.ShiftName}
              </Text>
              {day.IsActive ? (
                <Badge action="success" size="md" testID="shift-day-active-now">
                  <BadgeText>{t('shifts.status.active_now')}</BadgeText>
                </Badge>
              ) : null}
            </HStack>
            <Text className="text-base text-gray-600 dark:text-gray-400">{formatShiftLongDate(day.ShiftDay || day.Start)}</Text>
          </VStack>

          <Box className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30">
            <HStack className="items-center" space="md">
              <Clock size={22} color={iconColor} />
              <VStack className="flex-1" space="xs">
                <Text className="font-medium text-blue-900 dark:text-blue-100">{t('shifts.scheduled_for')}</Text>
                <Text className="text-sm text-blue-800 dark:text-blue-200">
                  {formatShiftTime(day.Start)} – {formatShiftTime(day.End)}
                  {overnight ? ` ${t('shifts.overnight')}` : ''}
                </Text>
              </VStack>
              <VStack space="xs" className="items-end">
                <Badge action="muted" size="sm">
                  <BadgeText>{t(getAssignmentTypeKey(day.ShiftType))}</BadgeText>
                </Badge>
                <Text className={`text-xs font-medium ${day.Filled ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {day.Filled ? t('shifts.status.filled') : t('shifts.status.open_slots', { count: day.OpenSlots })}
                </Text>
              </VStack>
            </HStack>
          </Box>

          {renderPanel()}
        </VStack>
      </ScrollView>
    </CustomBottomSheet>
  );
};
