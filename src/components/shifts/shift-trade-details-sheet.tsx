import { AlertTriangle, Award, Briefcase, Clock, Truck } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatShiftDate, formatShiftLongDate, formatShiftTime } from '@/lib/shift-utils';
import { ShiftAssignmentType, ShiftTradeStatus } from '@/models/v4/shifts/shiftEnums';
import { type ShiftTradeOfferedShiftResultData, type ShiftTradeResultData, type ShiftTradeUserResultData } from '@/models/v4/shifts/shiftTradeResultData';
import { useShiftsStore } from '@/stores/shifts/store';

import { getAssignmentTypeKey, getIneligibleReasonKey, getTradeStatusLabel } from './shift-labels';
import { canCancelTrade, canPickTrade, canRespondToTrade, canWithdrawApplication, type ShiftTradeAction } from './shift-trade-card';

interface ShiftTradeDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: ShiftTradeAction) => void;
}

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return '';
  const parsed = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString();
};

interface ApplicantCardProps {
  trade: ShiftTradeResultData;
  user: ShiftTradeUserResultData;
  canPick: boolean;
  isBusy: boolean;
  onAction: (action: ShiftTradeAction) => void;
}

interface PickButtonProps {
  trade: ShiftTradeResultData;
  user: ShiftTradeUserResultData;
  offered: ShiftTradeOfferedShiftResultData | null;
  isBusy: boolean;
  onAction: (action: ShiftTradeAction) => void;
}

const PickButton: React.FC<PickButtonProps> = React.memo(({ trade, user, offered, isBusy, onAction }) => {
  const { t } = useTranslation();
  const handlePress = useCallback(() => onAction({ kind: 'finish-trade', trade, user, offeredShift: offered }), [onAction, trade, user, offered]);
  const label = offered ? t('shifts.trade.swap_for', { shift: offered.ShiftName, date: formatShiftDate(offered.ShiftDay) }) : t('shifts.trade.select_applicant', { name: user.Name });
  return (
    <Button
      size="sm"
      action="primary"
      onPress={handlePress}
      isDisabled={isBusy}
      className="mt-1 self-start"
      accessibilityLabel={label}
      testID={`trade-detail-pick-${user.UserId}${offered ? `-${offered.ShiftSignupId}` : ''}`}
    >
      <ButtonText>{label}</ButtonText>
    </Button>
  );
});

PickButton.displayName = 'PickButton';

