import { type ToastPosition, type ToastType, useToastStore } from '../stores/toast/store';

export const useToast = () => {
  const { showToast } = useToastStore();

  return {
    show: (type: ToastType, message: string, title?: string, position?: ToastPosition, duration?: number) => {
      showToast(type, message, title, position, duration);
    },
    success: (message: string, title?: string, position?: ToastPosition, duration?: number) => {
      showToast('success', message, title, position, duration);
    },
    error: (message: string, title?: string, position?: ToastPosition, duration?: number) => {
      showToast('error', message, title, position, duration);
    },
    warning: (message: string, title?: string, position?: ToastPosition, duration?: number) => {
      showToast('warning', message, title, position, duration);
    },
    info: (message: string, title?: string, position?: ToastPosition, duration?: number) => {
      showToast('info', message, title, position, duration);
    },
  };
};
