import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useAnalytics } from '@/hooks/use-analytics';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import {
  arePoisAllowedForStatus,
  getCallDestinationDisplay,
  getDefaultStatusCall,
  getPersonnelStatusSteps,
  getPoiDestinationDisplay,
  getStationDestinationDisplay,
  hasNoteStepForStatus,
  isNoteRequiredForStatus,
  type StatusDestinationTab,
} from '@/lib/status-destinations';
import { getOfferedStatuses, resolveCurrentStatusId } from '@/lib/status-flow';
import { invertColor } from '@/lib/utils';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { useCoreStore } from '@/stores/app/core-store';
import { useActiveCallStore } from '@/stores/calls/active-call-store';
import { useCallsStore } from '@/stores/calls/store';
import { useHomeStore } from '@/stores/home/home-store';
import { usePersonnelStatusBottomSheetStore } from '@/stores/status/personnel-status-store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Button, ButtonText } from '../ui/button';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { Spinner } from '../ui/spinner';
import { Text } from '../ui/text';
import { Textarea, TextareaInput } from '../ui/textarea';
import { VStack } from '../ui/vstack';
import { HoldToConfirmButton } from './hold-to-confirm-button';

/** The red outline that marks the member's current status (crews asked for it to be unmistakable). */
const CURRENT_STATUS_BORDER = '#dc2626';

const CurrentStatusPill: React.FC = React.memo(() => {
  const { t } = useTranslation();

  return (
    <View style={styles.currentPill}>
      <Text style={styles.currentPillText}>{t('personnel.status.current')}</Text>
    </View>
  );
});

CurrentStatusPill.displayName = 'CurrentStatusPill';

interface PersonnelStatusOptionProps {
  status: StatusesResultData;
  isSelected: boolean;
  isCurrent: boolean;
  isHoldMode: boolean;
  isDisabled: boolean;
  onSelect: (statusId: number) => void;
  onHold: (status: StatusesResultData) => void;
  onHoldTap: () => void;
}

const PersonnelStatusOption: React.FC<PersonnelStatusOptionProps> = React.memo(({ status, isSelected, isCurrent, isHoldMode, isDisabled, onSelect, onHold, onHoldTap }) => {
  const { t } = useTranslation();
  const textColor = invertColor(status.BColor, true);

  const handleSelect = useCallback(() => onSelect(status.Id), [onSelect, status.Id]);
  const handleHold = useCallback(() => onHold(status), [onHold, status]);

  if (isHoldMode) {
    return (
      <View className="mb-3">
        <HoldToConfirmButton
          testID={`personnel-status-hold-${status.Id}`}
          onConfirm={handleHold}
          onTap={onHoldTap}
          disabled={isDisabled}
          backgroundColor={status.BColor}
          foregroundColor={textColor}
          style={isCurrent ? styles.currentOutline : null}
          contentStyle={styles.holdOptionContent}
          accessibilityLabel={isCurrent ? `${status.Text}, ${t('personnel.status.current')}` : status.Text}
          accessibilityHint={t('personnel.status.hold_to_set_hint')}
        >
          <HStack space="sm" className="items-center">
            <Text className="flex-1 font-bold" style={{ color: textColor }}>
              {status.Text}
            </Text>
            {isCurrent ? <CurrentStatusPill /> : null}
          </HStack>
        </HoldToConfirmButton>
      </View>
    );
  }

  return (
    <TouchableOpacity
      testID={`personnel-status-option-${status.Id}`}
      onPress={handleSelect}
      className={`mb-3 rounded-lg border-2 p-3 ${isSelected ? 'border-primary-500 dark:border-primary-400' : 'border-transparent'}`}
      style={[{ backgroundColor: status.BColor }, isCurrent && !isSelected ? styles.currentOutline : null]}
      accessibilityLabel={isCurrent ? `${status.Text}, ${t('personnel.status.current')}` : undefined}
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
        <Text className="flex-1 font-bold" style={{ color: textColor }}>
          {status.Text}
        </Text>
        {isCurrent ? <CurrentStatusPill /> : null}
      </HStack>
    </TouchableOpacity>
  );
});

