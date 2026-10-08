import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import React from 'react';

import { getNewCallFieldPolicy } from '@/api/calls/newCallFieldPolicy';
import { type NewCallFieldRuleData } from '@/models/v4/calls/newCallFieldPolicyResultData';

// The department's call field policy applies to edits too: the edit screen offers the same fields as the
// new-call screen, hides the ones the policy hides, marks and checks the required ones against what the
// save will send, and never clears a hidden field. Runs the real policy hook against a mocked endpoint.

const baseFormValues = {
  name: 'Structure Fire',
  nature: 'Smoke showing',
  note: 'Stored note',
  address: '123 Main St',
  coordinates: '39.7392, -104.9903',
  what3words: 'filled.count.soap',
  plusCode: '',
  latitude: 39.7392 as number | undefined,
  longitude: -104.9903 as number | undefined,
  priority: 'High',
  type: 'Fire',
  destinationPoiId: '7',
  contactName: 'Jane Caller',
  contactInfo: '555-0100',
  externalId: 'CAD-9',
  incidentId: 'INC-1',
  referenceId: 'REF-2',
  dispatchOn: '',
  dispatchSelection: { everyone: false, users: ['user-1'], groups: [] as string[], roles: [] as string[], units: [] as string[] },
};

// A whole-second instant some minutes away, as an ISO string ('Z'), and as the zone-less form older
// servers send for a stored dispatch time.
const minutesFromNow = (minutes: number) => {
  const date = new Date(Date.now() + minutes * 60 * 1000);
  date.setMilliseconds(0);
  return { iso: date.toISOString(), zoneless: date.toISOString().replace('.000Z', '') };
};

let mockFormValues = { ...baseFormValues };
// Receives the values the screen pre-fills the form with from the stored call.
const mockReset = jest.fn();

// Bypass validation: this suite is about the field policy, not the zod schema. The values stand in for
// the form as the user leaves it (it starts out holding the stored call).
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (onValid: (values: unknown) => unknown) => () => onValid({ ...mockFormValues }),
    formState: { errors: {} },
    setValue: jest.fn(),
    reset: mockReset,
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
  useLocalSearchParams: () => ({ id: 'call-1' }),
}));

jest.mock('@/api/calls/newCallFieldPolicy', () => ({ getNewCallFieldPolicy: jest.fn() }));
jest.mock('@/api/dispatch', () => ({ getNewCallData: jest.fn().mockResolvedValue({ Data: { DestinationPois: [], PoiTypes: [] } }) }));

jest.mock('@/lib/logging', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));

const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackEvent: mockTrackEvent }) }));

const mockToastShow = jest.fn();
jest.mock('@/components/ui/toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

// The stored call has a location, so the map preview renders instead of the "select location" button.
jest.mock('@/components/maps/location-picker', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return () => ReactModule.createElement(View, { testID: 'location-picker' });
});
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

const baseCall = {
  CallId: 'call-1',
  Name: 'Structure Fire',
  Nature: 'Smoke showing',
  Note: '<p>Stored note</p>',
  Address: '123 Main St',
  Geolocation: '39.7392,-104.9903',
  Latitude: '39.7392',
  Longitude: '-104.9903',
  Priority: 1,
  Type: 'Fire',
  What3Words: 'filled.count.soap',
  ContactName: 'Jane Caller',
  ContactInfo: '555-0100',
  ExternalId: 'CAD-9',
  IncidentId: 'INC-1',
  ReferenceId: 'REF-2',
  DestinationPoiId: 42 as number | undefined,
  State: 0 as number | string,
  // Sent an hour ago: not a schedule.
  DispatchedOnUtc: minutesFromNow(-60).zoneless,
};

