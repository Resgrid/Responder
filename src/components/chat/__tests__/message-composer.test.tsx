/**
 * The attachment sheet must only offer actions the host surface can actually perform.
 * Thread replies send text and location only; when they still rendered the image entry the
 * picker opened and the chosen photo was silently dropped.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: 0, longitude: 0 } }),
}));

jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), trace: jest.fn(), fatal: jest.fn() },
}));

jest.mock('@/stores/toast/store', () => ({
  useToastStore: { getState: () => ({ showToast: jest.fn() }) },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The shared lucide mock only exports the icons other suites use; this composer pulls in
// several it does not, which would otherwise render as undefined elements.
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const icon = React.forwardRef((props: Record<string, unknown>, ref: unknown) => React.createElement(View, { ...props, ref }));
  return new Proxy({}, { get: () => icon });
});

jest.mock('react-native-keyboard-controller', () => ({
  useKeyboardState: () => false,
  KeyboardAvoidingView: ({ children }: { children: React.ReactNode }) => children,
}));

// Only the open sheet's children matter here, so the sheet is reduced to plain views.
jest.mock('@/components/ui/actionsheet', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  const passthrough = ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children);
  return {
    Actionsheet: ({ children, isOpen }: { children?: React.ReactNode; isOpen: boolean }) => (isOpen ? React.createElement(View, null, children) : null),
    ActionsheetBackdrop: passthrough,
    ActionsheetContent: passthrough,
    ActionsheetDragIndicator: passthrough,
    ActionsheetDragIndicatorWrapper: passthrough,
    ActionsheetItem: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) => React.createElement(Pressable, { onPress }, children),
    // Rendered as Text so the labels are queryable the way they are on a real device.
    ActionsheetItemText: ({ children }: { children?: React.ReactNode }) => React.createElement(Text, null, children),
  };
});

import { MessageComposer } from '../message-composer';

const baseProps = {
  onSendText: jest.fn(),
  onSendLocation: jest.fn(),
  onTyping: jest.fn(),
};

function openAttachmentSheet() {
  fireEvent.press(screen.getByLabelText('chat.attach'));
}

describe('MessageComposer attachment actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers image and GIF when both callbacks are provided', () => {
    render(<MessageComposer {...baseProps} onSendImage={jest.fn()} onOpenGif={jest.fn()} />);
    openAttachmentSheet();

    expect(screen.queryByText('chat.add_image')).not.toBeNull();
    expect(screen.queryByText('chat.add_gif')).not.toBeNull();
    expect(screen.queryByText('chat.emoji')).not.toBeNull();
  });

  it('hides both when neither callback is provided, as thread replies do', () => {
    render(<MessageComposer {...baseProps} allowUrgent={false} />);
    openAttachmentSheet();

    expect(screen.queryByText('chat.add_image')).toBeNull();
    expect(screen.queryByText('chat.add_gif')).toBeNull();
    // The actions a thread can still perform stay available.
    expect(screen.queryByText('chat.emoji')).not.toBeNull();
    expect(screen.queryByText('chat.share_location')).not.toBeNull();
  });

  it('hides only the GIF action when images are supported but GIFs are not', () => {
    render(<MessageComposer {...baseProps} onSendImage={jest.fn()} />);
    openAttachmentSheet();

    expect(screen.queryByText('chat.add_image')).not.toBeNull();
    expect(screen.queryByText('chat.add_gif')).toBeNull();
  });

  it('hides only the image action when GIFs are supported but images are not', () => {
    render(<MessageComposer {...baseProps} onOpenGif={jest.fn()} />);
    openAttachmentSheet();

    expect(screen.queryByText('chat.add_image')).toBeNull();
    expect(screen.queryByText('chat.add_gif')).not.toBeNull();
  });

  it('invokes the GIF callback when the action is used', () => {
    const onOpenGif = jest.fn();
    render(<MessageComposer {...baseProps} onOpenGif={onOpenGif} />);
    openAttachmentSheet();

    fireEvent.press(screen.getByText('chat.add_gif'));

    expect(onOpenGif).toHaveBeenCalledTimes(1);
  });
});
