import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'muted';
export type ToastPosition = 'top' | 'bottom' | 'center';

interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  position?: ToastPosition;
  duration?: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  showToast: (type: ToastType, message: string, title?: string, position?: ToastPosition, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (type, message, title, position = 'top', duration = 3000) => {
    const id = Math.random().toString(36).substring(7);
    const toastMessage: ToastMessage = { id, type, message, position, duration };
    if (title !== undefined) {
      toastMessage.title = title;
    }
    set((state) => ({
      toasts: [...state.toasts, toastMessage],
    }));
    // Auto remove toast after specified duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, duration);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));