const mockDetailState = {
  call: { ...baseCall },
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

const mockedGetPolicy = getNewCallFieldPolicy as jest.MockedFunction<typeof getNewCallFieldPolicy>;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const EditCall = require('../edit').default as React.ComponentType;

const withPolicy = (rules: NewCallFieldRuleData[]) => mockedGetPolicy.mockResolvedValue({ Rules: rules });

// Every toast on this screen renders a box holding a single line of text; read that text back.
const toastMessages = (): string[] =>
  mockToastShow.mock.calls.map(([options]) => {
    const box = (options as { render: (props: { id: string }) => React.ReactElement }).render({ id: 'toast' }) as React.ReactElement<{ children: React.ReactElement<{ children: string }> }>;
    return box.props.children.props.children;
  });

const FIELD_TEST_IDS = [
  'note-field',
  'destination-field',
  'address-field',
  'coordinates-field',
  'what3words-field',
  'plus-code-field',
  'location-picker',
  'contact-name-field',
  'contact-info-field',
  'external-id-field',
  'incident-id-field',
  'reference-id-field',
  'dispatch-on-field',
  'open-dispatch-modal-button',
];

// The Save button stays disabled until the policy has loaded, so wait for that before pressing it.
const renderLoaded = async () => {
  render(<EditCall />);
  const saveButton = await screen.findByTestId('save-call-button');
  await waitFor(() => expect(mockedGetPolicy).toHaveBeenCalled());
  await waitFor(() => expect(saveButton.props.accessibilityState?.disabled).toBeFalsy());
  return saveButton;
};

describe('Edit call field policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormValues = { ...baseFormValues, dispatchSelection: { ...baseFormValues.dispatchSelection } };
    mockDetailState.call = { ...baseCall };
    mockUpdateCall.mockResolvedValue(undefined);
  });

  it('offers every field the new-call screen offers when the department has no policy', async () => {
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

  it('pre-fills the identifiers from the stored call', async () => {
    withPolicy([]);

    await renderLoaded();

    expect(mockReset).toHaveBeenCalledWith(expect.objectContaining({ externalId: 'CAD-9', incidentId: 'INC-1', referenceId: 'REF-2' }));
  });

  it('marks required fields', async () => {
    withPolicy([
      { Key: 'note', Visible: true, Required: true },
      { Key: 'what3words', Visible: true, Required: true },
      { Key: 'dispatchList', Visible: true, Required: true },
    ]);

    await renderLoaded();

    expect(within(screen.getByTestId('note-field')).getByText('*')).toBeTruthy();
    expect(within(screen.getByTestId('what3words-field')).getByText('*')).toBeTruthy();
    expect(within(screen.getByTestId('address-field')).queryByText('*')).toBeNull();
    expect(screen.getByText('calls.dispatch_to *')).toBeTruthy();
  });

  it('refuses to save while a required identifier is blank', async () => {
    withPolicy([
      { Key: 'externalId', Visible: true, Required: true },
      { Key: 'incidentId', Visible: true, Required: true },
      { Key: 'referenceId', Visible: true, Required: true },
    ]);
    mockFormValues = { ...mockFormValues, externalId: '', referenceId: ' ' };

    const saveButton = await renderLoaded();

    expect(within(screen.getByTestId('incident-id-field')).getByText('*')).toBeTruthy();

    fireEvent.press(saveButton);

    await waitFor(() => expect(toastMessages()).toContain('calls.required_fields_missing|calls.external_id, calls.reference_id'));
    expect(mockUpdateCall).not.toHaveBeenCalled();
  });

  it('refuses to save while a required field is blank, naming it by its label', async () => {
    withPolicy([
      { Key: 'contactInfo', Visible: true, Required: true },
      { Key: 'destinationPoi', Visible: true, Required: true },
      { Key: 'address', Visible: true, Required: true },
    ]);
    mockFormValues = { ...mockFormValues, contactInfo: '  ', destinationPoiId: 'none' };

    const saveButton = await renderLoaded();
    fireEvent.press(saveButton);

    await waitFor(() => expect(toastMessages()).toContain('calls.required_fields_missing|calls.contact_info, calls.destination'));
    expect(mockUpdateCall).not.toHaveBeenCalled();
  });

  it('checks the values the form will send, which start out as the stored call', async () => {
    withPolicy(
      ['note', 'address', 'geolocation', 'what3words', 'contactName', 'contactInfo', 'externalId', 'incidentId', 'referenceId', 'destinationPoi', 'dispatchList'].map((key) => ({
        Key: key,
        Visible: true,
        Required: true,
      }))
    );

    const saveButton = await renderLoaded();
    fireEvent.press(saveButton);

    await waitFor(() => expect(mockUpdateCall).toHaveBeenCalledTimes(1));
  });

  it('does not hold an edit to fields it cannot fill in', async () => {
    // The dispatch time is never required of an edit; the rest have no input on this screen and this app
    // never sends ProtocolIds, LinkedCallId or IndoorMapZoneId, so the server leaves them alone too.
    // A plus code is never stored on a call.
    withPolicy(
      ['dispatchOn', 'protocols', 'linkedCall', 'indoorLocation', 'pluscode'].map((key) => ({
        Key: key,
        Visible: true,
        Required: true,
      }))
    );

    const saveButton = await renderLoaded();
    fireEvent.press(saveButton);

    await waitFor(() => expect(mockUpdateCall).toHaveBeenCalledTimes(1));
    const payload = mockUpdateCall.mock.calls[0]?.[0];
    expect(payload).not.toHaveProperty('protocolIds');
    expect(payload).not.toHaveProperty('linkedCallId');
    expect(payload).not.toHaveProperty('indoorMapZoneId');
  });

  it('requires a dispatch list of an active call but not of a pending one', async () => {
    withPolicy([{ Key: 'dispatchList', Visible: true, Required: true }]);
    mockFormValues = { ...mockFormValues, dispatchSelection: { everyone: false, users: [], groups: [], roles: [], units: [] } };

    const saveButton = await renderLoaded();
    fireEvent.press(saveButton);

    await waitFor(() => expect(toastMessages()).toContain('calls.required_fields_missing|calls.dispatch_to'));
    expect(mockUpdateCall).not.toHaveBeenCalled();

    screen.unmount();
    mockToastShow.mockClear();
    mockDetailState.call = { ...baseCall, State: 8 };

    const pendingSaveButton = await renderLoaded();
    fireEvent.press(pendingSaveButton);

    await waitFor(() => expect(mockUpdateCall).toHaveBeenCalledTimes(1));
  });

  it('sends hidden fields as unchanged instead of clearing them', async () => {
    withPolicy(
      ['note', 'address', 'geolocation', 'what3words', 'contactName', 'contactInfo', 'externalId', 'incidentId', 'referenceId', 'destinationPoi', 'dispatchList'].map((key) => ({
        Key: key,
        Visible: false,
        Required: true,
      }))
    );

    const saveButton = await renderLoaded();
    fireEvent.press(saveButton);

    await waitFor(() => expect(mockUpdateCall).toHaveBeenCalledTimes(1));
    const payload = mockUpdateCall.mock.calls[0]?.[0];

    // Blank text keeps the stored value on EditCall.
    expect(payload).toEqual(expect.objectContaining({ note: '', address: '', what3words: '', contactName: '', contactInfo: '', externalId: '', incidentId: '', referenceId: '' }));
    // No point keeps the stored point.
    expect(payload).not.toHaveProperty('latitude');
    expect(payload).not.toHaveProperty('longitude');
    // The destination is always overwritten, so it goes back as stored rather than as the form holds it.
    expect(payload.destinationPoiId).toBe(42);
    // The recipients go back as loaded: a blank list means "everyone" to older servers.
    expect(payload).toEqual(expect.objectContaining({ dispatchEveryone: false, dispatchUsers: ['user-1'] }));
  });

  it('sends visible fields as the form holds them', async () => {
    withPolicy([]);

    const saveButton = await renderLoaded();
    fireEvent.press(saveButton);

    await waitFor(() => expect(mockUpdateCall).toHaveBeenCalledTimes(1));
    expect(mockUpdateCall.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        note: 'Stored note',
        address: '123 Main St',
        what3words: 'filled.count.soap',
        contactName: 'Jane Caller',
        contactInfo: '555-0100',
        externalId: 'CAD-9',
        incidentId: 'INC-1',
        referenceId: 'REF-2',
        destinationPoiId: 7,
        latitude: 39.7392,
        longitude: -104.9903,
      })
    );
  });

  it('names the fields when the server refuses the save for them', async () => {
    withPolicy([]);
    mockUpdateCall.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: 'Required call fields are missing: incidentId, referenceId' } });

    const saveButton = await renderLoaded();
    fireEvent.press(saveButton);

    await waitFor(() => expect(toastMessages()).toContain('calls.required_fields_missing|calls.incident_id, calls.reference_id'));
  });

  describe('scheduled dispatch', () => {
    it('never requires or marks a dispatch time on an edit', async () => {
      withPolicy([{ Key: 'dispatchOn', Visible: true, Required: true }]);

      const saveButton = await renderLoaded();

      expect(screen.getByTestId('dispatch-on-input')).toBeTruthy();
      expect(within(screen.getByTestId('dispatch-on-field')).queryByText('*')).toBeNull();

      fireEvent.press(saveButton);

      await waitFor(() => expect(mockUpdateCall).toHaveBeenCalledTimes(1));
      expect(mockUpdateCall.mock.calls[0]?.[0]).not.toHaveProperty('dispatchOnUtc');
    });

    it('pre-fills the stored dispatch time, read as UTC, only while the call is still scheduled', async () => {
      withPolicy([]);
      const scheduled = minutesFromNow(45);
      mockDetailState.call = { ...baseCall, DispatchedOnUtc: scheduled.zoneless };

      await renderLoaded();

      expect(mockReset).toHaveBeenCalledWith(expect.objectContaining({ dispatchOn: scheduled.iso }));

      screen.unmount();
      mockReset.mockClear();
      mockDetailState.call = { ...baseCall };

      await renderLoaded();

      expect(mockReset).toHaveBeenCalledWith(expect.objectContaining({ dispatchOn: '' }));
    });

    it('offers clear only when there is no stored schedule, since EditCall cannot remove one', async () => {
      withPolicy([]);

      await renderLoaded();
      fireEvent.press(screen.getByTestId('dispatch-on-input'));
      expect(screen.getByTestId('dispatch-on-input-clear')).toBeTruthy();

      screen.unmount();
      mockDetailState.call = { ...baseCall, DispatchedOnUtc: minutesFromNow(45).zoneless };

      await renderLoaded();
      fireEvent.press(screen.getByTestId('dispatch-on-input'));
      expect(screen.getByTestId('dispatch-on-input-done')).toBeTruthy();
      expect(screen.queryByTestId('dispatch-on-input-clear')).toBeNull();
    });

    it('saves an untouched stored schedule without resending it, even inside the lead time', async () => {
      withPolicy([]);
      const scheduled = minutesFromNow(10);
      mockDetailState.call = { ...baseCall, DispatchedOnUtc: scheduled.zoneless };
      mockFormValues = { ...mockFormValues, dispatchOn: scheduled.iso };

      const saveButton = await renderLoaded();
      fireEvent.press(saveButton);

      await waitFor(() => expect(mockUpdateCall).toHaveBeenCalledTimes(1));
      expect(mockUpdateCall.mock.calls[0]?.[0]).not.toHaveProperty('dispatchOnUtc');
    });

    it('refuses a new dispatch time less than 15 minutes ahead', async () => {
      withPolicy([]);
      mockFormValues = { ...mockFormValues, dispatchOn: minutesFromNow(14).iso };

      const saveButton = await renderLoaded();
      fireEvent.press(saveButton);

      await waitFor(() => expect(toastMessages()).toContain('calls.dispatch_on_too_soon|15'));
      expect(mockUpdateCall).not.toHaveBeenCalled();
    });

    it('sends a new dispatch time as DispatchOnUtc', async () => {
      withPolicy([]);
      const scheduled = minutesFromNow(45);
      const rescheduled = minutesFromNow(120);
      mockDetailState.call = { ...baseCall, DispatchedOnUtc: scheduled.zoneless };
      mockFormValues = { ...mockFormValues, dispatchOn: rescheduled.iso };

      const saveButton = await renderLoaded();
      fireEvent.press(saveButton);

      await waitFor(() => expect(mockUpdateCall).toHaveBeenCalledTimes(1));
      expect(mockUpdateCall.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ dispatchOnUtc: rescheduled.iso }));
    });

    it('sends nothing for a hidden dispatch time', async () => {
      withPolicy([{ Key: 'dispatchOn', Visible: false, Required: false }]);
      mockFormValues = { ...mockFormValues, dispatchOn: minutesFromNow(120).iso };

      const saveButton = await renderLoaded();
      fireEvent.press(saveButton);

      await waitFor(() => expect(mockUpdateCall).toHaveBeenCalledTimes(1));
      expect(mockUpdateCall.mock.calls[0]?.[0]).not.toHaveProperty('dispatchOnUtc');
    });
  });

  it('shows the generic error for any other failure', async () => {
    withPolicy([]);
    mockUpdateCall.mockRejectedValueOnce(new Error('network down'));

    const saveButton = await renderLoaded();
    fireEvent.press(saveButton);

    await waitFor(() => expect(toastMessages()).toContain('call_detail.update_call_error'));
  });

  it('does not save before the policy has loaded', async () => {
    mockedGetPolicy.mockReturnValue(new Promise(() => undefined));

    render(<EditCall />);
    fireEvent.press(await screen.findByTestId('save-call-button'));

    await waitFor(() => expect(mockedGetPolicy).toHaveBeenCalled());
    expect(mockUpdateCall).not.toHaveBeenCalled();
  });
});
