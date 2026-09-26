import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { ActivityLinkMarker } from '../activity-link-marker';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ActivityLinkMarker', () => {
  it.each([2, 3, 4])('renders the auto-linked marker for source %s', (source) => {
    render(<ActivityLinkMarker source={source} />);

    const marker = screen.getByTestId('activity-link-marker-auto');
    expect(marker.props.accessibilityLabel).toBe('call_detail.activity_link.auto');
    expect(marker.props.accessibilityHint).toBe('call_detail.activity_link.auto_hint');
    expect(screen.getByText('call_detail.activity_link.auto')).toBeTruthy();
    expect(screen.queryByTestId('activity-link-marker-inferred')).toBeNull();
  });

  it('renders the inferred marker for source 5', () => {
    render(<ActivityLinkMarker source={5} />);

    const marker = screen.getByTestId('activity-link-marker-inferred');
    expect(marker.props.accessibilityLabel).toBe('call_detail.activity_link.inferred');
    expect(marker.props.accessibilityHint).toBe('call_detail.activity_link.inferred_hint');
    expect(screen.getByText('call_detail.activity_link.inferred')).toBeTruthy();
    expect(screen.queryByTestId('activity-link-marker-auto')).toBeNull();
  });

  it('uses a distinct badge action for each kind', () => {
    const { rerender } = render(<ActivityLinkMarker source={2} />);
    expect(screen.getByTestId('activity-link-marker-auto').props.action).toBe('info');

    rerender(<ActivityLinkMarker source={5} />);
    expect(screen.getByTestId('activity-link-marker-inferred').props.action).toBe('warning');
  });

  it.each([
    ['explicit', 1],
    ['null', null],
    ['undefined', undefined],
  ])('renders nothing for %s', (_label, source) => {
    render(<ActivityLinkMarker source={source} />);

    expect(screen.queryByTestId('activity-link-marker-auto')).toBeNull();
    expect(screen.queryByTestId('activity-link-marker-inferred')).toBeNull();
  });
});
