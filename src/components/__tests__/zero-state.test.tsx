import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { AlertCircle, FileX } from 'lucide-react-native';
import React from 'react';

import { Button } from '@/components/ui/button';

import ZeroState from '../common/zero-state';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

describe('ZeroState', () => {
  it('renders with default props', () => {
    render(<ZeroState />);

    expect(screen.getByTestId('zero-state')).toBeTruthy();
    expect(screen.getByText('No data available')).toBeTruthy();
    expect(screen.getByText("There's nothing to display at the moment")).toBeTruthy();
  });

  it('renders with custom props', () => {
    render(<ZeroState icon={FileX} heading="No files found" description="Try uploading some files first" iconColor="#3b82f6" />);

    expect(screen.getByText('No files found')).toBeTruthy();
    expect(screen.getByText('Try uploading some files first')).toBeTruthy();
  });

  it('renders in error state', () => {
    render(<ZeroState isError icon={AlertCircle} heading="Connection failed" description="Check your internet connection" />);

    expect(screen.getByText('Connection failed')).toBeTruthy();
    expect(screen.getByText('Check your internet connection')).toBeTruthy();
  });
});
