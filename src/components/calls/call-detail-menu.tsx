import { EditIcon, MoreVerticalIcon, TimerIcon, XIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Pressable } from '@/components/ui/';
import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper, ActionsheetItem, ActionsheetItemText } from '@/components/ui/actionsheet';
import { HStack } from '@/components/ui/hstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { useSecurityStore } from '@/stores/security/store';

// --- Module-level components (stable type references — never defined inside a hook or render) ---

interface HeaderRightMenuButtonProps {
  canEdit: boolean;
  onPress: () => void;
}

export const HeaderRightMenuButton: React.FC<HeaderRightMenuButtonProps> = ({ canEdit, onPress }) => {
  if (!canEdit) {
    return null;
  }

  return (
    <Pressable onPressIn={onPress} testID="kebab-menu-button" className="rounded p-2">
      <MoreVerticalIcon size={24} className="text-gray-700 dark:text-gray-300" />
    </Pressable>
  );
};

interface CallDetailActionSheetPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onEditCall: () => void;
  onCloseCall: () => void;
  onSetActiveCall?: () => void;
}

export const CallDetailActionSheetPanel: React.FC<CallDetailActionSheetPanelProps> = ({ isOpen, onClose, onEditCall, onCloseCall, onSetActiveCall }) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose} testID="call-detail-actionsheet">
      <ActionsheetBackdrop />
      <ActionsheetContent className="bg-white dark:bg-gray-900">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <ActionsheetItem
          onPress={() => {
            onClose();
            try {
              trackEvent('call_detail_menu_edit_selected', {
                timestamp: new Date().toISOString(),
              });
            } catch (error) {
              console.warn('Failed to track edit call analytics:', error);
            }
            onEditCall();
          }}
          testID="edit-call-button"
        >
          <HStack className="items-center">
            <EditIcon size={16} className="mr-3 text-gray-700 dark:text-gray-300" />
            <ActionsheetItemText>{t('call_detail.edit_call')}</ActionsheetItemText>
          </HStack>
        </ActionsheetItem>

        <ActionsheetItem
          onPress={() => {
            onClose();
            try {
              trackEvent('call_detail_menu_close_selected', {
                timestamp: new Date().toISOString(),
              });
            } catch (error) {
              console.warn('Failed to track close call analytics:', error);
            }
            onCloseCall();
          }}
          testID="close-call-button"
        >
          <HStack className="items-center">
            <XIcon size={16} className="mr-3 text-gray-700 dark:text-gray-300" />
            <ActionsheetItemText>{t('call_detail.close_call')}</ActionsheetItemText>
          </HStack>
        </ActionsheetItem>

        {onSetActiveCall ? (
          <ActionsheetItem
            onPress={() => {
              onClose();
              onSetActiveCall();
            }}
            testID="set-active-call-button"
          >
            <HStack className="items-center">
              <TimerIcon size={16} className="mr-3 text-gray-700 dark:text-gray-300" />
              <ActionsheetItemText>{t('home.active_call.set_active')}</ActionsheetItemText>
            </HStack>
          </ActionsheetItem>
        ) : null}
      </ActionsheetContent>
    </Actionsheet>
  );
};

// --- Hook ---
// Returns only state and callbacks; rendering is done by the module-level components above.

export const useCallDetailMenu = () => {
  const { canUserCreateCalls } = useSecurityStore();
  const { trackEvent } = useAnalytics();
  const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);

  // Track analytics when menu becomes visible
  useEffect(() => {
    if (isKebabMenuOpen) {
      try {
        trackEvent('call_detail_menu_viewed', {
          timestamp: new Date().toISOString(),
          canEditCall: canUserCreateCalls ?? false,
        });
      } catch (error) {
        // Analytics errors should not break the component
        console.warn('Failed to track call detail menu analytics:', error);
      }
    }
  }, [isKebabMenuOpen, trackEvent, canUserCreateCalls]);

  const openMenu = useCallback(() => {
    setIsKebabMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsKebabMenuOpen(false);
  }, []);

  return {
    isMenuOpen: isKebabMenuOpen,
    openMenu,
    closeMenu,
    canEdit: canUserCreateCalls ?? false,
  };
};
