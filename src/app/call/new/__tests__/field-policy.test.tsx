import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import React from 'react';

import { createCall } from '@/api/calls/calls';
import { getNewCallFieldPolicy } from '@/api/calls/newCallFieldPolicy';
import { type NewCallFieldRuleData } from '@/models/v4/calls/newCallFieldPolicyResultData';

// The department's new-call field policy: every built-in input this screen renders must disappear when
// the policy hides it, show as required when the policy requires it, and be checked before the call is
// created. Runs the real policy hook against a mocked policy endpoint.

const baseFormValues = {
  name: 'Structure Fire',
  nature: 'Smoke showing',
  note: '',
  address: '123 Main St',
  coordinates: '',
  what3words: '',
  plusCode: '',
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  priority: 'High',
  type: 'Fire',
  destinationPoiId: 'none',
  contactName: '',
  contactInfo: '',
  externalId: '',
  incidentId: '',
  referenceId: '',
  dispatchOn: '',
  dispatchSelection: { everyone: true, users: [], groups: [], roles: [], units: [] },
};

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60 * 1000).toISOString();

let mockFormValues = { ...baseFormValues };

// Bypass validation: this suite is about the field policy, not the zod schema.
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (onValid: (values: unknown) => unknown) => () => onValid({ ...mockFormValues }),
    formState: { errors: {} },
    setValue: jest.fn(),
    reset: jest.fn(),
    getValues: () => mockFormValues,
  }),
  Controller: ({ render: renderField }: { render: (arg: unknown) => React.ReactElement }) => renderField({ field: { onChange: jest.fn(), onBlur: jest.fn(), value: '' } }),
}));

jest.mock('@hookform/resolvers/zod', () => ({ zodResolver: () => jest.fn() }));

// Stable across renders (effects depend on it); shows interpolated values so the toast can be read.
const mockT = (key: string, options?: { fields?: string; minutes?: number }) => (options?.fields !== undefined ? `${key}|${options.fields}` : options?.minutes !== undefined ? `${key}|${options.minutes}` : key);
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  Stack: { Screen: () => null },
  useFocusEffect: jest.fn(),
}));

jest.mock('@/api/calls/calls', () => ({ createCall: jest.fn() }));
jest.mock('@/api/calls/newCallFieldPolicy', () => ({ getNewCallFieldPolicy: jest.fn() }));
jest.mock('@/api/dispatch', () => ({ getNewCallData: jest.fn().mockResolvedValue({ Data: { DestinationPois: [], PoiTypes: [] } }) }));

jest.mock('@/lib/logging', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));

const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackEvent: mockTrackEvent }) }));

const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn(), show: jest.fn() };
jest.mock('@/hooks/use-toast', () => ({ useToast: () => mockToast }));

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
const mockedGetPolicy = getNewCallFieldPolicy as jest.MockedFunction<typeof getNewCallFieldPolicy>;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const NewCall = require('../index').default as React.ComponentType;

const withPolicy = (rules: NewCallFieldRuleData[]) => mockedGetPolicy.mockResolvedValue({ Rules: rules });

const FIELD_TEST_IDS = [
  'note-field',
  'destination-field',
  'address-field',
  'coordinates-field',
  'what3words-field',
  'plus-code-field',
  'open-location-picker-button',
  'contact-name-field',
  'contact-info-field',
  'external-id-field',
  'incident-id-field',
  'reference-id-field',
  'dispatch-on-field',
  'open-dispatch-modal-button',
];

// The Create button stays disabled until the policy has loaded, so wait for that before pressing it.
const renderLoaded = async () => {
  render(<NewCall />);
  const createButton = await screen.findByTestId('create-call-button');
  await waitFor(() => expect(mockedGetPolicy).toHaveBeenCalled());
  await waitFor(() => expect(createButton.props.accessibilityState?.disabled).toBeFalsy());
  return createButton;
};

