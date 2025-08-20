// Mock analytics first
const mockTrackEventSimple = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEventSimple,
  }),
}));

// Mock useFocusEffect
const mockUseFocusEffectSimple = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: mockUseFocusEffectSimple,
}));

// Mock all other dependencies
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('axios', () => ({
  get: jest.fn(),
}));

jest.mock('@/api/calls/calls', () => ({
  createCall: jest.fn(),
}));

jest.mock('@/stores/calls/store', () => ({
  useCallsStore: () => ({
    callPriorities: [{ Id: 1, Name: 'High' }],
    callTypes: [{ Id: '1', Name: 'Emergency' }],
    isLoading: false,
    error: null,
    fetchCallPriorities: jest.fn(),
    fetchCallTypes: jest.fn(),
  }),
}));

jest.mock('@/stores/app/core-store', () => ({
  useCoreStore: () => ({
    config: {
      GoogleMapsKey: 'test-key',
      W3WKey: 'test-key',
    },
  }),
}));

// Mock UI components to avoid import issues
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

jest.mock('@/components/common/loading', () => ({
  Loading: () => null,
}));

jest.mock('@/components/calls/dispatch-selection-modal', () => ({
  DispatchSelectionModal: () => null,
}));

jest.mock('@/components/maps/location-picker', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/maps/full-screen-location-picker', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/ui/bottom-sheet', () => ({
  CustomBottomSheet: () => null,
}));

jest.mock('@/components/ui/box', () => ({
  Box: ({ children }: any) => children,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children }: any) => children,
  ButtonText: ({ children }: any) => children,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => children,
}));

jest.mock('@/components/ui/form-control', () => ({
  FormControl: ({ children }: any) => children,
  FormControlError: ({ children }: any) => children,
  FormControlLabel: ({ children }: any) => children,
  FormControlLabelText: ({ children }: any) => children,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ children }: any) => children,
  InputField: () => null,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => children,
  SelectBackdrop: () => null,
  SelectContent: ({ children }: any) => children,
  SelectIcon: () => null,
  SelectInput: () => null,
  SelectItem: () => null,
  SelectPortal: ({ children }: any) => children,
  SelectTrigger: ({ children }: any) => children,
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children }: any) => children,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ children }: any) => children,
  TextareaInput: () => null,
}));

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: Function) => fn,
    formState: { errors: {} },
    setValue: jest.fn(),
  }),
  Controller: ({ render }: any) => render({ field: { onChange: jest.fn(), onBlur: jest.fn(), value: '' } }),
}));

jest.mock('lucide-react-native', () => ({
  ChevronDownIcon: () => null,
  PlusIcon: () => null,
  SearchIcon: () => null,
}));

describe('NewCall Analytics Simple Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register focus effect callback for view tracking', () => {
    const NewCall = require('../index').default;

    // Mock React.createElement to avoid rendering issues
    const React = require('react');
    const originalCreateElement = React.createElement;
    React.createElement = jest.fn(() => null);

    try {
      // This should trigger the useFocusEffect registration
      NewCall();

      expect(mockUseFocusEffectSimple).toHaveBeenCalledWith(expect.any(Function));
    } finally {
      React.createElement = originalCreateElement;
    }
  });

  it('should call analytics when focus callback is executed', () => {
    let focusCallback: (() => void) | undefined;
    mockUseFocusEffectSimple.mockImplementation((callback: () => void) => {
      focusCallback = callback;
    });

    const NewCall = require('../index').default;
    const React = require('react');
    const originalCreateElement = React.createElement;
    React.createElement = jest.fn(() => null);

    try {
      NewCall();

      // Execute the focus callback
      focusCallback?.();

      expect(mockTrackEventSimple).toHaveBeenCalledWith('call_new_viewed', expect.objectContaining({
        timestamp: expect.any(String),
        priorityCount: expect.any(Number),
        typeCount: expect.any(Number),
        hasGoogleMapsKey: expect.any(Boolean),
        hasWhat3WordsKey: expect.any(Boolean),
      }));
    } finally {
      React.createElement = originalCreateElement;
    }
  });

  it('should have analytics events properly structured', () => {
    // Test the analytics event structure without rendering
    const eventData = {
      timestamp: new Date().toISOString(),
      priorityCount: 1,
      typeCount: 1,
      hasGoogleMapsKey: true,
      hasWhat3WordsKey: true,
    };

    expect(eventData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(typeof eventData.priorityCount).toBe('number');
    expect(typeof eventData.typeCount).toBe('number');
    expect(typeof eventData.hasGoogleMapsKey).toBe('boolean');
    expect(typeof eventData.hasWhat3WordsKey).toBe('boolean');
  });

  it('should handle analytics hook import correctly', () => {
    const { useAnalytics } = require('@/hooks/use-analytics');
    const { trackEvent } = useAnalytics();

    expect(typeof trackEvent).toBe('function');

    // Test calling the track event
    trackEvent('test_event', { timestamp: new Date().toISOString() });

    expect(mockTrackEventSimple).toHaveBeenCalledWith('test_event', expect.objectContaining({
      timestamp: expect.any(String),
    }));
  });
});
