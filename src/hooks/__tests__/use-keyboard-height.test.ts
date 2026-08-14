import { act, renderHook } from '@testing-library/react-native';
import { Keyboard, Platform } from 'react-native';

import { useKeyboardHeight } from '../use-keyboard-height';

type Handler = (event: { endCoordinates: { height: number } }) => void;

const registerListeners = () => {
  const handlers: Record<string, Handler> = {};
  const remove = jest.fn();

  (Keyboard.addListener as jest.Mock).mockImplementation((event: string, handler: Handler) => {
    handlers[event] = handler;
    return { remove };
  });

  return { handlers, remove };
};

describe('useKeyboardHeight', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  it('starts closed', () => {
    registerListeners();

    const { result } = renderHook(() => useKeyboardHeight());

    expect(result.current).toBe(0);
  });

  it('reports the keyboard height while it is open and resets when it closes', () => {
    const { handlers } = registerListeners();

    const { result } = renderHook(() => useKeyboardHeight());

    act(() => {
      handlers[Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow']({ endCoordinates: { height: 336 } });
    });
    expect(result.current).toBe(336);

    act(() => {
      handlers[Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide']({ endCoordinates: { height: 0 } });
    });
    expect(result.current).toBe(0);
  });

  it('subscribes to the Will events on iOS so sheets move with the keyboard animation', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    registerListeners();

    renderHook(() => useKeyboardHeight());

    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardWillShow', expect.any(Function));
    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardWillHide', expect.any(Function));
  });

  it('subscribes to the Did events on Android, which are the only ones with usable frames', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    registerListeners();

    renderHook(() => useKeyboardHeight());

    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function));
    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function));
  });

  it('removes both subscriptions on unmount', () => {
    const { remove } = registerListeners();

    const { unmount } = renderHook(() => useKeyboardHeight());
    unmount();

    expect(remove).toHaveBeenCalledTimes(2);
  });
});
