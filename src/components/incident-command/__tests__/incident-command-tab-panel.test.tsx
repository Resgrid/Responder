import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { type ResourceIncidentView } from '@/models/v4/incidentCommand/resourceIncidentView';
import { useIncidentCommandStore } from '@/stores/calls/incident-command-store';

import { IncidentCommandTabPanel } from '../incident-command-tab-panel';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
  cssInterop: jest.fn(),
}));

jest.mock('lucide-react-native', () => ({
  MailIcon: () => 'MailIcon',
  PhoneIcon: () => 'PhoneIcon',
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/stores/calls/incident-command-store');

const mockUseIncidentCommandStore = useIncidentCommandStore as unknown as jest.Mock;

const mockView: ResourceIncidentView = {
  IncidentCommandId: 'ic-1',
  CallId: 123,
  Status: 1,
  EstablishedOn: '2025-01-01T10:00:00Z',
  EstimatedEndOn: '2025-01-01T18:00:00Z',
  ClosedOn: null,
  ImportantInformation: 'Watch for downed power lines',
  IncidentActionPlan: 'Contain and control the fire',
  Commander: {
    UserId: 'user-1',
    Name: 'John Commander',
    Phone: '555-1234',
    Email: 'commander@example.com',
  },
  Objectives: [
    {
      TacticalObjectiveId: 'obj-1',
      IncidentCommandId: 'ic-1',
      DepartmentId: 1,
      CallId: 123,
      Name: 'Primary Search',
      ObjectiveType: 1,
      Status: 2,
      AutoPopulated: false,
      CompletedByUserId: null,
      CompletedOn: null,
      Description: 'Search the first floor',
      ProgressPercent: 50,
      Priority: 1,
      TargetCompleteOn: null,
      SortOrder: 0,
      ModifiedOn: null,
    },
  ],
  Needs: [
    {
      IncidentNeedId: 'need-1',
      IncidentCommandId: 'ic-1',
      DepartmentId: 1,
      CallId: 123,
      Name: 'Water Supply',
      Description: 'Additional tanker needed',
      Category: 1,
      Status: 1,
      QuantityRequested: 2,
      QuantityFulfilled: 1,
      Priority: 1,
      CreatedByUserId: 'user-1',
      CreatedOn: '2025-01-01T10:05:00Z',
      MetByUserId: null,
      MetOn: null,
      SortOrder: 0,
      ModifiedOn: null,
    },
  ],
  Notes: [
    {
      IncidentNoteId: 'note-1',
      IncidentCommandId: 'ic-1',
      DepartmentId: 1,
      CallId: 123,
      NoteType: 0,
      Visibility: 0,
      Title: 'Situation Update',
      Body: 'Fire is 40% contained',
      ContainmentPercent: 40,
      CreatedByUserId: 'user-1',
      CreatedOn: '2025-01-01T11:00:00Z',
      DeletedOn: null,
      ModifiedOn: null,
    },
  ],
  Attachments: [
    {
      IncidentAttachmentId: 'att-1',
      IncidentCommandId: 'ic-1',
      DepartmentId: 1,
      CallId: 123,
      Visibility: 0,
      FileName: 'site-plan.pdf',
      ContentType: 'application/pdf',
      ContentLength: 2048,
      Description: 'Building site plan',
      UploadedByUserId: 'user-1',
      UploadedOn: '2025-01-01T10:30:00Z',
      DeletedOn: null,
      ModifiedOn: null,
    },
  ],
  MyAssignment: {
    ResourceAssignmentId: 'ra-1',
    CommandStructureNodeId: 'node-1',
    LaneName: 'Fire Attack',
    NodeType: 0,
    Color: '#ff0000',
    AssignedOn: '2025-01-01T10:10:00Z',
    PrimaryLead: {
      UserId: 'user-2',
      Name: 'Jane Lead',
      Phone: '555-5678',
      Email: 'lead@example.com',
    },
    SecondaryLead: {
      UserId: 'user-3',
      Name: 'Sam Second',
      Phone: null,
      Email: null,
    },
    PrimaryObjective: {
      TacticalObjectiveId: 'obj-2',
      IncidentCommandId: 'ic-1',
      DepartmentId: 1,
      CallId: 123,
      Name: 'Ventilation',
      ObjectiveType: 0,
      Status: 0,
      AutoPopulated: false,
      CompletedByUserId: null,
      CompletedOn: null,
      Description: null,
      ProgressPercent: 25,
      Priority: 1,
      TargetCompleteOn: null,
      SortOrder: 0,
      ModifiedOn: null,
    },
    SecondaryObjective: null,
    LinkedNeed: {
      IncidentNeedId: 'need-2',
      IncidentCommandId: 'ic-1',
      DepartmentId: 1,
      CallId: 123,
      Name: 'Extra Hose Line',
      Description: null,
      Category: 3,
      Status: 0,
      QuantityRequested: 0,
      QuantityFulfilled: 0,
      Priority: 1,
      CreatedByUserId: 'user-1',
      CreatedOn: '2025-01-01T10:05:00Z',
      MetByUserId: null,
      MetOn: null,
      SortOrder: 0,
      ModifiedOn: null,
    },
  },
};

const createStoreState = (overrides: Partial<{ view: ResourceIncidentView | null; isLoading: boolean; error: string | null }> = {}) => ({
  view: null,
  isLoading: false,
  error: null,
  fetchIncidentView: jest.fn(),
  reset: jest.fn(),
  ...overrides,
});

describe('IncidentCommandTabPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIncidentCommandStore.mockReturnValue(createStoreState());
  });

  it('should fetch the incident view on mount', () => {
    const fetchIncidentView = jest.fn();
    mockUseIncidentCommandStore.mockReturnValue({ ...createStoreState(), fetchIncidentView });

    const { unmount } = render(<IncidentCommandTabPanel callId={123} />);

    expect(fetchIncidentView).toHaveBeenCalledWith(123);
    unmount();
  });

  it('should render the loading state', () => {
    mockUseIncidentCommandStore.mockReturnValue(createStoreState({ isLoading: true }));

    const { getByTestId, unmount } = render(<IncidentCommandTabPanel callId={123} />);

    expect(getByTestId('incident-command-loading')).toBeTruthy();
    unmount();
  });

  it('should render the error state', () => {
    mockUseIncidentCommandStore.mockReturnValue(createStoreState({ error: 'Network error' }));

    const { getByTestId, getByText, unmount } = render(<IncidentCommandTabPanel callId={123} />);

    expect(getByTestId('incident-command-error')).toBeTruthy();
    expect(getByText('incident_command.error_loading')).toBeTruthy();
    expect(getByText('Network error')).toBeTruthy();
    unmount();
  });

  it('should render the empty state when there is no incident command', () => {
    mockUseIncidentCommandStore.mockReturnValue(createStoreState({ view: null }));

    const { getByTestId, getByText, unmount } = render(<IncidentCommandTabPanel callId={123} />);

    expect(getByTestId('incident-command-empty')).toBeTruthy();
    expect(getByText('incident_command.empty_state')).toBeTruthy();
    unmount();
  });

  it('should render the my assignment card', () => {
    mockUseIncidentCommandStore.mockReturnValue(createStoreState({ view: mockView }));

    const { getByTestId, getByText, unmount } = render(<IncidentCommandTabPanel callId={123} />);

    expect(getByTestId('incident-command-my-assignment')).toBeTruthy();
    expect(getByText('Fire Attack')).toBeTruthy();
    expect(getByTestId('incident-command-lane-color')).toBeTruthy();
    // Leads
    expect(getByText('Jane Lead')).toBeTruthy();
    expect(getByText('555-5678')).toBeTruthy();
    expect(getByText('lead@example.com')).toBeTruthy();
    expect(getByText('Sam Second')).toBeTruthy();
    expect(getByTestId('incident-command-primary-lead-phone')).toBeTruthy();
    expect(getByTestId('incident-command-primary-lead-email')).toBeTruthy();
    // Lane objectives and linked need
    expect(getByText('incident_command.primary_objective')).toBeTruthy();
    expect(getByText('Ventilation')).toBeTruthy();
    expect(getByText('incident_command.linked_need')).toBeTruthy();
    expect(getByText('Extra Hose Line')).toBeTruthy();
    unmount();
  });

  it('should render the incident info card', () => {
    mockUseIncidentCommandStore.mockReturnValue(createStoreState({ view: mockView }));

    const { getByTestId, getByText, unmount } = render(<IncidentCommandTabPanel callId={123} />);

    expect(getByTestId('incident-command-info')).toBeTruthy();
    expect(getByText('John Commander')).toBeTruthy();
    expect(getByText('555-1234')).toBeTruthy();
    expect(getByText('commander@example.com')).toBeTruthy();
    expect(getByText('incident_command.established')).toBeTruthy();
    expect(getByText('incident_command.estimated_end')).toBeTruthy();
    expect(getByTestId('incident-command-important-information')).toBeTruthy();
    expect(getByText('Watch for downed power lines')).toBeTruthy();
    expect(getByTestId('incident-command-action-plan')).toBeTruthy();
    expect(getByText('Contain and control the fire')).toBeTruthy();
    unmount();
  });

  it('should render objectives, needs, notes and attachments', () => {
    mockUseIncidentCommandStore.mockReturnValue(createStoreState({ view: mockView }));

    const { getByText, unmount } = render(<IncidentCommandTabPanel callId={123} />);

    // Objectives
    expect(getByText('Primary Search')).toBeTruthy();
    expect(getByText('Search the first floor')).toBeTruthy();
    // Needs (quantity shown when requested > 0)
    expect(getByText('Water Supply')).toBeTruthy();
    expect(getByText('incident_command.quantity')).toBeTruthy();
    // Notes
    expect(getByText('Situation Update')).toBeTruthy();
    expect(getByText('Fire is 40% contained')).toBeTruthy();
    // Attachments
    expect(getByText('site-plan.pdf')).toBeTruthy();
    expect(getByText('2.0 KB')).toBeTruthy();
    expect(getByText('Building site plan')).toBeTruthy();
    unmount();
  });

  it('should render empty section messages when lists are empty', () => {
    mockUseIncidentCommandStore.mockReturnValue(
      createStoreState({
        view: {
          ...mockView,
          Objectives: [],
          Needs: [],
          Notes: [],
          Attachments: [],
          MyAssignment: null,
        },
      })
    );

    const { getByText, queryByTestId, unmount } = render(<IncidentCommandTabPanel callId={123} />);

    expect(queryByTestId('incident-command-my-assignment')).toBeNull();
    expect(getByText('incident_command.no_objectives')).toBeTruthy();
    expect(getByText('incident_command.no_needs')).toBeTruthy();
    expect(getByText('incident_command.no_notes')).toBeTruthy();
    expect(getByText('incident_command.no_attachments')).toBeTruthy();
    unmount();
  });
});
