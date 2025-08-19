import { EditIcon, MoreVerticalIcon, XIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Pressable } from '@/components/ui/';
import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper, ActionsheetItem, ActionsheetItemText } from '@/components/ui/actionsheet';
import { HStack } from '@/components/ui/hstack';
import { useSecurityStore } from '@/stores/security/store';

interface CallDetailMenuProps {
  onEditCall: () => void;
  onCloseCall: () => void;
}

export const useCallDetailMenu = ({ onEditCall, onCloseCall }: CallDetailMenuProps) => {
  const { t } = useTranslation();
  const { canUserCreateCalls } = useSecurityStore();
  const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);

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
