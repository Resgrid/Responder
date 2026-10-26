import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';

import { getMapIconLegend } from '@/api/mapping/mapping';
import { MAP_ICONS } from '@/constants/map-icons';

import { MapLegendSheet } from '../map-legend-sheet';

jest.mock('@/api/mapping/mapping', () => ({
  getMapIconLegend: jest.fn(),
}));

// Real English strings, so the test reads what a user reads (and fails on a missing key).
jest.mock('react-i18next', () => {
  const en = jest.requireActual('../../../translations/en.json');
  const t = (key: string, options?: Record<string, unknown>) => {
    const value = key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), en);
    if (typeof value !== 'string') return key;
    return value.replace(/{{\s*(\w+)\s*}}/g, (_match: string, name: string) => String(options?.[name] ?? ''));
  };
  return { useTranslation: () => ({ t }) };
});

const mockActionsheetProps: Record<string, unknown>[] = [];

jest.mock('@/components/ui/actionsheet', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  const passthrough =
    (testID: string) =>
    ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID }, children);

  return {
    Actionsheet: (props: { isOpen: boolean; onClose: () => void; children?: React.ReactNode; testID?: string }) => {
      mockActionsheetProps.push(props);
      return props.isOpen ? React.createElement(View, { testID: props.testID }, props.children) : null;
    },
    ActionsheetBackdrop: () => React.createElement(Pressable, { testID: 'actionsheet-backdrop' }),
    ActionsheetContent: passthrough('actionsheet-content'),
    ActionsheetDragIndicator: () => React.createElement(View, { testID: 'actionsheet-drag-indicator' }),
    ActionsheetDragIndicatorWrapper: passthrough('actionsheet-drag-wrapper'),
  };
});

jest.mock('lucide-react-native', () => {
  const MockIcon = () => null;
  return { MapPin: MockIcon, XIcon: MockIcon };
});

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

