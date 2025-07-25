import React from 'react';
import { useTranslation } from 'react-i18next';

import { VStack } from '@/components/ui/vstack';

import { type ToastType, useToastStore } from '../../stores/toast/store';
import { Toast, ToastDescription, ToastTitle } from '../ui/toast';

const toastStyles = {
  info: {
    bg: '$info700',
    borderColor: '$info800',
  },
  success: {
    bg: '$success700',
    borderColor: '$success800',
  },
  warning: {
    bg: '$warning700',
    borderColor: '$warning800',
  },
  error: {
    bg: '$error700',
    borderColor: '$error800',
  },
  muted: {
    bg: '$muted700',
    borderColor: '$muted800',
  },
};

export const ToastMessage: React.FC<{
  //id: string;
  type: ToastType;
  title?: string;
  message: string;
}> = ({ /*id,*/ type, title, message }) => {
  //const { removeToast } = useToastStore();
  const { t } = useTranslation();

  return (
    <Toast className="mx-4 rounded-lg border" style={toastStyles[type]} action={type}>
      <VStack space="xs">
        {title && <ToastTitle className="font-medium text-white">{t(title)}</ToastTitle>}
        <ToastDescription className="text-white">{t(message)}</ToastDescription>
      </VStack>
    </Toast>
  );
};
