import { EditIcon, MoreVerticalIcon, XIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Pressable } from '@/components/ui/';
import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper, ActionsheetItem, ActionsheetItemText } from '@/components/ui/actionsheet';
import { HStack } from '@/components/ui/hstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { useSecurityStore } from '@/stores/security/store';

interface CallDetailMenuProps {
  onEditCall: () => void;
  onCloseCall: () => void;
}

export const useCallDetailMenu = ({ onEditCall, onCloseCall }: CallDetailMenuProps) => {
  const { t } = useTranslation();
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

  const openMenu = () => {
    setIsKebabMenuOpen(true);
  };
  const closeMenu = () => setIsKebabMenuOpen(false);

  const HeaderRightMenu = () => {
    // Only show the menu if user can create calls
    if (!canUserCreateCalls) {
      return null;
    }

    return (
      <Pressable onPressIn={openMenu} testID="kebab-menu-button" className="rounded p-2">
        <MoreVerticalIcon size={24} className="text-gray-700 dark:text-gray-300" />
      </Pressable>
    );
  };

  const CallDetailActionSheet = () => (
    <Actionsheet isOpen={isKebabMenuOpen} onClose={closeMenu} testID="call-detail-actionsheet">
      <ActionsheetBackdrop />
      <ActionsheetContent className="bg-white dark:bg-gray-900">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <ActionsheetItem
          onPress={() => {
            closeMenu();
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
            closeMenu();
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
      </ActionsheetContent>
    </Actionsheet>
  );

  return {
    HeaderRightMenu,
    CallDetailActionSheet,
    isMenuOpen: isKebabMenuOpen,
    openMenu,
    closeMenu,
  };
};
