import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { getCertification, getMyCertifications, getPersonCertificationTypes, saveCertification } from '@/api/certifications/certifications';
import type { Certification } from '@/models/v4/certifications';
import { useCertificationsStore } from '@/stores/certifications/store';

import EditCertificationScreen from '../certifications/edit';

const mockParams: { id?: string } = {};
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: jest.fn(), replace: mockReplace }),
  Stack: { Screen: () => null },
}));

jest.mock('@/api/certifications/certifications', () => ({
  addCertificationCredit: jest.fn(),
  deleteCertification: jest.fn(),
  getCertification: jest.fn(),
  getCertificationCredits: jest.fn(),
  getMyCertifications: jest.fn(),
  getPersonCertificationTypes: jest.fn(),
  renewCertification: jest.fn(),
  saveCertification: jest.fn(),
}));

jest.mock('@/stores/auth/store', () => {
  const { create } = jest.requireActual('zustand');
  return { __esModule: true, default: create(() => ({ userId: 'me' })) };
});

jest.mock('@/stores/security/store', () => {
  const { create } = jest.requireActual('zustand');
  return { securityStore: create(() => ({ rights: { DepartmentId: '77' } })) };
});

jest.mock('@/lib/media/photo', () => ({
  capturePhoto: jest.fn(),
  discardPhoto: jest.fn(() => Promise.resolve()),
  PhotoPermissionError: class PhotoPermissionError extends Error {},
}));

jest.mock('@/components/operations/option-select', () => ({
  OptionSelect: () => null,
}));

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const record = (overrides: Partial<Certification> = {}) =>
  ({
    Id: 42,
    TypeId: null,
    Name: 'Hazmat Technician',
    Number: 'HM-1',
    IssuedBy: 'State',
    Area: null,
    ReceivedOn: '2025-01-02T00:00:00',
    ExpiresOn: '2027-01-02T00:00:00',
    HasFile: false,
    ...overrides,
  }) as Certification;

describe('EditCertificationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete mockParams.id;
    useCertificationsStore.setState({ identity: 'me:77', items: [], types: [], detail: null, credits: [], busy: false, error: null });
    jest.mocked(getMyCertifications).mockResolvedValue([]);
    jest.mocked(getPersonCertificationTypes).mockResolvedValue([]);
  });

  it('reads a record the list does not hold, seeds the form, and saves it as an edit', async () => {
    mockParams.id = '42';
    jest.mocked(getCertification).mockResolvedValue(record());
    jest.mocked(saveCertification).mockResolvedValue(record());

    render(<EditCertificationScreen />);

    expect(screen.getByTestId('certification-edit-loading')).toBeTruthy();
    expect(screen.queryByTestId('certification-save')).toBeNull();

    await waitFor(() => expect(screen.getByTestId('certification-number').props.value).toBe('HM-1'));
    expect(getCertification).toHaveBeenCalledWith(42);

    fireEvent.press(screen.getByTestId('certification-save'));

    await waitFor(() => expect(saveCertification).toHaveBeenCalledWith(expect.objectContaining({ Id: 42, Number: 'HM-1' })));
    expect(mockReplace).toHaveBeenCalledWith('/certifications/42');
  });

  it('uses the listed record without reading it again', () => {
    mockParams.id = '42';
    useCertificationsStore.setState({ items: [record({ Number: 'LISTED' })] });

    render(<EditCertificationScreen />);

    expect(screen.getByTestId('certification-number').props.value).toBe('LISTED');
    expect(getCertification).not.toHaveBeenCalled();
  });

  it('shows the refusal instead of an empty add form when the record cannot be read', async () => {
    mockParams.id = '42';
    jest.mocked(getCertification).mockRejectedValue({ response: { status: 404 } });

    render(<EditCertificationScreen />);

    await waitFor(() => expect(screen.getByTestId('certification-edit-error')).toBeTruthy());
    expect(screen.queryByTestId('certification-save')).toBeNull();
  });

  it('opens an empty add form without an id', () => {
    render(<EditCertificationScreen />);

    expect(screen.getByTestId('certification-number').props.value).toBe('');
    expect(getCertification).not.toHaveBeenCalled();
  });
});
