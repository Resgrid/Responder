import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

// Saving a call re-dispatches it, so a double-tap on Save must never send the update twice.
// These tests drive the screen's in-flight guard directly.

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
  dispatchSelection: { everyone: false, users: [], groups: [], roles: [], units: [] },
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
  useLocalSearchParams: () => ({ id: 'call-1' }),
}));

jest.mock('@/api/dispatch', () => ({ getNewCallData: jest.fn().mockResolvedValue({ Data: { DestinationPois: [], PoiTypes: [] } }) }));

const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackEvent: mockTrackEvent }) }));

const mockToastShow = jest.fn();
jest.mock('@/components/ui/toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

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
  styled: jest.fn(() => (Component: unknown) => Component),
}));

const mockCallsState = {
  callPriorities: [{ Id: 1, Name: 'High', Color: '#ff0000' }],
  callTypes: [{ Id: 1, Name: 'Fire' }],
  isLoading: false,
  error: null,
  fetchCallPriorities: jest.fn(),
  fetchCallTypes: jest.fn(),
};

jest.mock('@/stores/calls/store', () => {
  const useCallsStore = (selector?: (state: unknown) => unknown) => (selector ? selector(mockCallsState) : mockCallsState);
  useCallsStore.getState = () => mockCallsState;
  return { useCallsStore };
});

const mockUpdateCall = jest.fn();

const mockDetailState = {
  call: {
    CallId: 'call-1',
    Name: 'Structure Fire',
    Nature: 'Smoke showing',
    Note: '',
    Address: '123 Main St',
    Geolocation: '',
    Latitude: undefined,
    Longitude: undefined,
    Priority: 1,
    Type: 'Fire',
    ContactName: '',
    ContactInfo: '',
    DestinationPoiId: undefined,
  },
  callExtraData: { Dispatches: [] },
  isLoading: false,
  error: null,
  fetchCallDetail: jest.fn(),
  updateCall: mockUpdateCall,
};

jest.mock('@/stores/calls/detail-store', () => {
  const useCallDetailStore = (selector?: (state: unknown) => unknown) => (selector ? selector(mockDetailState) : mockDetailState);
  useCallDetailStore.getState = () => mockDetailState;
  return { useCallDetailStore };
});

jest.mock('@/stores/app/core-store', () => {
  const coreState = { config: { GoogleMapsKey: '', W3WKey: '' } };
  return { useCoreStore: (selector?: (state: unknown) => unknown) => (selector ? selector(coreState) : coreState) };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const EditCall = require('../edit').default as React.ComponentType;

describe('Edit call submit guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends only one update when Save is double-tapped while the request is in flight', async () => {
    let resolveUpdate: ((value: unknown) => void) | undefined;
    mockUpdateCall.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
    );

    render(<EditCall />);

    const saveButton = await screen.findByTestId('save-call-button');

    fireEvent.press(saveButton);
    fireEvent.press(saveButton);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockUpdateCall).toHaveBeenCalledTimes(1);
    });

    resolveUpdate?.(undefined);

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalled();
    });
  });

  it('allows a retry after a failed update', async () => {
    mockUpdateCall.mockRejectedValueOnce(new Error('network down'));

    render(<EditCall />);

    const saveButton = await screen.findByTestId('save-call-button');

    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalled();
    });

    mockUpdateCall.mockResolvedValueOnce(undefined);

    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockUpdateCall).toHaveBeenCalledTimes(2);
    });
  });
});
