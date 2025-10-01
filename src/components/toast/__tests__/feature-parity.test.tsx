/**
 * Feature Parity Test for FlashMessage -> Toast Migration
 * 
 * This test verifies that the new toast system provides the same functionality
 * as the previous FlashMessage implementation.
 */

import { useToast } from '@/hooks/use-toast';
import { showError, showErrorMessage } from '@/components/ui/utils';
import { useToastStore } from '@/stores/toast/store';
import { renderHook, act } from '@testing-library/react-native';

describe('FlashMessage -> Toast Migration Feature Parity', () => {
  beforeEach(() => {
    // Clear the store before each test
    useToastStore.getState().toasts.forEach((toast) => {
      useToastStore.getState().removeToast(toast.id);
    });
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Position Support', () => {
    it('should support top position (equivalent to FlashMessage position="top")', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('Test message', 'Title', 'top');
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].position).toBe('top');
    });

    it('should default to top position when not specified', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('Test message');
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].position).toBe('top');
    });

    it('should support additional positions (center, bottom)', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.info('Center message', undefined, 'center');
        result.current.success('Bottom message', undefined, 'bottom');
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts.find(t => t.message === 'Center message')?.position).toBe('center');
      expect(toasts.find(t => t.message === 'Bottom message')?.position).toBe('bottom');
    });
  });

  describe('Type Mapping', () => {
    it('should map danger type to error type', () => {
      // FlashMessage used 'danger', toast uses 'error'
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('Error message');
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].type).toBe('error');
    });

    it('should support all toast types', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Success message');
        result.current.warning('Warning message');
        result.current.info('Info message');
        result.current.error('Error message');
      });

      const toasts = useToastStore.getState().toasts;
      const types = toasts.map(t => t.type);
      expect(types).toContain('success');
      expect(types).toContain('warning');
      expect(types).toContain('info');
      expect(types).toContain('error');
    });
  });

  describe('Duration Support', () => {
    it('should support custom duration (FlashMessage duration: 4000)', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('Test message', 'Title', 'top', 4000);
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].duration).toBe(4000);
    });

    it('should default to 3000ms when not specified', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('Test message');
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].duration).toBe(3000);
    });
  });

  describe('Message Structure', () => {
    it('should support title and message (equivalent to FlashMessage message and description)', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('Description text', 'Message title');
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].title).toBe('Message title');
      expect(toasts[0].message).toBe('Description text');
    });

    it('should support message without title', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('Message only');
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].title).toBeUndefined();
      expect(toasts[0].message).toBe('Message only');
    });
  });

  describe('Utils.tsx Migration', () => {
    it('should maintain showError functionality with exact same parameters', () => {
      const mockError = {
        response: {
          data: 'API error occurred'
        }
      } as any;

      showError(mockError);

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('error');
      expect(toasts[0].message).toBe('API error occurred');
      expect(toasts[0].title).toBe('Error');
      expect(toasts[0].position).toBe('top');
      expect(toasts[0].duration).toBe(4000);
    });

    it('should maintain showErrorMessage functionality', () => {
      showErrorMessage('Custom error');

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('error');
      expect(toasts[0].message).toBe('Custom error');
      expect(toasts[0].title).toBeUndefined();
      expect(toasts[0].position).toBe('top');
      expect(toasts[0].duration).toBe(4000);
    });

    it('should maintain default error message behavior', () => {
      showErrorMessage();

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].message).toBe('Something went wrong ');
    });
  });

  describe('Icon Support', () => {
    it('should maintain semantic meaning without requiring icon prop', () => {
      // FlashMessage had icon: 'danger', toast system uses type-based styling
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('Error message');
        result.current.success('Success message');
        result.current.warning('Warning message');
        result.current.info('Info message');
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts.map(t => t.type)).toEqual(['error', 'success', 'warning', 'info']);
      // Toast component will handle visual styling based on type
    });
  });

  describe('Auto Removal', () => {
    it('should configure auto-removal with custom duration', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('Test message', 'Title', 'top', 100); // 100ms duration
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].duration).toBe(100);
      // Auto-removal is handled by setTimeout in the store
      // Testing the actual removal would require mocking timers
    });
  });
});