const ApplicantCard: React.FC<ApplicantCardProps> = React.memo(({ trade, user, canPick, isBusy, onAction }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#9ca3af' : '#6b7280';

  const isLive = user.Offered && !user.Declined;
  const ineligibleKey = user.IsEligible === false ? getIneligibleReasonKey(user.IneligibleReason) : null;
  const roles = (user.Roles ?? []).join(', ');
  const certifications = user.Certifications;
  const respondedOn = formatTimestamp(user.RespondedOn);
  const hasDetails = user.IsEligible !== undefined;
  const stateText = user.Declined ? (trade.IsOpen ? t('shifts.trade.user_withdrew') : t('shifts.trade.user_declined')) : user.Offered ? t('shifts.trade.user_offered') : t('shifts.trade.user_waiting');

  return (
    <VStack
      space="xs"
      className={`rounded-lg border p-3 ${isLive ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800' : 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900'}`}
      testID={`trade-applicant-${user.UserId}`}
    >
      <HStack className="items-start justify-between" space="sm">
        <VStack className="flex-1">
          <Text className="text-base font-semibold text-gray-900 dark:text-white">{user.Name}</Text>
          {respondedOn ? <Text className="text-xs text-gray-500 dark:text-gray-400">{t('shifts.trade.applied_at', { date: respondedOn })}</Text> : null}
        </VStack>
        <Badge action={user.Declined ? 'muted' : user.Offered ? 'success' : 'info'} size="sm">
          <BadgeText>{stateText}</BadgeText>
        </Badge>
      </HStack>

      {user.GroupName || roles ? (
        <HStack space="xs" className="items-center">
          <Briefcase size={14} color={iconColor} />
          <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300">{[user.GroupName, roles].filter((part) => !!part).join(' · ')}</Text>
        </HStack>
      ) : null}

      {hasDetails ? (
        <>
          <HStack space="xs" className="items-start">
            <Award size={14} color={iconColor} />
            <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300" testID={`trade-applicant-certs-${user.UserId}`}>
              {certifications && certifications.length > 0 ? certifications.join(', ') : t('shifts.trade.no_certifications')}
            </Text>
          </HStack>
          <HStack space="xs" className="items-center">
            <Clock size={14} color={iconColor} />
            <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300" testID={`trade-applicant-workload-${user.UserId}`}>
              {t('shifts.trade.nearby_workload', { count: user.NearbyShiftCount ?? 0, hours: user.NearbyShiftHours ?? 0 })}
            </Text>
          </HStack>
        </>
      ) : null}

      {user.HasConflict ? (
        <HStack space="xs" className="items-center" testID={`trade-applicant-conflict-${user.UserId}`}>
          <AlertTriangle size={14} color="#dc2626" />
          <Text className="flex-1 text-sm font-medium text-red-700 dark:text-red-400">{t('shifts.trade.applicant_conflict', { name: user.ConflictName || t('shifts.unknown') })}</Text>
        </HStack>
      ) : null}

      {ineligibleKey ? (
        <Text className="text-sm text-amber-700 dark:text-amber-400" testID={`trade-applicant-ineligible-${user.UserId}`}>
          {t(ineligibleKey)}
        </Text>
      ) : null}

      {user.Reason ? <Text className="text-sm italic text-gray-600 dark:text-gray-400">{user.Reason}</Text> : null}

      {canPick && isLive ? (
        (user.OfferedShifts ?? []).length === 0 ? (
          <PickButton trade={trade} user={user} offered={null} isBusy={isBusy} onAction={onAction} />
        ) : (
          user.OfferedShifts.map((offered) => <PickButton key={offered.ShiftSignupId} trade={trade} user={user} offered={offered} isBusy={isBusy} onAction={onAction} />)
        )
      ) : null}
    </VStack>
  );
});

ApplicantCard.displayName = 'ApplicantCard';