jest.mock('@/lib/logging', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockSecurityState = { rights: { CanViewPII: true } as { CanViewPII: boolean } | null };

jest.mock('@/stores/security/store', () => ({
  securityStore: (selector: (state: typeof mockSecurityState) => unknown) => selector(mockSecurityState),
}));

const mockTerms: Record<string, string> = {};

jest.mock('@/stores/terminology/store', () => ({
  TermKeys: { Calls: 'module.calls', Units: 'module.units', Personnel: 'module.personnel' },
  useTerm: (key: string, fallback: string) => mockTerms[key] ?? fallback,
}));

const mockGetMapIconLegend = getMapIconLegend as jest.MockedFunction<typeof getMapIconLegend>;

// Icons are decorative inside an accessible, labelled box, so queries for the images must opt in to hidden elements.
const HIDDEN = { includeHiddenElements: true };

const pin = (name: string) => `https://api.resgrid.dev/api/v4/TypeIcons/Pins/${name}?v=1`;
const FIRE_HIGH_UPLOAD = 'https://api.resgrid.dev/api/v4/TypeIcons/call-type-7-high?v=2';
const BRUSH_UPLOAD = 'https://api.resgrid.dev/api/v4/TypeIcons/unit-type-12?v=3';
const MEDIC_UPLOAD = 'https://api.resgrid.dev/api/v4/TypeIcons/role-40?v=4';

const state = (overrides: Record<string, unknown>) => ({ Id: 0, Name: '', Color: null, IconStyle: 'unknown', IconUrl: null, PinIconUrl: null, ImagePath: '', IsVariant: false, ...overrides });
const style = (overrides: Record<string, unknown>) => ({
  Key: 'unknown',
  Color: '#9CA3AF',
  Meanings: [],
  UnitStatuses: [],
  PersonnelStatuses: [],
  Priorities: [],
  UnitPinIconUrl: null,
  PersonPinIconUrl: null,
  CallPinIconUrl: null,
  ...overrides,
});

const buildLegend = (callTypeName = 'Structure Fire') => ({
  PageSize: 6,
  Status: 'success',
  Environment: 'Dev',
  RequestId: 'r1',
  Version: 'v4',
  Timestamp: '2026-10-25T00:00:00Z',
  Node: 'api-1',
  Data: {
    StatusStyles: [
      style({
        Key: 'available',
        Color: '#22C55E',
        Meanings: [0],
        UnitStatuses: ['In Quarters', 'Ready'],
        PersonnelStatuses: ['Standing By'],
        UnitPinIconUrl: pin('engine-available'),
        PersonPinIconUrl: pin('person-available'),
      }),
      style({ Key: 'responding', Color: '#F59E0B', Meanings: [1], UnitStatuses: ['En Route'], PersonnelStatuses: [], UnitPinIconUrl: pin('engine-responding'), PersonPinIconUrl: pin('person-responding') }),
      style({ Key: 'unknown', UnitStatuses: ['Fueling'], PersonnelStatuses: ['Chilling'], UnitPinIconUrl: pin('engine-unknown'), PersonPinIconUrl: pin('person-unknown') }),
    ],
    PriorityStyles: [style({ Key: 'high', Color: '#EF4444', Priorities: ['Code 3'], CallPinIconUrl: pin('call-high') }), style({ Key: 'unknown', Priorities: ['Whenever'], CallPinIconUrl: pin('call-unknown') })],
    Calls: [
      {
        Id: null,
        Name: 'Server label for no type',
        StatusSetName: null,
        IconUrl: null,
        PinIconUrl: null,
        ImagePath: 'Call',
        States: [state({ Id: 1, Name: 'Code 3', Color: '#EF4444', IconStyle: 'high', PinIconUrl: pin('call-high'), ImagePath: 'Call' })],
      },
      {
        Id: 7,
        Name: callTypeName,
        StatusSetName: null,
        IconUrl: null,
        PinIconUrl: null,
        ImagePath: 'fire',
        States: [
          state({ Id: 1, Name: 'Code 3', Color: '#EF4444', IconStyle: 'high', IconUrl: FIRE_HIGH_UPLOAD, PinIconUrl: pin('fire-high'), ImagePath: 'fire', IsVariant: true }),
          state({ Id: 2, Name: 'Whenever', IconStyle: 'unknown', PinIconUrl: pin('fire-unknown'), ImagePath: 'fire' }),
          state({ Id: 3, Name: 'Legacy', IconStyle: 'unknown', ImagePath: 'fire' }),
        ],
      },
    ],
    Units: [
      {
        Id: null,
        Name: 'Server label for no unit type',
        StatusSetName: null,
        IconUrl: null,
        PinIconUrl: null,
        ImagePath: 'Engine_Responding',
        States: [state({ Id: 0, Name: 'Available', IconStyle: 'available', PinIconUrl: pin('engine-available'), ImagePath: 'Engine_Responding' })],
      },
      {
        Id: 12,
        Name: 'Brush Truck',
        StatusSetName: 'Wildland Statuses',
        IconUrl: BRUSH_UPLOAD,
        PinIconUrl: null,
        ImagePath: 'truck',
        States: [state({ Id: 501, Name: 'Patrolling', Color: '#00AAFF', IconStyle: 'responding', PinIconUrl: pin('truck-responding'), ImagePath: 'truck' })],
      },
    ],
    Personnel: [
      {
        Id: null,
        Name: 'Server label for no role',
        StatusSetName: null,
        IconUrl: null,
        PinIconUrl: null,
        ImagePath: 'Person_RespondingCall',
        States: [state({ Id: 0, Name: 'Standing By', IconStyle: 'available', PinIconUrl: pin('person-available'), ImagePath: 'Person_RespondingCall' })],
      },
      {
        Id: 40,
        Name: 'Paramedic',
        StatusSetName: null,
        IconUrl: MEDIC_UPLOAD,
        PinIconUrl: null,
        ImagePath: 'Person_RespondingCall',
        States: [state({ Id: 0, Name: 'Standing By', IconStyle: 'available', IconUrl: MEDIC_UPLOAD, PinIconUrl: pin('person-available') })],
      },
    ],
    PoiTypes: [{ PoiTypeId: 3, Name: 'Hospitals', Color: '#2563EB', PoiImage: 'map-icon-hospital', ImagePath: 'hospital', Marker: 'MAP_PIN', IconUrl: null }],
  },
});

const remoteImage = (testID: string) => within(screen.getByTestId(testID)).getByTestId('expo-image', HIDDEN);
const bundledImages = (testID: string, uri: unknown) => screen.getByTestId(testID).findAll((node) => node.props.source === uri && node.props.testID !== 'expo-image');

const renderOpen = async (props: Partial<React.ComponentProps<typeof MapLegendSheet>> = {}) => {
  const onClose = jest.fn();
  const utils = render(<MapLegendSheet isOpen={true} onClose={onClose} {...props} />);
  await screen.findByTestId('map-legend-other');
  return { ...utils, onClose };
};

describe('MapLegendSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActionsheetProps.length = 0;
    mockSecurityState.rights = { CanViewPII: true };
    Object.keys(mockTerms).forEach((key) => delete mockTerms[key]);
    mockGetMapIconLegend.mockResolvedValue(buildLegend() as never);
  });

  it('opens as a tall bottom sheet with a drag indicator and fetches the legend', async () => {
    await renderOpen();

    expect(mockGetMapIconLegend).toHaveBeenCalledTimes(1);
    expect(mockActionsheetProps.at(-1)?.snapPoints).toEqual([88]);
    expect(screen.getByTestId('actionsheet-drag-indicator')).toBeTruthy();
    expect(screen.getByText('Map legend')).toBeTruthy();
  });

  it('does not fetch while closed', () => {
    render(<MapLegendSheet isOpen={false} onClose={jest.fn()} />);

    expect(mockGetMapIconLegend).not.toHaveBeenCalled();
  });

  it("shows the department's own type, status, priority, role and POI type names", async () => {
    await renderOpen();

    expect(screen.getByText('Status colors')).toBeTruthy();
    expect(screen.getByText('Units: In Quarters, Ready')).toBeTruthy();
    expect(screen.getByText('Personnel: Standing By')).toBeTruthy();
    expect(screen.getByText('Units: En Route')).toBeTruthy();
    expect(screen.getByText('Priority colors')).toBeTruthy();
    expect(screen.getByText('Priorities: Code 3')).toBeTruthy();
    expect(screen.getByText('Priorities: Whenever')).toBeTruthy();

    expect(screen.getByText('Structure Fire')).toBeTruthy();
    expect(within(screen.getByTestId('map-legend-call-7')).getByText('Whenever', HIDDEN)).toBeTruthy();
    expect(screen.getByText('Brush Truck')).toBeTruthy();
    expect(within(screen.getByTestId('map-legend-unit-12')).getByText('Patrolling', HIDDEN)).toBeTruthy();
    expect(screen.getByText('Paramedic')).toBeTruthy();
    expect(screen.getByText('Hospitals')).toBeTruthy();
    expect(screen.getByText('Station')).toBeTruthy();
    expect(screen.getByText("A member shows the icon of the first role they hold that has one. A member On Unit takes the color of their unit's status.")).toBeTruthy();
  });

  it('labels the "none" rows itself and ignores the server name for them', async () => {
    await renderOpen();

    expect(within(screen.getByTestId('map-legend-call-none')).getByText('Calls with no type')).toBeTruthy();
    expect(within(screen.getByTestId('map-legend-unit-none')).getByText('Units with no type')).toBeTruthy();
    expect(within(screen.getByTestId('map-legend-role-none')).getByText('Members with no role icon')).toBeTruthy();
    expect(screen.queryByText('Server label for no type')).toBeNull();
    expect(screen.queryByText('Server label for no unit type')).toBeNull();
    expect(screen.queryByText('Server label for no role')).toBeNull();
  });

  it('subtitles a unit type with its status set, or the built-in statuses when it has none', async () => {
    await renderOpen();

    expect(within(screen.getByTestId('map-legend-unit-12')).getByText('Statuses: Wildland Statuses')).toBeTruthy();
    expect(within(screen.getByTestId('map-legend-unit-none')).getByText('Built-in unit statuses')).toBeTruthy();
  });

  it('labels each style by its key, and the unknown styles as no meaning', async () => {
    await renderOpen();

    expect(within(screen.getByTestId('map-legend-status-available')).getByText('Available')).toBeTruthy();
    expect(within(screen.getByTestId('map-legend-status-responding')).getByText('Responding')).toBeTruthy();
    expect(within(screen.getByTestId('map-legend-status-unknown')).getByText('No meaning or no status')).toBeTruthy();
    expect(within(screen.getByTestId('map-legend-priority-high')).getByText('High')).toBeTruthy();
    expect(within(screen.getByTestId('map-legend-priority-unknown')).getByText('No meaning')).toBeTruthy();
    // Unknown styles come last, as the server orders them.
    const statusRows = within(screen.getByTestId('map-legend-status-colors')).getAllByTestId(/^map-legend-status-(?!colors$)[a-z]+$/);
    expect(statusRows.map((row) => row.props.testID)).toEqual(['map-legend-status-available', 'map-legend-status-responding', 'map-legend-status-unknown']);
  });

  it('draws the style pins and swatches from the server', async () => {
    await renderOpen();

    const unitPin = remoteImage('map-legend-status-available-unit-pin');
    expect(unitPin.props.source).toEqual({ uri: pin('engine-available') });
    expect(unitPin.props.contentFit).toBe('cover');
    expect(remoteImage('map-legend-status-available-person-pin').props.source).toEqual({ uri: pin('person-available') });
    expect(remoteImage('map-legend-priority-high-call-pin').props.source).toEqual({ uri: pin('call-high') });
    expect(screen.getByTestId('map-legend-status-available-swatch', HIDDEN).props.style).toEqual(expect.arrayContaining([{ backgroundColor: '#22C55E' }]));
  });

  it('draws each state icon with the map precedence: uploaded icon, then styled pin, then bundled pin', async () => {
    await renderOpen();

    // Uploaded for this exact priority: drawn square and contained, as the map draws uploads.
    const upload = remoteImage('map-legend-call-7-state-1-icon');
    expect(upload.props.source).toEqual({ uri: FIRE_HIGH_UPLOAD });
    expect(upload.props.contentFit).toBe('contain');
    expect(within(screen.getByTestId('map-legend-call-7-state-1-icon')).queryByTestId('pin-marker-status-pin', HIDDEN)).toBeNull();

    // No upload: the styled pin, drawn like the map's status pin.
    const styledPin = remoteImage('map-legend-call-7-state-2-icon');
    expect(styledPin.props.source).toEqual({ uri: pin('fire-unknown') });
    expect(styledPin.props.contentFit).toBe('cover');
    expect(within(screen.getByTestId('map-legend-call-7-state-2-icon')).getByTestId('pin-marker-status-pin', HIDDEN)).toBeTruthy();

    // Neither: the bundled pin the type picked.
    expect(within(screen.getByTestId('map-legend-call-7-state-3-icon')).queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(bundledImages('map-legend-call-7-state-3-icon', MAP_ICONS.fire.uri).length).toBeGreaterThan(0);

    // A row's own icon: its upload when it has one, else its bundled icon.
    expect(remoteImage('map-legend-unit-12-icon').props.source).toEqual({ uri: BRUSH_UPLOAD });
    expect(bundledImages('map-legend-call-7-icon', MAP_ICONS.fire.uri).length).toBeGreaterThan(0);
  });

  it('falls back down the chain when a remote icon fails to load', async () => {
    await renderOpen();

    act(() => {
      remoteImage('map-legend-call-7-state-1-icon').props.onError({ error: 'boom' });
    });
    expect(remoteImage('map-legend-call-7-state-1-icon').props.source).toEqual({ uri: pin('fire-high') });

    act(() => {
      remoteImage('map-legend-call-7-state-1-icon').props.onError({ error: 'boom' });
    });
    expect(within(screen.getByTestId('map-legend-call-7-state-1-icon')).queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(bundledImages('map-legend-call-7-state-1-icon', MAP_ICONS.fire.uri).length).toBeGreaterThan(0);
  });

  it('gives every icon an accessible "row · state" label and dots states that have a colour', async () => {
    await renderOpen();

    expect(screen.getByLabelText('Structure Fire · Code 3')).toBeTruthy();
    expect(screen.getByLabelText('Calls with no type · Code 3')).toBeTruthy();
    expect(screen.getByLabelText('Brush Truck · Patrolling')).toBeTruthy();
    expect(screen.getByLabelText('Members with no role icon · Standing By')).toBeTruthy();
    expect(screen.getByLabelText('Units · Available')).toBeTruthy();
    expect(screen.getByLabelText('Calls · No meaning')).toBeTruthy();
    expect(screen.getByLabelText('Station')).toBeTruthy();
    expect(screen.getByLabelText('Hospitals')).toBeTruthy();

    expect(screen.getByTestId('map-legend-unit-12-state-501-dot').props.style).toEqual(expect.arrayContaining([{ backgroundColor: '#00AAFF' }]));
    expect(screen.queryByTestId('map-legend-call-7-state-2-dot')).toBeNull();
  });

  it('draws POI types with the map POI marker and the station with the station pin', async () => {
    await renderOpen();

    expect(within(screen.getByTestId('map-legend-poi-type-3-icon')).getByTestId('poi-marker-Hospitals', HIDDEN)).toBeTruthy();
    expect(bundledImages('map-legend-station-icon', MAP_ICONS.station.uri).length).toBeGreaterThan(0);
  });

  it('uses the department terminology for the section headings and status lines', async () => {
    mockTerms['module.calls'] = 'Incidents';
    mockTerms['module.units'] = 'Apparatus';
    mockTerms['module.personnel'] = 'Crew';

    await renderOpen();

    expect(within(screen.getByTestId('map-legend-heading-calls')).getByText('Incidents')).toBeTruthy();
    expect(within(screen.getByTestId('map-legend-heading-units')).getByText('Apparatus')).toBeTruthy();
    expect(within(screen.getByTestId('map-legend-heading-personnel')).getByText('Crew')).toBeTruthy();
    expect(screen.getByText('Apparatus: In Quarters, Ready')).toBeTruthy();
    expect(screen.getByText('Crew: Standing By')).toBeTruthy();
  });

  it('leaves personnel out when the user may not see personnel on the map', async () => {
    mockSecurityState.rights = { CanViewPII: false };

    await renderOpen();

    expect(screen.queryByTestId('map-legend-personnel')).toBeNull();
    expect(screen.queryByTestId('map-legend-status-available-person-pin')).toBeNull();
    expect(screen.queryByText('Personnel: Standing By')).toBeNull();
    expect(screen.getByText('Units: In Quarters, Ready')).toBeTruthy();
  });

  it('shows a hydrant row only while the map draws hydrants', async () => {
    const { rerender, onClose } = await renderOpen();
    expect(screen.queryByTestId('map-legend-hydrant')).toBeNull();

    rerender(
      <MapLegendSheet isOpen={true} onClose={onClose} hydrantPin={{ Id: 'hydrant-9', Type: 5, ImagePath: 'hydrant', Title: 'Hydrant 9', Latitude: 0, Longitude: 0, zIndex: 5, InfoWindowContent: '', Color: '#FF0000' }} />
    );

    expect(within(screen.getByTestId('map-legend-hydrant')).getByText('Hydrant')).toBeTruthy();
    expect(screen.getByLabelText('Hydrant')).toBeTruthy();
  });

  it('shows a spinner while loading', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mockGetMapIconLegend.mockReturnValueOnce(new Promise((r) => (resolve = r)) as never);

    render(<MapLegendSheet isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByTestId('map-legend-loading')).toBeTruthy();
    expect(screen.getByText('Loading map legend...')).toBeTruthy();

    await act(async () => {
      resolve(buildLegend());
    });

    expect(screen.queryByTestId('map-legend-loading')).toBeNull();
    expect(screen.getByText('Structure Fire')).toBeTruthy();
  });

  it('shows an error with a retry that asks again', async () => {
    mockGetMapIconLegend.mockRejectedValueOnce(new Error('Request failed with status code 500'));

    render(<MapLegendSheet isOpen={true} onClose={jest.fn()} />);

    expect(await screen.findByText('The map legend could not be loaded.')).toBeTruthy();
    expect(screen.queryByText('Structure Fire')).toBeNull();

    fireEvent.press(screen.getByTestId('map-legend-retry'));

    expect(await screen.findByText('Structure Fire')).toBeTruthy();
    expect(mockGetMapIconLegend).toHaveBeenCalledTimes(2);
  });

  it('asks again every time it opens, so department changes show on the next open', async () => {
    const { rerender, onClose } = await renderOpen();
    expect(screen.getByText('Structure Fire')).toBeTruthy();

    rerender(<MapLegendSheet isOpen={false} onClose={onClose} />);
    mockGetMapIconLegend.mockResolvedValueOnce(buildLegend('Working Fire') as never);
    rerender(<MapLegendSheet isOpen={true} onClose={onClose} />);

    expect(await screen.findByText('Working Fire')).toBeTruthy();
    expect(screen.queryByText('Structure Fire')).toBeNull();
    expect(mockGetMapIconLegend).toHaveBeenCalledTimes(2);
  });

  it('treats missing lists as empty and skips empty sections', async () => {
    mockGetMapIconLegend.mockResolvedValueOnce({ Data: { StatusStyles: null, Calls: undefined, Units: [{ Id: 5, Name: 'Engine', ImagePath: 'Engine_Responding' }], PoiTypes: null } } as never);

    await renderOpen();

    expect(screen.queryByTestId('map-legend-status-colors')).toBeNull();
    expect(screen.queryByTestId('map-legend-priority-colors')).toBeNull();
    expect(screen.queryByTestId('map-legend-calls')).toBeNull();
    expect(screen.queryByTestId('map-legend-personnel')).toBeNull();
    expect(screen.getByText('Engine')).toBeTruthy();
    expect(screen.getByText('Station')).toBeTruthy();
  });

  it('survives a response with no data at all', async () => {
    mockGetMapIconLegend.mockResolvedValueOnce({ Data: null } as never);

    await renderOpen();

    expect(screen.getByText('Station')).toBeTruthy();
    expect(screen.queryByTestId('map-legend-error')).toBeNull();
  });

  it('closes from the close button', async () => {
    const { onClose } = await renderOpen();

    fireEvent.press(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockActionsheetProps.at(-1)?.onClose).toBe(onClose);
  });
});
