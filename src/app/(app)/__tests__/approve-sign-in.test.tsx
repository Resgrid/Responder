import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import * as api from '@/api/mfa/account-security';
import { getPasskeyAssertion } from '@/lib/mfa/passkey';
import { PasskeyCeremonyError } from '@/lib/mfa/passkey-errors';

import ApproveSignIn from '../approve-sign-in';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'ap-1' }),
  useRouter: () => ({ canGoBack: () => true, back: mockBack, replace: jest.fn() }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options?.count !== undefined ? `${key}:${options.count}` : options?.label !== undefined ? `${key}:${options.label}` : key),
  }),
}));
jest.mock('@/api/mfa/account-security');
jest.mock('@/lib/mfa/passkey', () => ({ getPasskeyAssertion: jest.fn() }));

const mocked = api as jest.Mocked<typeof api>;
const pending: api.PendingApprovalData = {
  ApprovalRequestId: 'ap-1',
  RequestingApp: 'unit',
  InstallationLabel: 'Engine 7 tablet',
  Shared: true,
  Department: 'Station 1',
  Purpose: 'unlock',
  Operation: null,
  OriginRegion: 'Colorado, US',
  CreatedAt: '2026-09-29T12:00:00',
  ExpiresAt: '2026-09-29T12:02:00',
  AttemptsRemaining: 3,
};
const refusal = (status: number, type: string) => Object.assign(new Error(type), { response: { status, data: { type } } });

describe('ApproveSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.getPendingApproval.mockResolvedValue(pending);
  });

  it('shows what is asking, then approves with the number and this app\'s passkey', async () => {
    mocked.getApprovalOptions.mockResolvedValue({ RequestId: 'req-1', Options: { challenge: 'abc' } });
    (getPasskeyAssertion as jest.Mock).mockResolvedValue({ id: 'cred' });
    mocked.approveRequest.mockResolvedValue({ State: 'approved' });

    const { getByTestId, getByText } = render(<ApproveSignIn />);
    await waitFor(() => expect(getByTestId('approve-details')).toBeTruthy());
    expect(getByText('mfa.approve.purpose.unlock')).toBeTruthy();
    expect(getByText('mfa.approve.shared')).toBeTruthy();

    fireEvent.changeText(getByTestId('approve-number'), '42');
    await act(async () => fireEvent.press(getByTestId('approve-confirm')));

    expect(mocked.approveRequest).toHaveBeenCalledWith('ap-1', '42', 'req-1', { id: 'cred' });
    expect(getByTestId('approve-approved')).toBeTruthy();
    fireEvent.press(getByTestId('approve-done'));
    expect(mockBack).toHaveBeenCalled();
  });

  it("shows a shared workstation's sign-in as shared and named by the station, and a personal one by its device alone", async () => {
    mocked.getPendingApproval.mockResolvedValueOnce({ ...pending, Purpose: 'login', RequestingApp: 'dispatch', InstallationLabel: 'Dispatch desk 2', Shared: true });
    const shared = render(<ApproveSignIn />);
    await waitFor(() => expect(shared.getByTestId('approve-details')).toBeTruthy());
    expect(shared.getByText('mfa.approve.purpose.login')).toBeTruthy();
    expect(shared.getByText('mfa.approve.installation:Dispatch desk 2')).toBeTruthy();
    expect(shared.getByText('mfa.approve.shared')).toBeTruthy();
    shared.unmount();

    mocked.getPendingApproval.mockResolvedValueOnce({ ...pending, Purpose: 'login', InstallationLabel: "Pat's iPhone", Shared: false });
    const personal = render(<ApproveSignIn />);
    await waitFor(() => expect(personal.getByTestId('approve-details')).toBeTruthy());
    expect(personal.getByText("mfa.approve.installation:Pat's iPhone")).toBeTruthy();
    expect(personal.queryByText('mfa.approve.shared')).toBeNull();
  });

  it('says how many tries are left after a wrong number, and never approves without one', async () => {
    mocked.getApprovalOptions.mockResolvedValue({ RequestId: 'req-1', Options: {} });
    (getPasskeyAssertion as jest.Mock).mockResolvedValue({ id: 'cred' });
    mocked.approveRequest.mockRejectedValueOnce(refusal(400, 'approval_number_mismatch'));
    mocked.getPendingApproval.mockResolvedValueOnce(pending).mockResolvedValueOnce({ ...pending, AttemptsRemaining: 2 });

    const { getByTestId } = render(<ApproveSignIn />);
    await waitFor(() => expect(getByTestId('approve-number')).toBeTruthy());
    expect(getByTestId('approve-confirm').props.accessibilityState?.disabled ?? getByTestId('approve-confirm').props.isDisabled).toBeTruthy();

    fireEvent.changeText(getByTestId('approve-number'), '17');
    await act(async () => fireEvent.press(getByTestId('approve-confirm')));
    await waitFor(() => expect(getByTestId('approve-error').props.children).toBe('mfa.approve.number_mismatch:2'));
  });

  it('keeps the request when the passkey prompt is closed', async () => {
    mocked.getApprovalOptions.mockResolvedValue({ RequestId: 'req-1', Options: {} });
    (getPasskeyAssertion as jest.Mock).mockRejectedValue(new PasskeyCeremonyError('cancelled'));
    const { getByTestId } = render(<ApproveSignIn />);
    await waitFor(() => expect(getByTestId('approve-number')).toBeTruthy());
    fireEvent.changeText(getByTestId('approve-number'), '42');
    await act(async () => fireEvent.press(getByTestId('approve-confirm')));
    expect(mocked.approveRequest).not.toHaveBeenCalled();
    expect(getByTestId('approve-error').props.children).toBe('mfa.errors.passkey_cancelled');
    expect(getByTestId('approve-details')).toBeTruthy();
  });

  it('denies, or reports that it was not the member', async () => {
    mocked.denyRequest.mockResolvedValue({ State: 'denied' });
    const first = render(<ApproveSignIn />);
    await waitFor(() => expect(first.getByTestId('approve-deny')).toBeTruthy());
    await act(async () => fireEvent.press(first.getByTestId('approve-deny')));
    expect(mocked.denyRequest).toHaveBeenCalledWith('ap-1', 'declined');
    expect(first.getByTestId('approve-denied')).toBeTruthy();
    first.unmount();

    const second = render(<ApproveSignIn />);
    await waitFor(() => expect(second.getByTestId('approve-not-me')).toBeTruthy());
    await act(async () => fireEvent.press(second.getByTestId('approve-not-me')));
    expect(mocked.denyRequest).toHaveBeenLastCalledWith('ap-1', 'not_me');
  });

  it('says so when nothing is waiting', async () => {
    mocked.getPendingApproval.mockResolvedValue(null);
    const { getByTestId } = render(<ApproveSignIn />);
    await waitFor(() => expect(getByTestId('approve-none')).toBeTruthy());
  });
});