export const ShiftTradeDetailsSheet: React.FC<ShiftTradeDetailsSheetProps> = ({ isOpen, onClose, onAction }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#60a5fa' : '#2563eb';

  const trade = useShiftsStore((state) => state.selectedTrade);
  const isLoading = useShiftsStore((state) => state.isTradeDetailLoading);
  const activeMutation = useShiftsStore((state) => state.activeMutation);
  const activeMutationTargetId = useShiftsStore((state) => state.activeMutationTargetId);

  const users = useMemo(() => {
    // Live offers first, then people still deciding, then those who withdrew or declined.
    const rank = (user: ShiftTradeUserResultData) => (user.Offered && !user.Declined ? 0 : user.Declined ? 2 : 1);
    return [...(trade?.Users ?? [])].sort((a, b) => rank(a) - rank(b));
  }, [trade]);

  const handle = useCallback((action: ShiftTradeAction) => onAction(action), [onAction]);
  const handleApply = useCallback(() => trade && onAction({ kind: 'apply-trade', trade }), [onAction, trade]);
  const handleWithdraw = useCallback(() => trade && onAction({ kind: 'withdraw-application', trade }), [onAction, trade]);
  const handleAccept = useCallback(() => trade && onAction({ kind: 'accept-trade', trade }), [onAction, trade]);
  const handleDecline = useCallback(() => trade && onAction({ kind: 'decline-trade', trade }), [onAction, trade]);
  const handleCancel = useCallback(() => trade && onAction({ kind: 'cancel-trade', trade }), [onAction, trade]);
  const handleApprove = useCallback(() => trade && onAction({ kind: 'review-trade', trade, approve: true }), [onAction, trade]);
  const handleDeny = useCallback(() => trade && onAction({ kind: 'review-trade', trade, approve: false }), [onAction, trade]);

  if (!trade) {
    return (
      <CustomBottomSheet isOpen={isOpen} onClose={onClose} isLoading={isLoading} loadingText={t('shifts.loading_details')} snapPoints={[90]} minHeight="min-h-[400px]" testID="shift-trade-details-sheet">
        {null}
      </CustomBottomSheet>
    );
  }

  const status = getTradeStatusLabel(trade.Status);
  const isBusy = activeMutation !== null && activeMutationTargetId === trade.ShiftSignupTradeId;
  const canPick = canPickTrade(trade);
  const canCancel = canCancelTrade(trade);
  const canWithdraw = canWithdrawApplication(trade);
  const canRespond = canRespondToTrade(trade);
  const ineligibleKey = trade.IsOpen && !trade.CanApply && !canWithdraw && trade.Status === ShiftTradeStatus.Open ? getIneligibleReasonKey(trade.IneligibleReason) : null;
  const requestedOn = formatTimestamp(trade.RequestedOn);
  const liveOffers = users.filter((user) => user.Offered && !user.Declined).length;

  return (
    <CustomBottomSheet isOpen={isOpen} onClose={onClose} snapPoints={[90]} minHeight="min-h-[600px]" testID="shift-trade-details-sheet">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}>
        <VStack space="lg" className="p-4">
          <VStack space="xs">
            <HStack className="items-start justify-between" space="sm">
              <Text className="flex-1 text-2xl font-bold text-gray-900 dark:text-white" accessibilityRole="header">
                {trade.ShiftName}
              </Text>
              <Badge action={status.action} size="md">
                <BadgeText>{t(status.key)}</BadgeText>
              </Badge>
            </HStack>
            <Text className="text-base text-gray-600 dark:text-gray-400">{formatShiftLongDate(trade.ShiftDay || trade.Start)}</Text>
          </VStack>

          <VStack space="sm" className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30">
            <HStack space="sm" className="items-center">
              <Clock size={18} color={iconColor} />
              <Text className="text-sm text-blue-900 dark:text-blue-100">
                {formatShiftTime(trade.Start)} – {formatShiftTime(trade.End)}
                {trade.GroupName ? ` · ${trade.GroupName}` : ''}
              </Text>
            </HStack>
            {trade.UnitName ? (
              <HStack space="sm" className="items-center">
                <Truck size={18} color={iconColor} />
                <Text className="text-sm text-blue-900 dark:text-blue-100">{trade.UnitName}</Text>
              </HStack>
            ) : null}
            <HStack space="xs" className="flex-wrap">
              <Badge action="muted" size="sm" className="mb-1 mr-1">
                <BadgeText>{t(getAssignmentTypeKey(trade.ShiftType ?? ShiftAssignmentType.Assigned))}</BadgeText>
              </Badge>
              {trade.IsOpen ? (
                <Badge action="info" size="sm" className="mb-1 mr-1">
                  <BadgeText>{t('shifts.trade.open_request')}</BadgeText>
                </Badge>
              ) : null}
              {trade.RequireApproval ? (
                <Badge action="muted" size="sm" className="mb-1 mr-1">
                  <BadgeText>{t('shifts.approval_required')}</BadgeText>
                </Badge>
              ) : null}
            </HStack>
          </VStack>

          <VStack space="xs">
            <Text className="text-sm text-gray-800 dark:text-gray-200">{t('shifts.trade.requested_by', { name: trade.SourceUserName })}</Text>
            {requestedOn ? <Text className="text-xs text-gray-500 dark:text-gray-400">{t('shifts.trade.requested_at', { date: requestedOn })}</Text> : null}
            {trade.Note ? <Text className="text-sm italic text-gray-600 dark:text-gray-400">{trade.Note}</Text> : null}
            {trade.AcceptedUserName ? <Text className="text-sm text-gray-800 dark:text-gray-200">{t('shifts.trade.taken_by', { name: trade.AcceptedUserName })}</Text> : null}
            {trade.ReviewedByName ? (
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {t('shifts.trade.reviewed_by', { name: trade.ReviewedByName })}
                {trade.ReviewNote ? ` · ${trade.ReviewNote}` : ''}
              </Text>
            ) : null}
          </VStack>

          {ineligibleKey ? (
            <Text className="text-sm text-amber-700 dark:text-amber-400" testID="trade-detail-ineligible">
              {t(ineligibleKey)}
            </Text>
          ) : null}

          {canPick ? (
            <Text className="text-sm text-gray-600 dark:text-gray-400" testID="trade-detail-pick-note">
              {trade.PickIsApproval ? t('shifts.trade.pick_as_approver_note') : trade.RequireApproval ? t('shifts.trade.finish_pending_note') : t('shifts.trade.pick_note')}
            </Text>
          ) : null}

          <VStack space="sm">
            <HStack className="items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white" accessibilityRole="header">
                {trade.IsOpen ? t('shifts.trade.applicants') : t('shifts.trade.offers')}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">{t('shifts.trade.applicant_count', { count: liveOffers })}</Text>
            </HStack>
            {isLoading && users.length === 0 ? (
              <HStack space="sm" className="items-center py-2">
                <Spinner size="small" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">{t('shifts.loading_details')}</Text>
              </HStack>
            ) : users.length === 0 ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400">{trade.IsOpen ? t('shifts.trade.no_applicants') : t('shifts.trade.no_offers')}</Text>
            ) : (
              users.map((user) => <ApplicantCard key={user.UserId} trade={trade} user={user} canPick={canPick} isBusy={isBusy} onAction={handle} />)
            )}
          </VStack>

          <HStack space="sm" className="flex-wrap">
            {trade.CanApply ? (
              <Button action="positive" onPress={handleApply} isDisabled={isBusy} className="mb-2" testID="trade-detail-apply">
                <ButtonText>{t('shifts.actions.apply')}</ButtonText>
              </Button>
            ) : null}
            {canWithdraw ? (
              <Button action="secondary" variant="outline" onPress={handleWithdraw} isDisabled={isBusy} className="mb-2" testID="trade-detail-withdraw">
                <ButtonText>{t('shifts.actions.withdraw_application')}</ButtonText>
              </Button>
            ) : null}
            {canRespond ? (
              <>
                <Button action="positive" onPress={handleAccept} isDisabled={isBusy} className="mb-2" testID="trade-detail-accept">
                  <ButtonText>{t('shifts.actions.accept')}</ButtonText>
                </Button>
                <Button action="negative" variant="outline" onPress={handleDecline} isDisabled={isBusy} className="mb-2" testID="trade-detail-decline">
                  <ButtonText>{t('shifts.actions.decline')}</ButtonText>
                </Button>
              </>
            ) : null}
            {trade.CanReview ? (
              <>
                <Button action="positive" onPress={handleApprove} isDisabled={isBusy} className="mb-2" testID="trade-detail-approve">
                  <ButtonText>{t('shifts.actions.approve')}</ButtonText>
                </Button>
                <Button action="negative" variant="outline" onPress={handleDeny} isDisabled={isBusy} className="mb-2" testID="trade-detail-deny">
                  <ButtonText>{t('shifts.actions.deny')}</ButtonText>
                </Button>
              </>
            ) : null}
            {canCancel ? (
              <Button action="negative" variant="outline" onPress={handleCancel} isDisabled={isBusy} className="mb-2" testID="trade-detail-cancel">
                <ButtonText>{t('shifts.actions.cancel_trade')}</ButtonText>
              </Button>
            ) : null}
          </HStack>
        </VStack>
      </ScrollView>
    </CustomBottomSheet>
  );
};
