import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { type FieldRecordCatalogEntry, type RecordSummaryData, RmsRecordState } from '@/models/v4/records';
import { type PendingRecordDraft } from '@/stores/records/store';
import { terminologyStore } from '@/stores/terminology/store';

import { PendingDraftItem, RecordListItem } from '../record-list-item';

interface MockChildrenProps {
  children?: React.ReactNode;
  testID?: string;
}

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('lucide-react-native', () => ({ AlertTriangle: () => null, CloudOff: () => null, FileText: () => null }));

const mockRecordsState: { catalog: { Definitions: Partial<FieldRecordCatalogEntry>[] } | null } = { catalog: null };
jest.mock('@/stores/records/store', () => ({
  useRecordsStore: <T,>(selector: (state: typeof mockRecordsState) => T) => selector(mockRecordsState),
}));

jest.mock('@/components/ui/badge', () => {
  const { Text, View } = require('react-native');
  return {
    Badge: ({ children }: MockChildrenProps) => <View>{children}</View>,
    BadgeText: ({ children }: MockChildrenProps) => <Text>{children}</Text>,
  };
});

jest.mock('@/components/ui/box', () => {
  const { View } = require('react-native');
  return { Box: ({ children }: MockChildrenProps) => <View>{children}</View> };
});

jest.mock('@/components/ui/hstack', () => {
  const { View } = require('react-native');
  return { HStack: ({ children }: MockChildrenProps) => <View>{children}</View> };
});

jest.mock('@/components/ui/vstack', () => {
  const { View } = require('react-native');
  return { VStack: ({ children }: MockChildrenProps) => <View>{children}</View> };
});

jest.mock('@/components/ui/pressable', () => {
  const { TouchableOpacity } = require('react-native');
  return { Pressable: ({ children, testID }: MockChildrenProps) => <TouchableOpacity testID={testID}>{children}</TouchableOpacity> };
});

jest.mock('@/components/ui/text', () => {
  const { Text } = require('react-native');
  return { Text };
});

const summary = (overrides: Partial<RecordSummaryData>): RecordSummaryData => ({
  RecordId: 'r1',
  DefinitionKey: 'system.run',
  DefinitionVersion: 1,
  State: RmsRecordState.Draft,
  CreatedOn: '2026-10-01T00:00:00Z',
  ModifiedOn: '2026-10-01T00:00:00Z',
  RowVersion: 1,
  ...overrides,
});

const draft = (overrides: Partial<PendingRecordDraft>): PendingRecordDraft => ({
  clientRecordId: 'draft-1',
  recordId: null,
  definitionKey: 'system.run',
  definitionVersion: 1,
  name: 'Run',
  values: [],
  updatedOn: '2026-10-01T00:00:00Z',
  ...overrides,
});

describe('RecordListItem record type names', () => {
  beforeEach(() => {
    mockRecordsState.catalog = null;
    terminologyStore.setState({ names: {} });
  });

  it("shows the department's name for a built-in type instead of its key", () => {
    terminologyStore.setState({ names: { 'record-type.run': 'Incident' } });

    render(<RecordListItem record={summary({ DisplaySummary: 'Engine 1' })} onPress={jest.fn()} />);

    expect(screen.getByText('Incident')).toBeTruthy();
    expect(screen.queryByText('system.run')).toBeNull();
  });

  it('shows the renamed type under the record number when there is no summary', () => {
    terminologyStore.setState({ names: { 'record-type.run': 'Incident' } });

    render(<RecordListItem record={summary({ RecordNumber: 'R-26-1' })} onPress={jest.fn()} />);

    expect(screen.getByText('R-26-1')).toBeTruthy();
    expect(screen.getByText('Incident')).toBeTruthy();
  });

  it('names a legacy record by its type number', () => {
    terminologyStore.setState({ names: { 'record-type.training': 'Drill' } });

    render(<RecordListItem record={summary({ DefinitionKey: null, RecordType: 2 })} onPress={jest.fn()} />);

    expect(screen.getAllByText('Drill').length).toBeGreaterThan(0);
  });

  it("falls back to the catalog's name when the type is not renamed", () => {
    mockRecordsState.catalog = { Definitions: [{ DefinitionKey: 'system.run', Name: 'Run' }] };

    render(<RecordListItem record={summary({})} onPress={jest.fn()} />);

    expect(screen.getAllByText('Run').length).toBeGreaterThan(0);
    expect(screen.queryByText('system.run')).toBeNull();
  });

  it('never shows a raw built-in key, even with no catalog loaded', () => {
    render(<RecordListItem record={summary({ DefinitionKey: 'system.unit-activity' })} onPress={jest.fn()} />);

    expect(screen.getAllByText('Unit activity').length).toBeGreaterThan(0);
    expect(screen.queryByText('system.unit-activity')).toBeNull();
  });

  it("uses the catalog's name for a department definition", () => {
    mockRecordsState.catalog = { Definitions: [{ DefinitionKey: 'hydrant-test', Name: 'Hydrant test' }] };

    render(<RecordListItem record={summary({ DefinitionKey: 'hydrant-test' })} onPress={jest.fn()} />);

    expect(screen.getAllByText('Hydrant test').length).toBeGreaterThan(0);
  });
});

describe('PendingDraftItem record type names', () => {
  beforeEach(() => {
    mockRecordsState.catalog = null;
    terminologyStore.setState({ names: { 'record-type.run': 'Incident' } });
  });

  afterAll(() => {
    terminologyStore.setState({ names: {} });
  });

  it('labels a new draft with the renamed type', () => {
    render(<PendingDraftItem draft={draft({})} onPress={jest.fn()} />);

    expect(screen.getByText('Incident')).toBeTruthy();
    expect(screen.queryByText('Run')).toBeNull();
  });

  it("keeps an edit draft's record number", () => {
    render(<PendingDraftItem draft={draft({ clientRecordId: 'edit-r1-2', recordId: 'r1', name: 'R-26-1' })} onPress={jest.fn()} />);

    expect(screen.getByText('R-26-1')).toBeTruthy();
    expect(screen.queryByText('Incident')).toBeNull();
  });
});