describe('New call field policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormValues = { ...baseFormValues };
    mockedCreateCall.mockResolvedValue({ Id: 'call-1' } as Awaited<ReturnType<typeof createCall>>);
  });

  it('shows every built-in field when the department has no policy', async () => {
    withPolicy([]);

    await renderLoaded();

    for (const testID of FIELD_TEST_IDS) {
      expect(screen.getByTestId(testID)).toBeTruthy();
    }
  });

  it('hides every field the policy hides', async () => {
    withPolicy(
      ['note', 'destinationPoi', 'address', 'geolocation', 'what3words', 'pluscode', 'contactName', 'contactInfo', 'externalId', 'incidentId', 'referenceId', 'dispatchOn', 'dispatchList'].map((key) => ({
        Key: key,
        Visible: false,
        Required: false,
      }))
    );

    await renderLoaded();

    for (const testID of FIELD_TEST_IDS) {
      expect(screen.queryByTestId(testID)).toBeNull();
    }
    expect(screen.queryByText('calls.call_location')).toBeNull();
    expect(screen.queryByTestId('call-identifiers-card')).toBeNull();
  });

  it('keeps the location card while any of its fields is visible, hiding the map with the geolocation', async () => {
    withPolicy([
      { Key: 'address', Visible: false, Required: false },
      { Key: 'geolocation', Visible: false, Required: false },
      { Key: 'pluscode', Visible: false, Required: false },
    ]);

    await renderLoaded();

    expect(screen.getByText('calls.call_location')).toBeTruthy();
    expect(screen.getByTestId('what3words-field')).toBeTruthy();
    expect(screen.queryByTestId('address-field')).toBeNull();
    expect(screen.queryByTestId('open-location-picker-button')).toBeNull();
  });

  it('marks required fields', async () => {
    withPolicy([
      { Key: 'contactName', Visible: true, Required: true },
      { Key: 'destinationPoi', Visible: true, Required: true },
      { Key: 'dispatchList', Visible: true, Required: true },
    ]);

    await renderLoaded();

    expect(within(screen.getByTestId('contact-name-field')).getByText('*')).toBeTruthy();
    expect(within(screen.getByTestId('destination-field')).getByText('*')).toBeTruthy();
    expect(within(screen.getByTestId('contact-info-field')).queryByText('*')).toBeNull();
    expect(screen.getByText('calls.dispatch_to *')).toBeTruthy();
  });

  it('keeps the identifiers card while any of its fields is visible, marking the required ones', async () => {
    withPolicy([
      { Key: 'externalId', Visible: false, Required: false },
      { Key: 'incidentId', Visible: true, Required: true },
    ]);

    await renderLoaded();

    expect(screen.getByTestId('call-identifiers-card')).toBeTruthy();
    expect(screen.queryByTestId('external-id-field')).toBeNull();
    expect(within(screen.getByTestId('incident-id-field')).getByText('*')).toBeTruthy();
    expect(within(screen.getByTestId('reference-id-field')).queryByText('*')).toBeNull();
  });

  it('refuses to create the call while a required field is blank, naming it by its label', async () => {
    withPolicy([
      { Key: 'contactName', Visible: true, Required: true },
      { Key: 'geolocation', Visible: true, Required: true },
      { Key: 'note', Visible: true, Required: false },
    ]);
    mockFormValues = { ...baseFormValues, latitude: 0, longitude: 0 };

    const createButton = await renderLoaded();
    fireEvent.press(createButton);

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('calls.required_fields_missing|calls.contact_name, calls.coordinates'));
    expect(mockedCreateCall).not.toHaveBeenCalled();
  });

  it('refuses to create the call while a required identifier is blank', async () => {
    withPolicy([
      { Key: 'externalId', Visible: true, Required: true },
      { Key: 'incidentId', Visible: true, Required: true },
      { Key: 'referenceId', Visible: true, Required: true },
    ]);
    mockFormValues = { ...baseFormValues, incidentId: 'INC-1' };

    const createButton = await renderLoaded();
    fireEvent.press(createButton);

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('calls.required_fields_missing|calls.external_id, calls.reference_id'));
    expect(mockedCreateCall).not.toHaveBeenCalled();
  });

  it('sends the contact fields and identifiers it checked', async () => {
    withPolicy([
      { Key: 'contactName', Visible: true, Required: true },
      { Key: 'contactInfo', Visible: true, Required: true },
      { Key: 'externalId', Visible: true, Required: true },
      { Key: 'incidentId', Visible: true, Required: true },
      { Key: 'referenceId', Visible: true, Required: true },
    ]);
    mockFormValues = { ...baseFormValues, contactName: 'Jane Caller', contactInfo: '555-0100', externalId: 'CAD-9', incidentId: 'INC-1', referenceId: 'REF-2' };

    const createButton = await renderLoaded();
    fireEvent.press(createButton);

    await waitFor(() => expect(mockedCreateCall).toHaveBeenCalledTimes(1));
    expect(mockedCreateCall.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ contactName: 'Jane Caller', contactInfo: '555-0100', externalId: 'CAD-9', incidentId: 'INC-1', referenceId: 'REF-2' }));
  });

  it('leaves fields this screen has no input for to the server, and names them when it refuses', async () => {
    withPolicy([
      { Key: 'protocols', Visible: true, Required: true },
      { Key: 'linkedCall', Visible: true, Required: true },
      { Key: 'indoorLocation', Visible: true, Required: true },
    ]);
    mockedCreateCall.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: 'Required call fields are missing: indoorLocation' } });

    const createButton = await renderLoaded();
    fireEvent.press(createButton);

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('calls.required_fields_missing|calls.indoor_location'));
    expect(mockedCreateCall).toHaveBeenCalledTimes(1);
    for (const property of ['protocolIds', 'linkedCallId', 'indoorMapZoneId']) {
      expect(mockedCreateCall.mock.calls[0]?.[0]).not.toHaveProperty(property);
    }
  });

  describe('scheduled dispatch', () => {
    it('marks a required dispatch time and refuses to create the call without one', async () => {
      withPolicy([{ Key: 'dispatchOn', Visible: true, Required: true }]);

      const createButton = await renderLoaded();

      expect(within(screen.getByTestId('dispatch-on-field')).getByText('*')).toBeTruthy();
      expect(screen.getByTestId('dispatch-on-input')).toBeTruthy();

      fireEvent.press(createButton);

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('calls.required_fields_missing|calls.dispatch_on'));
      expect(mockedCreateCall).not.toHaveBeenCalled();
    });

    it('refuses a dispatch time less than 15 minutes ahead', async () => {
      withPolicy([]);
      mockFormValues = { ...baseFormValues, dispatchOn: minutesFromNow(10) };

      const createButton = await renderLoaded();
      fireEvent.press(createButton);

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('calls.dispatch_on_too_soon|15'));
      expect(mockedCreateCall).not.toHaveBeenCalled();
    });

    it('sends a valid dispatch time as DispatchOnUtc', async () => {
      withPolicy([{ Key: 'dispatchOn', Visible: true, Required: true }]);
      const dispatchOn = minutesFromNow(90);
      mockFormValues = { ...baseFormValues, dispatchOn };

      const createButton = await renderLoaded();
      fireEvent.press(createButton);

      await waitFor(() => expect(mockedCreateCall).toHaveBeenCalledTimes(1));
      expect(mockedCreateCall.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ dispatchOnUtc: dispatchOn }));
    });

    it('leaves DispatchOnUtc out when no time is set', async () => {
      withPolicy([]);

      const createButton = await renderLoaded();
      fireEvent.press(createButton);

      await waitFor(() => expect(mockedCreateCall).toHaveBeenCalledTimes(1));
      expect(mockedCreateCall.mock.calls[0]?.[0]).not.toHaveProperty('dispatchOnUtc');
    });

    it('sends nothing for a hidden dispatch time', async () => {
      withPolicy([{ Key: 'dispatchOn', Visible: false, Required: true }]);
      mockFormValues = { ...baseFormValues, dispatchOn: minutesFromNow(5) };

      const createButton = await renderLoaded();

      expect(screen.queryByTestId('dispatch-on-field')).toBeNull();

      fireEvent.press(createButton);

      await waitFor(() => expect(mockedCreateCall).toHaveBeenCalledTimes(1));
      expect(mockedCreateCall.mock.calls[0]?.[0]).not.toHaveProperty('dispatchOnUtc');
    });
  });

  it('shows the generic error for any other failure', async () => {
    withPolicy([]);
    mockedCreateCall.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: 'Bad destination' } });

    const createButton = await renderLoaded();
    fireEvent.press(createButton);

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('calls.create_error'));
  });
});
