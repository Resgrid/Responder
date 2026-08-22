import React from 'react';

import { VStack } from '@/components/ui/vstack';

import { type ToastType, useToastStore } from '../../stores/toast/store';
import { Toast, ToastDescription, ToastTitle } from '../ui/toast';

export const ToastMessage: React.FC<{
  //id: string;
  type: ToastType;
  title?: string;
  message: string;
  position?: string;
  duration?: number;
}> = ({ /*id,*/ type, title, message /*, position, duration*/ }) => {
  //const { removeToast } = useToastStore();

  // Rendered verbatim: callers already pass text through t(). Re-translating here made
  // i18next parse any toast text containing ':' as `namespace:key` and silently strip
  // the prefix.
  return (
    <Toast className="mx-4 rounded-lg border" action={type}>
      <VStack space="xs">
        {title ? <ToastTitle className="font-medium">{title}</ToastTitle> : null}
        <ToastDescription>{message}</ToastDescription>
      </VStack>
    </Toast>
  );
};
