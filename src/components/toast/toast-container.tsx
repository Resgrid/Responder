import React from 'react';

import { VStack } from '@/components/ui/vstack';

import { useToastStore } from '../../stores/toast/store';
import { ToastMessage } from './toast';
export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <VStack className="pt-safe-top absolute inset-x-0 top-0 z-50 mt-10" space="sm">
      {toasts.map((toast) => (
        <ToastMessage key={toast.id} {...toast} />
      ))}
    </VStack>
  );
};
