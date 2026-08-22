import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { createCall } from '@/api/calls/calls';

// Creating a call dispatches it to the whole department, so a double-tap on Create must never
// produce two calls. These tests drive the screen's in-flight guard directly.

const mockFormValues = {
  name: 'Structure Fire',
  nature: 'Smoke showing',
  note: '',
  address: '123 Main St',
  coordinates: '',
  what3words: '',
  plusCode: '',
  latitude: undefined,
  longitude: undefined,
  priority: 'High',
  type: 'Fire',
  destinationPoiId: 'none',
  contactName: '',
  contactInfo: '',
  dispatchSelection: { everyone: true, users: [], groups: [], roles: [], units: [] },
};

// Bypass validation: this suite is about the submit guard, not the zod schema.
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (onValid: (values: unknown) => unknown) => () => onValid(mockFormValues),
    formState: { errors: {} },
    setValue: jest.fn(),
    reset: jest.fn(),
    getValues: () => mockFormValues,
  }),
  Controller: ({ render: renderField }: { render: (arg: unknown) => React.ReactElement }) => renderField({ field: { onChange: jest.fn(), onBlur: jest.fn(), value: '' } }),
}));

jest.mock('@hookform/resolvers/zod', () => ({ zodResolver: () => jest.fn() }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  Stack: { Screen: () => null },
  useFocusEffect: jest.fn(),
}));

jest.mock('@/api/calls/calls', () => ({ createCall: jest.fn() }));
jest.mock('@/api/dispatch', () => ({ getNewCallData: jest.fn().mockResolvedValue({ Data: { DestinationPois: [], PoiTypes: [] } }) }));

const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackEvent: mockTrackEvent }) }));

const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn(), show: jest.fn() };
jest.mock('@/hooks/use-toast', () => ({ useToast: () => mockToast }));

jest.mock('@/hooks/use-new-call-field-policy', () => ({
  useNewCallFieldPolicy: () => ({
    isLoaded: true,
    isVisible: () => true,
    isRequired: () => false,
    missingRequired: () => [],
  }),
}));

jest.mock('@/components/maps/location-picker', () => 'LocationPicker');
jest.mock('@/components/maps/full-screen-location-picker', () => 'FullScreenLocationPicker');
jest.mock('@/components/calls/dispatch-selection-modal', () => ({ DispatchSelectionModal: () => null }));
jest.mock('@/components/common/header-back-button', () => ({ HeaderBackButton: () => null }));

jest.mock('@/components/ui/select', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const passthrough =
    (testID: string) =>
    ({ children }: { children?: React.ReactNode }) =>
      ReactModule.createElement(View, { testID }, children);

  return {
    Select: passthrough('select'),
    SelectTrigger: passthrough('select-trigger'),
    SelectInput: () => null,
    SelectIcon: () => null,
    SelectPortal: () => null,
    SelectBackdrop: () => null,
    SelectContent: passthrough('select-content'),
    SelectItem: () => null,
  };
});

jest.mock('@/components/ui/bottom-sheet', () => ({ CustomBottomSheet: () => null }));

jest.mock('lucide-react-native', () => ({
  ChevronDownIcon: () => null,
  PlusIcon: () => null,
  SearchIcon: () => null,
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
  cssInterop: jest.fn(),
  styled: jest.fn((Component: unknown) => Component),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockCallsState = {
  callPriorities: [{ Id: 1, Name: 'High', Color: '#ff0000' }],
  callTypes: [{ Id: 1, Name: 'Fire' }],
  isLoading: false,
  error: null,
  fetchCallPriorities: jest.fn(),
  fetchCallTypes: jest.fn(),
};

jest.mock('@/stores/calls/store', () => ({
  useCallsStore: (selector?: (state: unknown) => unknown) => (selector ? selector(mockCallsState) : mockCallsState),
}));

jest.mock('@/stores/app/core-store', () => {
  const coreState = { config: { GoogleMapsKey: '', W3WKey: '' } };
  return { useCoreStore: (selector?: (state: unknown) => unknown) => (selector ? selector(coreState) : coreState) };
});

const mockedCreateCall = createCall as jest.MockedFunction<typeof createCall>;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const NewCall = require('../index').default as React.ComponentType;

describe('New call submit guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates only one call when Create is double-tapped while the request is in flight', async () => {
    type CreateCallResult = Awaited<ReturnType<typeof createCall>>;
    let resolveCreate: ((value: CreateCallResult) => void) | undefined;
    mockedCreateCall.mockImplementation(
      () =>
        new Promise<CreateCallResult>((resolve) => {
          resolveCreate = resolve;
        })
    );

    render(<NewCall />);

    const createButton = await screen.findByTestId('create-call-button');

    fireEvent.press(createButton);
    fireEvent.press(createButton);
    fireEvent.press(createButton);

    expect(mockedCreateCall).toHaveBeenCalledTimes(1);

    resolveCreate?.({ Id: 'call-1' } as CreateCallResult);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalled();
    });
  });

  it('allows a retry after a failed create', async () => {
    mockedCreateCall.mockRejectedValueOnce(new Error('network down'));

    render(<NewCall />);

    const createButton = await screen.findByTestId('create-call-button');

    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });

    mockedCreateCall.mockResolvedValueOnce({ Id: 'call-2' } as Awaited<ReturnType<typeof createCall>>);

    fireEvent.press(createButton);

    expect(mockedCreateCall).toHaveBeenCalledTimes(2);
  });
});
