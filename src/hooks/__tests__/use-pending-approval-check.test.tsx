import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { getPendingApproval } from '@/api/mfa/account-security';

import { usePendingApprovalCheck } from '../use-pending-approval-check';

const mockPush = jest.fn();
let mockPathname = '/home';
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => mockPathname }));
jest.mock('@/api/mfa/account-security', () => ({ getPendingApproval: jest.fn() }));
jest.mock('@/lib/logging', () => ({ logger: { warn: jest.fn() } }));

describe('usePendingApprovalCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/home';
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
  });

  it('opens the approval screen when a request is waiting', async () => {
    (getPendingApproval as jest.Mock).mockResolvedValue({ ApprovalRequestId: 'ap-1' });
    renderHook(() => usePendingApprovalCheck(true));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/approve-sign-in'));
  });

  it('does nothing when signed out, when nothing waits, or when already there', async () => {
    renderHook(() => usePendingApprovalCheck(false));
    expect(getPendingApproval).not.toHaveBeenCalled();

    (getPendingApproval as jest.Mock).mockResolvedValue(null);
    renderHook(() => usePendingApprovalCheck(true));
    await waitFor(() => expect(getPendingApproval).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();

    mockPathname = '/approve-sign-in';
    (getPendingApproval as jest.Mock).mockResolvedValue({ ApprovalRequestId: 'ap-1' });
    renderHook(() => usePendingApprovalCheck(true));
    await waitFor(() => expect(getPendingApproval).toHaveBeenCalledTimes(2));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
