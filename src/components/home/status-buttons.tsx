import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Loading } from '@/components/common/loading';
import { HoldToConfirmButton } from '@/components/status/hold-to-confirm-button';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { getOfferedStatuses, resolveCurrentStatusId } from '@/lib/status-flow';
import { invertColor } from '@/lib/utils';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { useCoreStore } from '@/stores/app/core-store';
import { useHomeStore } from '@/stores/home/home-store';
import { usePersonnelStatusBottomSheetStore } from '@/stores/status/personnel-status-store';
import { useToastStore } from '@/stores/toast/store';

const LEGACY_HIDDEN_STATUS_IDS = [4, 5, 6, 7];

/** The red outline that marks the member's current status. */
const CURRENT_STATUS_BORDER = '#dc2626';

export const StatusButtons: React.FC = () => {
  const { t } = useTranslation();
  const { isLoadingOptions, currentUserStatus } = useHomeStore();
  const { activeStatuses, currentStatus: coreCurrentStatus, config } = useCoreStore();
  const { setIsOpen, confirmHeldStatus } = usePersonnelStatusBottomSheetStore();
  const showToast = useToastStore((state) => state.showToast);
  const [showAllStatuses, setShowAllStatuses] = React.useState(false);

  // Department "Hold to set status": a two-second press and hold sets the status, no Save tap needed.
  const isHoldMode = config?.StatusHoldToConfirm === true;
  const currentStatusType = (currentUserStatus ?? coreCurrentStatus)?.StatusType;

  // These IDs are legacy system-managed statuses that Resgrid sets internally.
  // They predate the newer Detail-based destination model and should stay hidden
  // from the Home tab buttons even though they may still be applied under the hood.
  const visibleStatuses = React.useMemo(() => (activeStatuses ?? []).filter((status) => !LEGACY_HIDDEN_STATUS_IDS.includes(status.Id)), [activeStatuses]);
  const currentStatusId = React.useMemo(() => resolveCurrentStatusId(activeStatuses, { StateId: currentStatusType }), [activeStatuses, currentStatusType]);
  const offeredStatuses = React.useMemo(() => getOfferedStatuses(visibleStatuses, currentStatusId, showAllStatuses), [currentStatusId, showAllStatuses, visibleStatuses]);
  const hasNextStatusRestriction = React.useMemo(() => showAllStatuses && getOfferedStatuses(visibleStatuses, currentStatusId, false).isRestricted, [currentStatusId, showAllStatuses, visibleStatuses]);

  // A new status brings its own next statuses; go back to the narrowed list.
  React.useEffect(() => {
    setShowAllStatuses(false);
  }, [currentStatusId]);

  const handleStatusPress = (statusData: StatusesResultData) => {
    // Open the bottom sheet with the selected status
    setIsOpen(true, statusData);
  };

  const handleStatusHold = (statusData: StatusesResultData) => {
    // The sheet opens on the status and saves it at once, or stays on the step that still needs the member.
    setIsOpen(true, statusData);
    void confirmHeldStatus?.(statusData);
  };

  if (isLoadingOptions || activeStatuses === null) {
    return <Loading />;
  }

  if (visibleStatuses.length === 0) {
    return (
      <VStack className="p-4">
        <Text className="text-center text-gray-500">{t('home.status.no_options_available')}</Text>
      </VStack>
    );
  }

  return (
    <VStack space="sm" className="p-4" testID="status-buttons">
      {offeredStatuses.offered.map((status) => {
        const isCurrent = String(status.Id) === currentStatusId;
        const textColor = invertColor(status.BColor, true);
        const label = (
          <HStack space="xs" className="items-center justify-center">
            <ButtonText style={{ color: textColor, flexShrink: 1 }}>{status.Text}</ButtonText>
            {isCurrent ? (
              <View style={styles.currentPill}>
                <Text style={styles.currentPillText}>{t('personnel.status.current')}</Text>
              </View>
            ) : null}
          </HStack>
        );

        if (isHoldMode) {
          return (
            <HoldToConfirmButton
              key={status.Id}
              testID={`status-hold-button-${status.Id}`}
              onConfirm={() => handleStatusHold(status)}
              onTap={() => showToast('info', t('personnel.status.hold_to_set_hint'))}
              backgroundColor={status.BColor}
              foregroundColor={textColor}
              style={isCurrent ? styles.currentOutline : null}
              contentStyle={styles.holdContent}
              accessibilityLabel={isCurrent ? `${status.Text}, ${t('personnel.status.current')}` : status.Text}
              accessibilityHint={t('personnel.status.hold_to_set_hint')}
            >
              {label}
            </HoldToConfirmButton>
          );
        }

        return (
          <Button
            key={status.Id}
            variant="solid"
            className="w-full justify-center px-3 py-2"
            action="primary"
            size="lg"
            style={[{ backgroundColor: status.BColor }, isCurrent ? styles.currentOutline : null]}
            onPress={() => handleStatusPress(status)}
            testID={`status-button-${status.Id}`}
            accessibilityLabel={isCurrent ? `${status.Text}, ${t('personnel.status.current')}` : undefined}
          >
            {label}
          </Button>
        );
      })}

      {offeredStatuses.isRestricted ? (
        <TouchableOpacity testID="status-buttons-show-all" onPress={() => setShowAllStatuses(true)} className="items-center py-1">
          <Text className="font-semibold text-primary-600 dark:text-primary-400">{t('personnel.status.show_all_statuses', { count: offeredStatuses.hiddenCount })}</Text>
        </TouchableOpacity>
      ) : hasNextStatusRestriction ? (
        <TouchableOpacity testID="status-buttons-show-next" onPress={() => setShowAllStatuses(false)} className="items-center py-1">
          <Text className="font-semibold text-primary-600 dark:text-primary-400">{t('personnel.status.show_next_statuses')}</Text>
        </TouchableOpacity>
      ) : null}
    </VStack>
  );
};

const styles = StyleSheet.create({
  currentOutline: {
    borderWidth: 3,
    borderColor: CURRENT_STATUS_BORDER,
  },
  currentPill: {
    backgroundColor: CURRENT_STATUS_BORDER,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  currentPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  holdContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