PersonnelStatusOption.displayName = 'PersonnelStatusOption';

export const PersonnelStatusBottomSheet = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const keyboardHeight = useKeyboardHeight();
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
    submitError = null,
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
    confirmHeldStatus = async () => undefined,
    reset,
    isDestinationRequired = () => false,
    areCallsAllowed = () => true,
    areStationsAllowed = () => true,
    arePoisAllowed = () => false,
  } = usePersonnelStatusBottomSheetStore();

  // Selected field by field: an object selector builds a new reference on every store
  // write, so any unrelated core/calls update would re-render the whole sheet. (The
  // sheet's own store above stays destructured — it is dedicated to this sheet, so every
  // write to it is already meant for this component.)
  const activeStatuses = useCoreStore((state) => state.activeStatuses);
  const coreCurrentStatus = useCoreStore((state) => state.currentStatus);
  const currentUserStatus = useHomeStore((state) => state.currentUserStatus);
  // The active call set from call detail or the Home Active Call tab (and the map pin).
  const activeCall = useActiveCallStore((state) => state.activeCall);
  const calls = useCallsStore((state) => state.calls);
  const isLoadingCalls = useCallsStore((state) => state.isLoading);
  const fetchCalls = useCallsStore((state) => state.fetchCalls);
  // Department "Hold to set status": a two-second press and hold replaces tap + Next/Save.
  const isHoldMode = useCoreStore((state) => state.config?.StatusHoldToConfirm === true);
  const [showAllStatuses, setShowAllStatuses] = React.useState(false);
  const { colorScheme } = useColorScheme();

  // Refs for volatile values read inside trackViewAnalytics so the callback
  // stays stable and does not fire on every unrelated state change.
  const requiresStatusSelectionRef = useRef(requiresStatusSelection);
  const selectedStatusRef = useRef(selectedStatus);
  const responseTypeRef = useRef(responseType);
  const selectedTabRef = useRef(selectedTab);
  const selectedCallRef = useRef(selectedCall);
  const selectedGroupRef = useRef(selectedGroup);
  const selectedPoiRef = useRef(selectedPoi);
  const noteRef = useRef(note);
  const respondingToRef = useRef(respondingTo);
  const callsRef = useRef(calls);
  const groupsRef = useRef(groups);
  const poisRef = useRef(pois);
  const activeCallRef = useRef(activeCall);
  const colorSchemeRef = useRef(colorScheme);

  // Keep refs in sync with the latest values on every render.
  requiresStatusSelectionRef.current = requiresStatusSelection;
  selectedStatusRef.current = selectedStatus;
  responseTypeRef.current = responseType;
  selectedTabRef.current = selectedTab;
  selectedCallRef.current = selectedCall;
  selectedGroupRef.current = selectedGroup;
  selectedPoiRef.current = selectedPoi;
  noteRef.current = note;
  respondingToRef.current = respondingTo;
  callsRef.current = calls;
  groupsRef.current = groups;
  poisRef.current = pois;
  activeCallRef.current = activeCall;
  colorSchemeRef.current = colorScheme;

  const callsAllowed = areCallsAllowed();
  const stationsAllowed = areStationsAllowed();
  const poisAllowed = arePoisAllowed();
  const destinationRequired = isDestinationRequired();
  const noteRequired = isNoteRequiredForStatus(selectedStatus);

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

  const hasDestinationChoices = allowedTabs.length > 0;
  const steps = getPersonnelStatusSteps({
    requiresStatusSelection,
    hasStatus: selectedStatus != null,
    hasDestinationChoices,
    hasNoteStep: hasNoteStepForStatus(selectedStatus),
  });
  const totalSteps = steps.length;
  const isFirstStep = steps[0] === currentStep;
  const isLastStep = steps[steps.length - 1] === currentStep;

  // The active call, else the call the user's current status points at -- only while still open.
  const defaultCall = useMemo(() => getDefaultStatusCall(calls, activeCall, currentUserStatus ?? coreCurrentStatus), [activeCall, calls, coreCurrentStatus, currentUserStatus]);
  // A status with no destination to pick still sends the default call (see submitStatus).
  const implicitCall = selectedStatus && !hasDestinationChoices ? defaultCall : null;

  const selectableStatuses = useMemo(() => {
    const nextStatuses = activeStatuses || [];
    return selectedPoi ? nextStatuses.filter((status) => arePoisAllowedForStatus(status.Detail)) : nextStatuses;
  }, [activeStatuses, selectedPoi]);

  // The member's current status, and the statuses configured to follow it (Custom Statuses → Next statuses).
  const currentStatusId = useMemo(() => resolveCurrentStatusId(activeStatuses, { StateId: (currentUserStatus ?? coreCurrentStatus)?.StatusType }), [activeStatuses, coreCurrentStatus, currentUserStatus]);
  const currentStatus = useMemo(() => activeStatuses?.find((status) => String(status.Id) === currentStatusId) ?? null, [activeStatuses, currentStatusId]);
  const offeredStatuses = useMemo(() => getOfferedStatuses(selectableStatuses, currentStatusId, showAllStatuses), [currentStatusId, selectableStatuses, showAllStatuses]);
  const hasNextStatusRestriction = useMemo(() => showAllStatuses && getOfferedStatuses(selectableStatuses, currentStatusId, false).isRestricted, [currentStatusId, selectableStatuses, showAllStatuses]);
  const visibleStatuses = offeredStatuses.offered;

  useEffect(() => {
    if (!isOpen) {
      setShowAllStatuses(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchCalls();
      void fetchGroups();
      void fetchDestinationPois();
    }
  }, [fetchCalls, fetchDestinationPois, fetchGroups, isOpen]);

  useEffect(() => {
    if (defaultCall && currentStep === 'select-responding-to' && responseType === 'none' && callsAllowed && !selectedGroup && !selectedPoi) {
      setSelectedCall(defaultCall);
    }
  }, [defaultCall, callsAllowed, currentStep, responseType, selectedGroup, selectedPoi, setSelectedCall]);

  const trackViewAnalytics = useCallback(() => {
    try {
      trackEvent('personnel_status_bottom_sheet_viewed', {
        timestamp: new Date().toISOString(),
        currentStep,
        requiresStatusSelection: requiresStatusSelectionRef.current,
        selectedStatusId: selectedStatusRef.current?.Id ?? 0,
        selectedStatusText: selectedStatusRef.current?.Text ?? '',
        responseType: responseTypeRef.current,
        selectedTab: selectedTabRef.current,
        hasSelectedCall: !!selectedCallRef.current,
        selectedCallId: selectedCallRef.current?.CallId ?? '',
        hasSelectedGroup: !!selectedGroupRef.current,
        selectedGroupId: selectedGroupRef.current?.GroupId ?? '',
        hasSelectedPoi: !!selectedPoiRef.current,
        selectedPoiId: selectedPoiRef.current?.PoiId ?? 0,
        hasNote: noteRef.current.length > 0,
        noteLength: noteRef.current.length,
        hasRespondingTo: respondingToRef.current.length > 0,
        availableCallsCount: callsRef.current?.length || 0,
        availableGroupsCount: groupsRef.current?.length || 0,
        availablePoisCount: poisRef.current?.length || 0,
        hasActiveCall: !!activeCallRef.current,
        colorScheme: colorSchemeRef.current || 'light',
      });
    } catch (error) {
      console.warn('Failed to track personnel status bottom sheet view analytics:', error);
    }
  }, [trackEvent, currentStep]);

  const trackViewAnalyticsRef = useRef(trackViewAnalytics);
  trackViewAnalyticsRef.current = trackViewAnalytics;

  useEffect(() => {
    if (isOpen) {
      trackViewAnalyticsRef.current();
    }
  }, [isOpen, currentStep]);

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

  const handleStatusSelect = useCallback(
    (statusId: number) => {
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
    },
    [setSelectedStatus, trackEvent, visibleStatuses]
  );

  // Toasts render beneath this modal, so a tap in hold mode is explained inline instead.
  const [isHoldHintVisible, setIsHoldHintVisible] = React.useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsHoldHintVisible(false);
    }
  }, [isOpen]);

  const showHoldHint = useCallback(() => setIsHoldHintVisible(true), []);
  const handleShowAllStatuses = useCallback(() => setShowAllStatuses(true), []);
  const handleShowNextStatuses = useCallback(() => setShowAllStatuses(false), []);

  const handleStatusHold = useCallback(
    (status: StatusesResultData) => {
      try {
        trackEvent('personnel_status_option_held', {
          timestamp: new Date().toISOString(),
          statusId: status.Id,
          statusText: status.Text,
          statusDetail: status.Detail,
        });
      } catch (error) {
        console.warn('Failed to track status hold analytics:', error);
      }

      setIsHoldHintVisible(false);
      void confirmHeldStatus(status);
    },
    [confirmHeldStatus, trackEvent]
  );

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

  const handleHoldSubmit = () => {
    void handleSubmit();
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
      default:
        return t('personnel.status.set_status');
    }
  };

  const getStepNumber = () => Math.max(steps.indexOf(currentStep), 0) + 1;

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
        return !noteRequired || note.trim().length > 0;
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

    if (implicitCall) {
      return getCallDestinationDisplay(implicitCall);
    }

    return t('personnel.status.no_destination');
  };

  // The last step replaces the old confirmation screen, so it restates what Save will send.
  const renderStatusSummary = () => (
    <HStack space="sm" className="items-center rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800" testID="personnel-status-summary">
      <Text className="shrink font-semibold" numberOfLines={1}>
        {selectedStatus?.Text}
      </Text>
      {/* A dot, not an arrow: the app forces RTL for Arabic, where an arrow would point backwards. */}
      <VStack className="size-1 rounded-full bg-gray-400 dark:bg-gray-500" />
      <Text className="flex-1 text-sm text-gray-600 dark:text-gray-400" numberOfLines={1} testID="personnel-status-summary-destination">
        {getSelectedDestinationDisplay()}
      </Text>
    </HStack>
  );

  const renderHoldHint = () =>
    isHoldHintVisible ? (
      <Text className="text-sm font-semibold text-red-600 dark:text-red-400" accessibilityRole="alert" accessibilityLiveRegion="polite" testID="personnel-status-hold-hint">
        {t('personnel.status.hold_to_set_hint')}
      </Text>
    ) : null;

  const renderCurrentStatusBanner = (status: StatusesResultData) => {
    const textColor = invertColor(status.BColor, true);

    return (
      <View testID="personnel-status-current-banner" style={[styles.currentBanner, { backgroundColor: status.BColor }]}>
        <Text style={[styles.currentBannerCaption, { color: textColor }]}>{t('personnel.status.current_status')}</Text>
        <HStack space="sm" className="items-center">
          <Text className="flex-1 font-bold" style={{ color: textColor }}>
            {status.Text}
          </Text>
          <CurrentStatusPill />
        </HStack>
      </View>
    );
  };

  // Save failures are shown here rather than as a toast: the app's toasts render beneath this modal.
  const renderStepActions = () => (
    <>
      {renderHoldHint()}
      {submitError ? (
        <Text className="text-sm text-red-600 dark:text-red-400" accessibilityRole="alert" accessibilityLiveRegion="polite" testID="personnel-status-submit-error">
          {submitError}
        </Text>
      ) : null}
      <HStack space="sm" className="mt-4 justify-between">
        {isFirstStep ? (
          <Button variant="outline" onPress={handleClose} className="flex-1" isDisabled={isLoading}>
            <ButtonText>{t('common.cancel')}</ButtonText>
          </Button>
        ) : (
          <Button variant="outline" onPress={handlePrevious} className="flex-1" isDisabled={isLoading}>
            <ArrowLeft size={16} color={colorScheme === 'dark' ? '#737373' : '#737373'} />
            <ButtonText>{t('common.previous')}</ButtonText>
          </Button>
        )}
        {isLastStep && isHoldMode ? (
          <View style={styles.holdSave}>
            <HoldToConfirmButton
              testID="personnel-status-hold-save"
              onConfirm={handleHoldSubmit}
              onTap={showHoldHint}
              disabled={isLoading || !canProceedFromCurrentStep()}
              backgroundColor="#16a34a"
              foregroundColor="#ffffff"
              contentStyle={styles.holdSaveContent}
              accessibilityLabel={t('personnel.status.hold_to_submit')}
              accessibilityHint={t('personnel.status.hold_to_set_hint')}
            >
              <HStack space="xs" className="items-center justify-center">
                {isLoading ? <Spinner size="small" color="white" /> : null}
                <Text className="text-center font-semibold" style={{ color: '#ffffff' }}>
                  {isLoading ? t('common.submitting') : t('personnel.status.hold_to_submit')}
                </Text>
              </HStack>
            </HoldToConfirmButton>
          </View>
        ) : isLastStep ? (
          <Button onPress={handleSubmit} isDisabled={isLoading || !canProceedFromCurrentStep()} className="flex-1 bg-green-600" testID="personnel-status-save">
            <ButtonText>{isLoading ? t('common.submitting') : t('common.save')}</ButtonText>
          </Button>
        ) : (
          <Button onPress={handleNext} isDisabled={!canProceedFromCurrentStep()} className="flex-1 bg-blue-600">
            <ButtonText>{t('common.next')}</ButtonText>
            <ArrowRight size={16} color="#fff" />
          </Button>
        )}
      </HStack>
    </>
  );

  const selectedDestinationTabBackgroundColor = colorScheme === 'dark' ? '#2563eb' : '#1d4ed8';
  const selectedDestinationTabBorderColor = colorScheme === 'dark' ? '#60a5fa' : '#1d4ed8';
  const unselectedDestinationTabBackgroundColor = colorScheme === 'dark' ? '#171717' : '#f5f5f5';
  const unselectedDestinationTabBorderColor = colorScheme === 'dark' ? '#262626' : '#e5e5e5';
  const unselectedDestinationTabTextColor = colorScheme === 'dark' ? '#d4d4d8' : '#525252';

  return (
    <Actionsheet isOpen={isOpen} onClose={handleClose}>
      <ActionsheetBackdrop />
      {/* The sheet is bottom-anchored and sized by its content, so padding it by the
          keyboard height grows it and slides the whole sheet up out from under the
          keyboard. max-h keeps a tall step scrollable instead of overflowing the screen. */}
      <ActionsheetContent className="max-h-[90%] bg-white dark:bg-gray-900" style={{ paddingBottom: keyboardHeight }}>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        {/* shrink lets this column compress under the sheet's max-h when the keyboard
            padding eats vertical space; without it Yoga clips the overflow instead. */}
        <VStack space="md" className="w-full shrink p-4">
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
              <Text className="mb-2 font-medium">{isHoldMode ? t('personnel.status.hold_to_set_instructions') : t('personnel.status.status')}</Text>

              {/* The current status stays visible even when the list only offers what follows it. */}
              {currentStatus && !visibleStatuses.some((status) => String(status.Id) === currentStatusId) ? renderCurrentStatusBanner(currentStatus) : null}

              <ScrollView className="max-h-[320px]">
                {activeStatuses === null ? (
                  <VStack space="md" className="w-full items-center justify-center py-6">
                    <Spinner size="large" />
                    <Text className="text-center text-gray-600 dark:text-gray-400">{t('common.loading')}</Text>
                  </VStack>
                ) : visibleStatuses.length > 0 ? (
                  visibleStatuses.map((status) => (
                    <PersonnelStatusOption
                      key={status.Id}
                      status={status}
                      isSelected={selectedStatus?.Id === status.Id}
                      isCurrent={String(status.Id) === currentStatusId}
                      isHoldMode={isHoldMode}
                      isDisabled={isLoading}
                      onSelect={handleStatusSelect}
                      onHold={handleStatusHold}
                      onHoldTap={showHoldHint}
                    />
                  ))
                ) : (
                  <Text className="mt-4 italic text-gray-600 dark:text-gray-400">{t('home.status.no_options_available')}</Text>
                )}

                {offeredStatuses.isRestricted ? (
                  <TouchableOpacity testID="personnel-status-show-all" onPress={handleShowAllStatuses} className="items-center py-2">
                    <Text className="font-semibold text-primary-600 dark:text-primary-400">{t('personnel.status.show_all_statuses', { count: offeredStatuses.hiddenCount })}</Text>
                  </TouchableOpacity>
                ) : hasNextStatusRestriction ? (
                  <TouchableOpacity testID="personnel-status-show-next" onPress={handleShowNextStatuses} className="items-center py-2">
                    <Text className="font-semibold text-primary-600 dark:text-primary-400">{t('personnel.status.show_next_statuses')}</Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>

              {renderHoldHint()}
              {isHoldMode && isLoading && selectedStatus ? renderStatusSummary() : null}
              {submitError && isHoldMode ? (
                <Text className="text-sm text-red-600 dark:text-red-400" accessibilityRole="alert" accessibilityLiveRegion="polite" testID="personnel-status-submit-error">
                  {submitError}
                </Text>
              ) : null}

              <HStack space="sm" className="mt-4 items-center justify-between">
                <Button variant="outline" onPress={handleClose} className="flex-1" isDisabled={isLoading}>
                  <ButtonText>{t('common.cancel')}</ButtonText>
                </Button>
                {!isHoldMode ? (
                  <Button onPress={handleNext} isDisabled={!canProceedFromCurrentStep()} className="flex-1 bg-blue-600">
                    <ButtonText>{t('common.next')}</ButtonText>
                    <ArrowRight size={16} color="#fff" />
                  </Button>
                ) : isLoading ? (
                  <HStack space="xs" className="flex-1 items-center justify-center">
                    <Spinner size="small" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400">{t('common.submitting')}</Text>
                  </HStack>
                ) : null}
              </HStack>
            </VStack>
          ) : null}

          {currentStep === 'select-responding-to' && !hasDestinationChoices ? (
            /* No destination to pick and no note: this step is the one screen to save from. */
            <VStack space="md" className="w-full">
              {renderStatusSummary()}
              {renderStepActions()}
            </VStack>
          ) : null}

          {currentStep === 'select-responding-to' && hasDestinationChoices ? (
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

              {isLastStep ? renderStatusSummary() : null}
              {renderStepActions()}
            </VStack>
          ) : null}

          {currentStep === 'add-note' ? (
            /* Plain ScrollView on purpose: the sheet already slides above the keyboard via
               the ActionsheetContent paddingBottom. KeyboardAwareScrollView also reacts to
               the keyboard (its events are window-agnostic), so it compensated a second
               time and pushed the note field out of the sheet's visible area. */
            <ScrollView keyboardShouldPersistTaps={Platform.OS === 'android' ? 'handled' : 'always'} showsVerticalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 1, width: '100%' }}>
              <VStack space="md" className="w-full">
                {renderStatusSummary()}

                <VStack space="sm">
                  {noteRequired ? (
                    <Text className="font-medium">{t('personnel.status.note')}:</Text>
                  ) : (
                    <Text className="font-medium">
                      {t('personnel.status.note')} ({t('common.optional')}):
                    </Text>
                  )}
                  <Textarea size="md" className="min-h-[100px] w-full">
                    <TextareaInput placeholder={noteRequired ? t('personnel.status.note_required') : t('personnel.status.note_placeholder')} value={note} onChangeText={setNote} />
                  </Textarea>
                </VStack>

                {renderStepActions()}
              </VStack>
            </ScrollView>
          ) : null}
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
};

const styles = StyleSheet.create({
  holdSave: {
    flex: 1,
  },
  holdSaveContent: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  holdOptionContent: {
    padding: 12,
  },
  currentOutline: {
    borderWidth: 3,
    borderColor: CURRENT_STATUS_BORDER,
  },
  currentPill: {
    backgroundColor: CURRENT_STATUS_BORDER,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  currentBanner: {
    borderWidth: 3,
    borderColor: CURRENT_STATUS_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currentBannerCaption: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
    textTransform: 'uppercase',
  },
});
