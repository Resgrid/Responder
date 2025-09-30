import { renderHook, act } from '@testing-library/react-native';

import { useToast } from '@/hooks/use-toast';
import { useToastStore } from '@/stores/toast/store';

describe('Toast Migration', () => {
  beforeEach(() => {
    // Clear the store before each test
    useToastStore.getState().toasts.forEach((toast) => {
      useToastStore.getState().removeToast(toast.id);
    });
  });

  it('should show toast with default position and duration', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.error('Test error message', 'Error Title');
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toBe('Test error message');
    expect(toasts[0].title).toBe('Error Title');
    expect(toasts[0].position).toBe('top');
    expect(toasts[0].duration).toBe(3000);
  });

  it('should show toast with custom position and duration', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.error('Test error message', 'Error Title', 'bottom', 4000);
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toBe('Test error message');
    expect(toasts[0].title).toBe('Error Title');
    expect(toasts[0].position).toBe('bottom');
    expect(toasts[0].duration).toBe(4000);
  });

  it('should show toast using store directly (like utils.tsx)', () => {
    act(() => {
      useToastStore.getState().showToast('error', 'Something went wrong', 'Error', 'top', 4000);
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toBe('Something went wrong');
    expect(toasts[0].title).toBe('Error');
    expect(toasts[0].position).toBe('top');
    expect(toasts[0].duration).toBe(4000);
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
    expect(toasts).toHaveLength(4);
    expect(toasts.map(t => t.type)).toEqual(['success', 'warning', 'info', 'error']);
  });

  it('should support all positions', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.info('Top message', undefined, 'top');
      result.current.info('Center message', undefined, 'center');
      result.current.info('Bottom message', undefined, 'bottom');
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(3);
    expect(toasts.map(t => t.position)).toEqual(['top', 'center', 'bottom']);
  });
});