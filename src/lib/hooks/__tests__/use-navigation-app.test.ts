import { act, renderHook } from '@testing-library/react-native';

import { useNavigationApp } from '../use-navigation-app';

const mockSetStoredApp = jest.fn();
let mockStoredApp: string | undefined;
jest.mock('react-native-mmkv', () => ({
  useMMKVString: jest.fn(() => [mockStoredApp, mockSetStoredApp]),
}));

jest.mock('@/lib/storage', () => ({
  storage: {},
}));

describe('useNavigationApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoredApp = undefined;
  });

  it('reads the MMKV navigation app key', () => {
    const { useMMKVString } = jest.requireMock<{ useMMKVString: jest.Mock }>('react-native-mmkv');

    renderHook(() => useNavigationApp());

    expect(useMMKVString).toHaveBeenCalledWith('NAVIGATION_APP', expect.anything());
  });

  it('defaults to the device default when nothing was saved', () => {
    const { result } = renderHook(() => useNavigationApp());

    expect(result.current.navigationApp).toBe('default');
  });

  it('returns the saved navigation app', () => {
    mockStoredApp = 'waze';

    const { result } = renderHook(() => useNavigationApp());

    expect(result.current.navigationApp).toBe('waze');
  });

  it('treats an unknown saved value as the device default', () => {
    mockStoredApp = 'sygic';

    const { result } = renderHook(() => useNavigationApp());

    expect(result.current.navigationApp).toBe('default');
  });

  it('saves a new choice', () => {
    const { result } = renderHook(() => useNavigationApp());

    act(() => {
      result.current.setNavigationApp('google_maps');
    });

    expect(mockSetStoredApp).toHaveBeenCalledWith('google_maps');
  });
});
