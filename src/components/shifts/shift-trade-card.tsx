import { ArrowRightLeft, ChevronRight, Clock, Truck, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatShiftDate, formatShiftTime } from '@/lib/shift-utils';
import { ShiftAssignmentType, ShiftTradeDirection, ShiftTradeStatus, ShiftTradeUserState } from '@/models/v4/shifts/shiftEnums';
import { type ShiftTradeOfferedShiftResultData, type ShiftTradeResultData, type ShiftTradeUserResultData } from '@/models/v4/shifts/shiftTradeResultData';

import { getAssignmentTypeKey, getIneligibleReasonKey, getTradeMyStateKey, getTradeStatusLabel } from './shift-labels';

/** Everything a trade card (or the approvals list) can ask the screen to confirm. */
export type ShiftTradeAction =
  | { kind: 'accept-trade'; trade: ShiftTradeResultData }
  | { kind: 'decline-trade'; trade: ShiftTradeResultData }
  | { kind: 'apply-trade'; trade: ShiftTradeResultData }
  | { kind: 'withdraw-application'; trade: ShiftTradeResultData }
  | { kind: 'cancel-trade'; trade: ShiftTradeResultData }
  | { kind: 'finish-trade'; trade: ShiftTradeResultData; user: ShiftTradeUserResultData; offeredShift: ShiftTradeOfferedShiftResultData | null }
  | { kind: 'review-trade'; trade: ShiftTradeResultData; approve: boolean };

/** Whether the caller may pick between offers: the server decides on newer servers; before that only the requester could. */
export const canPickTrade = (trade: ShiftTradeResultData): boolean => trade.CanPick ?? (trade.Direction === ShiftTradeDirection.Outgoing && trade.Status === ShiftTradeStatus.Open);

export const canCancelTrade = (trade: ShiftTradeResultData): boolean =>
  trade.CanCancel ?? (trade.Direction === ShiftTradeDirection.Outgoing && (trade.Status === ShiftTradeStatus.Open || trade.Status === ShiftTradeStatus.PendingApproval));

/** The caller applied to an open request and can still take the offer back. */
export const canWithdrawApplication = (trade: ShiftTradeResultData): boolean => !!trade.IsOpen && trade.Status === ShiftTradeStatus.Open && trade.MyState === ShiftTradeUserState.Proposed && !trade.IsOver;

/** A targeted request the caller was asked to take and has not answered. */
export const canRespondToTrade = (trade: ShiftTradeResultData): boolean =>
  !trade.IsOpen && trade.Direction === ShiftTradeDirection.Incoming && trade.Status === ShiftTradeStatus.Open && trade.MyState === ShiftTradeUserState.Open;

interface ShiftTradeCardProps {
  trade: ShiftTradeResultData;
  onAction: (action: ShiftTradeAction) => void;
  /** Opens the trade's details (applicants and their qualifications). */
  onOpenDetails?: (trade: ShiftTradeResultData) => void;
  /** Busy while a mutation on this trade runs. */
  isBusy?: boolean;
}

interface OfferRowProps {
  trade: ShiftTradeResultData;
  user: ShiftTradeUserResultData;
  canPick: boolean;
  isBusy: boolean;
  onAction: (action: ShiftTradeAction) => void;
}

interface OfferButtonProps {
  label: string;
  onPress: () => void;
  disabled: boolean;
  testID: string;
}

interface OfferedShiftButtonProps {
  trade: ShiftTradeResultData;
  user: ShiftTradeUserResultData;
  offered: ShiftTradeOfferedShiftResultData;
  disabled: boolean;
  onAction: (action: ShiftTradeAction) => void;
}

const OfferButton: React.FC<OfferButtonProps> = React.memo(({ label, onPress, disabled, testID }) => (
  <Button size="sm" action="primary" variant="outline" onPress={onPress} isDisabled={disabled} className="mt-1 self-start" testID={testID}>
    <ButtonText>{label}</ButtonText>
  </Button>
));

OfferButton.displayName = 'OfferButton';

