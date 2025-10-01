import { showError, showErrorMessage } from '@/components/ui/utils';
import { useToastStore } from '@/stores/toast/store';

// Mock AxiosError for testing
const mockAxiosError = {
  response: {
    data: 'Network error occurred'
  }
} as any;

describe('Utils Toast Migration', () => {
  beforeEach(() => {
    // Clear console log mock
    jest.clearAllMocks();
    // Clear the store before each test
    useToastStore.getState().toasts.forEach((toast) => {
      useToastStore.getState().removeToast(toast.id);
    });
    // Mock console.log
    jest.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should show error toast using showError function', () => {
    showError(mockAxiosError);

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toBe('Network error occurred');
    expect(toasts[0].title).toBe('Error');
    expect(toasts[0].position).toBe('top');
    expect(toasts[0].duration).toBe(4000);
  });

  it('should show error toast using showErrorMessage function', () => {
    showErrorMessage('Custom error message');

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toBe('Custom error message');
    expect(toasts[0].title).toBeUndefined();
    expect(toasts[0].position).toBe('top');
    expect(toasts[0].duration).toBe(4000);
  });

  it('should show default error message when no message provided', () => {
    showErrorMessage();

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toBe('Something went wrong ');
    expect(toasts[0].position).toBe('top');
    expect(toasts[0].duration).toBe(4000);
  });
});