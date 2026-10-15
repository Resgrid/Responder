import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import { terminologyStore } from '@/stores/terminology/store';

import HomeLayout from '../_layout';

interface MockTabsProps {
  children?: React.ReactNode;
}

interface MockScreenProps {
  name: string;
  options?: { title?: string };
}

jest.mock('expo-router', () => {
  const { Text, View } = require('react-native');
  const MockTabs = ({ children }: MockTabsProps) => <View>{children}</View>;
  MockTabs.Screen = ({ name, options }: MockScreenProps) => <Text testID={`home-tab-${name}`}>{options?.title}</Text>;
  return { Tabs: MockTabs };
});

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('HomeLayout tab titles', () => {
  beforeEach(() => {
    terminologyStore.setState({ names: {} });
  });

  afterAll(() => {
    terminologyStore.setState({ names: {} });
  });

  it('keeps the app labels when nothing is renamed', () => {
    render(<HomeLayout />);

    expect(screen.getByTestId('home-tab-personnel').props.children).toBe('tabs.personnel');
    expect(screen.getByTestId('home-tab-units').props.children).toBe('units.title');
    expect(screen.getByTestId('home-tab-calls').props.children).toBe('tabs.calls');
  });

  it("uses the department's names for renamed modules", () => {
    terminologyStore.setState({ names: { 'module.personnel': 'Members', 'module.units': 'Apparatus', 'module.calls': 'Incidents' } });

    render(<HomeLayout />);

    expect(screen.getByTestId('home-tab-personnel').props.children).toBe('Members');
    expect(screen.getByTestId('home-tab-units').props.children).toBe('Apparatus');
    expect(screen.getByTestId('home-tab-calls').props.children).toBe('Incidents');
    expect(screen.getByTestId('home-tab-index').props.children).toBe('tabs.home');
  });

  it('relabels the tabs when the names arrive after the first render', () => {
    render(<HomeLayout />);

    act(() => {
      terminologyStore.setState({ names: { 'module.calls': 'Incidents' } });
    });

    expect(screen.getByTestId('home-tab-calls').props.children).toBe('Incidents');
  });
});