const OfferedShiftButton: React.FC<OfferedShiftButtonProps> = React.memo(({ trade, user, offered, disabled, onAction }) => {
  const { t } = useTranslation();
  const handlePress = useCallback(() => onAction({ kind: 'finish-trade', trade, user, offeredShift: offered }), [onAction, trade, user, offered]);
  return (
    <OfferButton
      label={t('shifts.trade.swap_for', { shift: offered.ShiftName, date: formatShiftDate(offered.ShiftDay) })}
      onPress={handlePress}
      disabled={disabled}
      testID={`trade-pick-${trade.ShiftSignupTradeId}-${user.UserId}-${offered.ShiftSignupId}`}
    />
  );
});

OfferedShiftButton.displayName = 'OfferedShiftButton';

export const OfferRow: React.FC<OfferRowProps> = React.memo(({ trade, user, canPick, isBusy, onAction }) => {
  const { t } = useTranslation();
  const handleGive = useCallback(() => onAction({ kind: 'finish-trade', trade, user, offeredShift: null }), [onAction, trade, user]);

  const stateText = user.Declined ? (trade.IsOpen ? t('shifts.trade.user_withdrew') : t('shifts.trade.user_declined')) : user.Offered ? t('shifts.trade.user_offered') : t('shifts.trade.user_waiting');
  const details = [user.GroupName, (user.Roles ?? []).join(', ')].filter((part) => !!part).join(' · ');

  return (
    <VStack className="rounded-md bg-gray-50 p-2 dark:bg-gray-700/60" testID={`trade-user-${trade.ShiftSignupTradeId}-${user.UserId}`}>
      <HStack className="items-center justify-between">
        <Text className="text-sm font-medium text-gray-900 dark:text-white">{user.Name}</Text>
        <Text className={`text-xs ${user.Declined ? 'text-red-600 dark:text-red-400' : user.Offered ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>{stateText}</Text>
      </HStack>
      {details ? <Text className="text-xs text-gray-600 dark:text-gray-400">{details}</Text> : null}
      {user.Reason ? <Text className="text-xs italic text-gray-600 dark:text-gray-400">{user.Reason}</Text> : null}
      {canPick && user.Offered && !user.Declined ? (
        (user.OfferedShifts ?? []).length === 0 ? (
          <OfferButton label={t('shifts.trade.give_to', { name: user.Name })} onPress={handleGive} disabled={isBusy} testID={`trade-pick-${trade.ShiftSignupTradeId}-${user.UserId}`} />
        ) : (
          user.OfferedShifts.map((offered) => <OfferedShiftButton key={offered.ShiftSignupId} trade={trade} user={user} offered={offered} disabled={isBusy} onAction={onAction} />)
        )
      ) : null}
    </VStack>
  );
});

OfferRow.displayName = 'OfferRow';

const ShiftTradeCardComponent: React.FC<ShiftTradeCardProps> = ({ trade, onAction, onOpenDetails, isBusy = false }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#9ca3af' : '#6b7280';

  const isIncoming = trade.Direction === ShiftTradeDirection.Incoming;
  const status = getTradeStatusLabel(trade.Status);
  const isOpen = trade.Status === ShiftTradeStatus.Open;
  const canRespond = canRespondToTrade(trade);
  const canApply = !!trade.CanApply;
  const canWithdraw = canWithdrawApplication(trade);
  const canCancel = canCancelTrade(trade);
  const canPick = canPickTrade(trade);
  const isWorkshift = trade.ShiftType === ShiftAssignmentType.Workshift;
  const ineligibleKey = trade.IsOpen && isIncoming && !canApply && !canWithdraw && isOpen ? getIneligibleReasonKey(trade.IneligibleReason) : null;
  const applicantCount = trade.ApplicantCount ?? (trade.Users ?? []).filter((user) => user.Offered && !user.Declined).length;

  const handleAccept = useCallback(() => onAction({ kind: 'accept-trade', trade }), [onAction, trade]);
  const handleDecline = useCallback(() => onAction({ kind: 'decline-trade', trade }), [onAction, trade]);
  const handleApply = useCallback(() => onAction({ kind: 'apply-trade', trade }), [onAction, trade]);
  const handleWithdraw = useCallback(() => onAction({ kind: 'withdraw-application', trade }), [onAction, trade]);
  const handleCancel = useCallback(() => onAction({ kind: 'cancel-trade', trade }), [onAction, trade]);
  const handleApprove = useCallback(() => onAction({ kind: 'review-trade', trade, approve: true }), [onAction, trade]);
  const handleDeny = useCallback(() => onAction({ kind: 'review-trade', trade, approve: false }), [onAction, trade]);
  const handleOpenDetails = useCallback(() => onOpenDetails?.(trade), [onOpenDetails, trade]);

  const users = trade.Users ?? [];
  const showOffers = isOpen && (canPick || !isIncoming);
  const hasActions = canRespond || canApply || canWithdraw || canCancel || trade.CanReview;

  const header = (
    <HStack className="items-start justify-between" space="sm">
      <VStack className="flex-1" space="xs">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">{trade.ShiftName}</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">{formatShiftDate(trade.ShiftDay || trade.Start)}</Text>
      </VStack>
      <VStack space="xs" className="items-end">
        <Badge action={isIncoming ? 'info' : 'muted'} size="sm">
          <BadgeText>{isIncoming ? t('shifts.trade.incoming') : t('shifts.trade.outgoing')}</BadgeText>
        </Badge>
        <Badge action={status.action} size="sm" testID={`trade-status-${trade.ShiftSignupTradeId}`}>
          <BadgeText>{t(status.key)}</BadgeText>
        </Badge>
      </VStack>
    </HStack>
  );

  return (
    <Card className="mb-3 bg-white p-4 shadow-xs dark:bg-gray-800" testID={`trade-card-${trade.ShiftSignupTradeId}`}>
      <VStack space="sm">
        {onOpenDetails ? (
          <Pressable
            onPress={handleOpenDetails}
            accessibilityRole="button"
            accessibilityLabel={t('shifts.trade.details_a11y', { shift: trade.ShiftName, date: formatShiftDate(trade.ShiftDay || trade.Start) })}
            accessibilityHint={t('shifts.trade.details_hint')}
            testID={`trade-open-${trade.ShiftSignupTradeId}`}
          >
            <HStack className="items-center" space="xs">
              <VStack className="flex-1">{header}</VStack>
              <ChevronRight size={18} color={iconColor} />
            </HStack>
          </Pressable>
        ) : (
          header
        )}

        <HStack space="sm" className="items-center">
          <Clock size={14} color={iconColor} />
          <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300">
            {formatShiftTime(trade.Start)} – {formatShiftTime(trade.End)}
            {trade.GroupName ? ` · ${trade.GroupName}` : ''}
          </Text>
        </HStack>

        {isWorkshift && trade.UnitName ? (
          <HStack space="sm" className="items-center">
            <Truck size={14} color={iconColor} />
            <Text className="text-sm text-gray-700 dark:text-gray-300">{trade.UnitName}</Text>
          </HStack>
        ) : null}

        <HStack space="xs" className="flex-wrap">
          <Badge action="muted" size="sm" className="mb-1 mr-1">
            <BadgeText>{t(getAssignmentTypeKey(trade.ShiftType ?? ShiftAssignmentType.Assigned))}</BadgeText>
          </Badge>
          {trade.IsOpen ? (
            <Badge action="info" size="sm" className="mb-1 mr-1" testID={`trade-open-request-${trade.ShiftSignupTradeId}`}>
              <BadgeText>{t('shifts.trade.open_request')}</BadgeText>
            </Badge>
          ) : null}
        </HStack>

        {isIncoming ? <Text className="text-sm text-gray-700 dark:text-gray-300">{t('shifts.trade.from', { name: trade.SourceUserName })}</Text> : null}
        {isIncoming && (!trade.IsOpen || trade.MyState !== ShiftTradeUserState.Open) ? (
          <Text className="text-sm font-medium text-gray-900 dark:text-white" testID={`trade-my-state-${trade.ShiftSignupTradeId}`}>
            {t(getTradeMyStateKey(trade.MyState))}
          </Text>
        ) : null}

        {trade.IsOpen && isOpen ? (
          <HStack space="xs" className="items-center">
            <Users size={14} color={iconColor} />
            <Text className="text-sm text-gray-700 dark:text-gray-300" testID={`trade-applicants-${trade.ShiftSignupTradeId}`}>
              {t('shifts.trade.applicant_count', { count: applicantCount })}
            </Text>
          </HStack>
        ) : null}

        {trade.Note ? (
          <Text className="text-sm italic text-gray-600 dark:text-gray-400">
            {t('shifts.note_label')}: {trade.Note}
          </Text>
        ) : null}

        {trade.AcceptedUserName ? (
          <HStack space="xs" className="items-center">
            <ArrowRightLeft size={14} color={iconColor} />
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              {t('shifts.trade.taken_by', { name: trade.AcceptedUserName })}
              {trade.TargetShiftDay ? ` · ${t('shifts.trade.swap_back', { date: formatShiftDate(trade.TargetShiftDay) })}` : ''}
            </Text>
          </HStack>
        ) : null}

        {trade.ReviewedByName ? (
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {t('shifts.trade.reviewed_by', { name: trade.ReviewedByName })}
            {trade.ReviewNote ? ` · ${trade.ReviewNote}` : ''}
          </Text>
        ) : null}

        {ineligibleKey ? (
          <Text className="text-sm text-amber-700 dark:text-amber-400" testID={`trade-ineligible-${trade.ShiftSignupTradeId}`}>
            {t(ineligibleKey)}
          </Text>
        ) : null}

        {showOffers ? (
          <VStack space="xs">
            <Text className="text-sm font-semibold text-gray-900 dark:text-white">{trade.IsOpen ? t('shifts.trade.applicants') : t('shifts.trade.offers')}</Text>
            {users.length === 0 ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400">{trade.IsOpen ? t('shifts.trade.no_applicants') : t('shifts.trade.no_offers')}</Text>
            ) : (
              users.map((user) => <OfferRow key={user.UserId} trade={trade} user={user} canPick={canPick} isBusy={isBusy} onAction={onAction} />)
            )}
            {canPick && trade.PickIsApproval ? <Text className="text-xs text-gray-500 dark:text-gray-400">{t('shifts.trade.pick_as_approver_note')}</Text> : null}
          </VStack>
        ) : null}

        {trade.Status === ShiftTradeStatus.PendingApproval && !trade.CanReview ? <Text className="text-sm text-amber-700 dark:text-amber-400">{t('shifts.trade.finish_pending_note')}</Text> : null}

        {hasActions ? (
          <HStack space="sm" className="mt-1 flex-wrap">
            {canRespond ? (
              <>
                <Button size="sm" action="positive" onPress={handleAccept} isDisabled={isBusy} testID={`trade-accept-${trade.ShiftSignupTradeId}`}>
                  <ButtonText>{t('shifts.actions.accept')}</ButtonText>
                </Button>
                <Button size="sm" action="negative" variant="outline" onPress={handleDecline} isDisabled={isBusy} testID={`trade-decline-${trade.ShiftSignupTradeId}`}>
                  <ButtonText>{t('shifts.actions.decline')}</ButtonText>
                </Button>
              </>
            ) : null}
            {canApply ? (
              <Button size="sm" action="positive" onPress={handleApply} isDisabled={isBusy} testID={`trade-apply-${trade.ShiftSignupTradeId}`}>
                <ButtonText>{t('shifts.actions.apply')}</ButtonText>
              </Button>
            ) : null}
            {canWithdraw ? (
              <Button size="sm" action="secondary" variant="outline" onPress={handleWithdraw} isDisabled={isBusy} testID={`trade-withdraw-${trade.ShiftSignupTradeId}`}>
                <ButtonText>{t('shifts.actions.withdraw_application')}</ButtonText>
              </Button>
            ) : null}
            {trade.CanReview ? (
              <>
                <Button size="sm" action="positive" onPress={handleApprove} isDisabled={isBusy} testID={`trade-approve-${trade.ShiftSignupTradeId}`}>
                  <ButtonText>{t('shifts.actions.approve')}</ButtonText>
                </Button>
                <Button size="sm" action="negative" variant="outline" onPress={handleDeny} isDisabled={isBusy} testID={`trade-deny-${trade.ShiftSignupTradeId}`}>
                  <ButtonText>{t('shifts.actions.deny')}</ButtonText>
                </Button>
              </>
            ) : null}
            {canCancel ? (
              <Button size="sm" action="secondary" variant="outline" onPress={handleCancel} isDisabled={isBusy} testID={`trade-cancel-${trade.ShiftSignupTradeId}`}>
                <ButtonText>{isIncoming ? t('shifts.actions.cancel_request_admin') : t('shifts.actions.cancel_trade')}</ButtonText>
              </Button>
            ) : null}
          </HStack>
        ) : null}
      </VStack>
    </Card>
  );
};

export const ShiftTradeCard = React.memo(ShiftTradeCardComponent);
