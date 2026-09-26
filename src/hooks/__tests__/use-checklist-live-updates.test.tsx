jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]) }));
jest.mock('@/lib/env', () => ({ Env: { CHANNEL_HUB_NAME: 'updates' } }));
jest.mock('@/services/signalr.service', () => ({ SignalRService: { HUB_RECONNECTED_EVENT: 'reconnected' }, HUB_CONNECTED_EVENT: 'connected', signalRService: { on: jest.fn(), off: jest.fn() } }));
jest.mock('@/stores/auth/store', () => { const { create } = jest.requireActual('zustand'); return { __esModule: true, default: create(() => ({ userId: 'author' })) }; });
jest.mock('@/stores/security/store', () => { const { create } = jest.requireActual('zustand'); return { securityStore: create(() => ({ rights: { DepartmentId: 77 } })) }; });
jest.mock('@/stores/checklists/store', () => { const { create } = jest.requireActual('zustand'); return { checklistScope: () => 'scope', useChecklistsStore: create(() => ({ locked: false, busy: false, active: null, access: { IsProtected: false } })) }; });
jest.mock('@/stores/data-protection/store', () => ({ dataProtectionStore: { getState: () => ({ isStepUpActive: () => false }) } }));
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { signalRService } from '@/services/signalr.service';
import { useChecklistsStore } from '@/stores/checklists/store';
import { useChecklistLiveUpdates } from '../use-checklist-live-updates';
const event = (name: string) => {
 const call = jest.mocked(signalRService.on).mock.calls.find(([key]) => key === name);
 if (!call) throw new Error(`Missing listener: ${name}`);
 return call[1];
};
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() }); Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' }); useChecklistsStore.setState({ locked: false, busy: false, active: null, access: { IsProtected: false } as any }); });
afterEach(() => { jest.useRealTimers(); });
it('coalesces value-free hints and cleans listeners on blur/unmount', () => {
 const refresh = jest.fn(); const hook = renderHook(() => useChecklistLiveUpdates(refresh));
 act(() => { event('checklistUpdated')('untrusted payload'); event('checklistUpdated')('second'); jest.advanceTimersByTime(500); });
 expect(refresh).toHaveBeenCalledTimes(1); expect(refresh).toHaveBeenCalledWith();
 hook.unmount(); expect(signalRService.off).toHaveBeenCalledWith('checklistUpdated', expect.any(Function));
});
it('defers while editing and refetches once the draft closes', () => {
 const refresh = jest.fn(); const hook = renderHook(() => useChecklistLiveUpdates(refresh));
 act(() => { useChecklistsStore.setState({ active: { id: 'draft' } as any }); event('checklistUpdated')(); jest.advanceTimersByTime(500); });
 expect(refresh).not.toHaveBeenCalled();
 act(() => { useChecklistsStore.setState({ active: null }); jest.advanceTimersByTime(500); });
 expect(refresh).toHaveBeenCalledTimes(1); hook.unmount();
});
it('does not fetch in background, while locked, or with an expired protected grant', () => {
 const refresh = jest.fn(); const hook = renderHook(() => useChecklistLiveUpdates(refresh));
 act(() => { useChecklistsStore.setState({ locked: true, access: { IsProtected: true } as any }); event('checklistUpdated')(); jest.advanceTimersByTime(500); });
 act(() => { useChecklistsStore.setState({ locked: false, access: { IsProtected: true } as any }); event('checklistUpdated')(); jest.advanceTimersByTime(500); });
 act(() => { Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' }); useChecklistsStore.setState({ access: { IsProtected: false } as any }); event('checklistUpdated')(); jest.advanceTimersByTime(500); });
 expect(refresh).not.toHaveBeenCalled(); hook.unmount();
});
