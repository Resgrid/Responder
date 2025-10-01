import React from 'react';

import { VStack } from '@/components/ui/vstack';

import { useToastStore } from '../../stores/toast/store';
import { ToastMessage } from './toast';

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);

  const topToasts = toasts.filter((toast) => !toast.position || toast.position === 'top');
  const bottomToasts = toasts.filter((toast) => toast.position === 'bottom');
  const centerToasts = toasts.filter((toast) => toast.position === 'center');

  return (
    <>
      {/* Top positioned toasts */}
      {topToasts.length > 0 && (
        <VStack className="pt-safe-top absolute inset-x-0 top-0 z-50 mt-20" space="sm">
          {topToasts.map((toast) => (
            <ToastMessage key={toast.id} {...toast} />
          ))}
        </VStack>
      )}

      {/* Center positioned toasts */}
      {centerToasts.length > 0 && (
        <VStack className="absolute inset-x-0 top-1/2 z-50 -translate-y-1/2" space="sm">
          {centerToasts.map((toast) => (
            <ToastMessage key={toast.id} {...toast} />
          ))}
        </VStack>
      )}

      {/* Bottom positioned toasts */}
      {bottomToasts.length > 0 && (
        <VStack className="pb-safe-bottom absolute inset-x-0 bottom-0 z-50 mb-20" space="sm">
          {bottomToasts.map((toast) => (
            <ToastMessage key={toast.id} {...toast} />
          ))}
        </VStack>
      )}
    </>
  );
};
