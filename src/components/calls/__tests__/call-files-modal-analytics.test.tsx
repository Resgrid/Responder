import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { CallFilesModal } from '../call-files-modal';

// Mock analytics hook
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock navigation hooks
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback: () => void) => {
    callback();
  }),
}));

// Mock the zustand store
const mockFetchCallFiles = jest.fn();
const defaultMockFiles = [
  {
    Id: 'file-1',
    CallId: 'test-call-123',
    Type: 3,
    FileName: 'test-document.pdf',
    Name: 'Test Document',
    Size: 1024576,
    Url: 'https://example.com/file1.pdf',
    UserId: 'user-1',
    Timestamp: '2023-01-15T10:30:00Z',
    Mime: 'application/pdf',
    Data: '',
  },
];

let mockStoreState: any = {
  callFiles: defaultMockFiles,
  isLoadingFiles: false,
  errorFiles: null,
  fetchCallFiles: mockFetchCallFiles,
};

jest.mock('@/stores/calls/detail-store', () => ({
  useCallDetailStore: () => mockStoreState,
}));

// Mock all other dependencies using the same pattern as the main test file
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  writeAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/api/calls/callFiles', () => ({
  getCallAttachmentFile: jest.fn(() =>
    Promise.resolve(new Blob(['test content'], { type: 'application/pdf' }))
  ),
}));

// Mock React Native Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock FileReader
Object.defineProperty(global, 'FileReader', {
  writable: true,
  value: class MockFileReader {
    result: string | ArrayBuffer | null = null;
    readyState = 0;
    onload: ((event: any) => void) | null = null;

    readAsDataURL(blob: Blob) {
      setTimeout(() => {
        this.result = 'data:application/pdf;base64,dGVzdCBjb250ZW50';
        this.readyState = 2;
        if (this.onload) this.onload(new Event('load') as any);
      }, 0);
    }
  }
});

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock @gorhom/bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockBottomSheet = React.forwardRef(({ children, onChange, index, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      expand: jest.fn(),
      close: jest.fn(),
      snapToIndex: jest.fn(),
    }));

    React.useEffect(() => {
      if (onChange) {
        onChange(index);
      }
    }, [index, onChange]);

    return (
      <View testID="bottom-sheet" {...props}>
        {children}
      </View>
    );
  });

  const MockBottomSheetView = ({ children, ...props }: any) => (
    <View testID="bottom-sheet-view" {...props}>
      {children}
    </View>
  );

  const MockBottomSheetBackdrop = ({ ...props }: any) => (
    <View testID="bottom-sheet-backdrop" {...props} />
  );

  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetView: MockBottomSheetView,
    BottomSheetBackdrop: MockBottomSheetBackdrop,
  };
});

// Mock other UI components
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    ScrollView: ({ children, ...props }: any) => (
      <View testID="scroll-view" {...props}>
        {children}
      </View>
    ),
  };
});

jest.mock('lucide-react-native', () => {
  const { Text } = require('react-native');
  return {
    X: (props: any) => <Text testID="close-icon" {...props}>X</Text>,
    File: (props: any) => <Text testID="file-icon" {...props}>File</Text>,
    Download: (props: any) => <Text testID="download-icon" {...props}>Download</Text>,
  };
});

jest.mock('../../ui', () => {
  const { View } = require('react-native');
  return {
    FocusAwareStatusBar: ({ children, ...props }: any) => (
      <View testID="focus-aware-status-bar" {...props}>
        {children}
      </View>
    ),
  };
});

jest.mock('@/components/ui/box', () => {
  const { View } = require('react-native');
  return {
    Box: ({ children, ...props }: any) => (
      <View testID="box" {...props}>
        {children}
      </View>
    ),
  };
});

jest.mock('@/components/ui/button', () => {
  const { View, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID, ...props }: any) => (
      <View testID={testID || 'button'} {...props}>
        <Text onPress={onPress}>{children}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/ui/heading', () => {
  const { Text } = require('react-native');
  return {
    Heading: ({ children, ...props }: any) => (
      <Text testID="heading" {...props}>
        {children}
      </Text>
    ),
  };
});

jest.mock('@/components/ui/text', () => {
  const { Text } = require('react-native');
  return {
    Text: ({ children, ...props }: any) => (
      <Text testID="text" {...props}>
        {children}
      </Text>
    ),
  };
});

jest.mock('@/components/ui/vstack', () => {
  const { View } = require('react-native');
  return {
    VStack: ({ children, ...props }: any) => (
      <View testID="vstack" {...props}>
        {children}
      </View>
    ),
  };
});

jest.mock('@/components/ui/hstack', () => {
  const { View } = require('react-native');
  return {
    HStack: ({ children, ...props }: any) => (
      <View testID="hstack" {...props}>
        {children}
      </View>
    ),
  };
});

jest.mock('@/components/ui/spinner', () => {
  const { Text } = require('react-native');
  return {
    Spinner: ({ ...props }: any) => (
      <Text testID="spinner" {...props}>
        Loading...
      </Text>
    ),
  };
});

describe('CallFilesModal Analytics Tests', () => {
  const defaultProps = {
    isOpen: false,
    onClose: jest.fn(),
    callId: 'test-call-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = {
      callFiles: defaultMockFiles,
      isLoadingFiles: false,
      errorFiles: null,
      fetchCallFiles: mockFetchCallFiles,
    };
  });

  describe('Modal View Analytics', () => {
    it('tracks modal view with all properties when opened', () => {
      render(<CallFilesModal {...defaultProps} isOpen={true} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_modal_viewed', {
        timestamp: expect.any(String),
        callId: 'test-call-123',
        fileCount: 1,
        hasFiles: true,
        isLoading: false,
        hasError: false,
      });
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('tracks modal view analytics only when isOpen is true', () => {
      const { rerender } = render(<CallFilesModal {...defaultProps} isOpen={false} />);

      expect(mockTrackEvent).not.toHaveBeenCalled();

      rerender(<CallFilesModal {...defaultProps} isOpen={true} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_modal_viewed', expect.any(Object));
    });

    it('tracks different file counts correctly', () => {
      // Test with multiple files
      mockStoreState.callFiles = [defaultMockFiles[0], { ...defaultMockFiles[0], Id: 'file-2' }];

      render(<CallFilesModal {...defaultProps} isOpen={true} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_modal_viewed',
        expect.objectContaining({ fileCount: 2, hasFiles: true })
      );
    });

    it('tracks empty state correctly', () => {
      mockStoreState.callFiles = [];

      render(<CallFilesModal {...defaultProps} isOpen={true} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_modal_viewed',
        expect.objectContaining({ fileCount: 0, hasFiles: false })
      );
    });

    it('tracks loading state correctly', () => {
      mockStoreState.isLoadingFiles = true;
      mockStoreState.callFiles = null;

      render(<CallFilesModal {...defaultProps} isOpen={true} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_modal_viewed',
        expect.objectContaining({ isLoading: true, fileCount: 0 })
      );
    });

    it('tracks error state correctly', () => {
      mockStoreState.errorFiles = 'Network timeout';
      mockStoreState.callFiles = [];

      render(<CallFilesModal {...defaultProps} isOpen={true} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_modal_viewed',
        expect.objectContaining({ hasError: true })
      );
    });
  });

  describe('Close Analytics', () => {
    it('tracks manual close via button', () => {
      const { getByTestId } = render(<CallFilesModal {...defaultProps} isOpen={true} />);

      // Clear initial view analytics
      mockTrackEvent.mockClear();

      fireEvent.press(getByTestId('close-button'));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_modal_closed', {
        timestamp: expect.any(String),
        callId: 'test-call-123',
        wasManualClose: true,
      });
    });

    it('does not track close when modal was never opened', () => {
      const { getByTestId } = render(<CallFilesModal {...defaultProps} isOpen={false} />);

      // Try to close (though button wouldn't be visible)
      const closeButton = getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('File Interaction Analytics', () => {
    it('tracks file download start with all required properties', () => {
      const { getByTestId } = render(<CallFilesModal {...defaultProps} isOpen={true} />);

      // Clear initial view analytics
      mockTrackEvent.mockClear();

      fireEvent.press(getByTestId('file-item-file-1'));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_file_download_started', {
        timestamp: expect.any(String),
        callId: 'test-call-123',
        fileId: 'file-1',
        fileName: 'test-document.pdf',
        fileSize: 1024576,
        mimeType: 'application/pdf',
      });
    });

    it('tracks file download completion', async () => {
      const { getByTestId } = render(<CallFilesModal {...defaultProps} isOpen={true} />);

      // Clear initial view analytics
      mockTrackEvent.mockClear();

      fireEvent.press(getByTestId('file-item-file-1'));

      // Wait for download completion
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_file_download_completed', {
          timestamp: expect.any(String),
          callId: 'test-call-123',
          fileId: 'file-1',
          fileName: 'test-document.pdf',
          fileSize: 1024576,
          mimeType: 'application/pdf',
          wasShared: true,
        });
      }, { timeout: 3000 });
    });

    it('tracks file download failure', async () => {
      const mockGetCallAttachmentFile = require('@/api/calls/callFiles').getCallAttachmentFile;
      mockGetCallAttachmentFile.mockRejectedValueOnce(new Error('Network error'));

      const { getByTestId } = render(<CallFilesModal {...defaultProps} isOpen={true} />);

      // Clear initial view analytics
      mockTrackEvent.mockClear();

      fireEvent.press(getByTestId('file-item-file-1'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_file_download_failed', {
          timestamp: expect.any(String),
          callId: 'test-call-123',
          fileId: 'file-1',
          fileName: 'test-document.pdf',
          error: 'Network error',
        });
      });
    });
  });

  describe('Error Retry Analytics', () => {
    it('tracks retry button press with error context', () => {
      mockStoreState.errorFiles = 'Connection timeout';

      const { getByText } = render(<CallFilesModal {...defaultProps} isOpen={true} />);

      // Clear initial view analytics
      mockTrackEvent.mockClear();

      fireEvent.press(getByText('common.retry'));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_retry_pressed', {
        timestamp: expect.any(String),
        callId: 'test-call-123',
        error: 'Connection timeout',
      });
    });
  });

  describe('Analytics Error Handling', () => {
    it('handles analytics errors gracefully during modal view', () => {
      const originalWarn = console.warn;
      console.warn = jest.fn();

      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics service unavailable');
      });

      expect(() => {
        render(<CallFilesModal {...defaultProps} isOpen={true} />);
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to track call files modal analytics:',
        expect.any(Error)
      );

      console.warn = originalWarn;
    });

    it('handles analytics errors gracefully during close', () => {
      const originalWarn = console.warn;
      console.warn = jest.fn();

      const { getByTestId } = render(<CallFilesModal {...defaultProps} isOpen={true} />);

      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics service unavailable');
      });

      expect(() => {
        fireEvent.press(getByTestId('close-button'));
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to track call files modal close analytics:',
        expect.any(Error)
      );

      console.warn = originalWarn;
    });

    it('handles analytics errors gracefully during retry', () => {
      const originalWarn = console.warn;
      console.warn = jest.fn();

      mockStoreState.errorFiles = 'Network error';
      const { getByText } = render(<CallFilesModal {...defaultProps} isOpen={true} />);

      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics service unavailable');
      });

      expect(() => {
        fireEvent.press(getByText('common.retry'));
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to track call files retry analytics:',
        expect.any(Error)
      );

      console.warn = originalWarn;
    });
  });

  describe('Data Integrity', () => {
    it('tracks correct timestamp format', () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<CallFilesModal {...defaultProps} isOpen={true} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_modal_viewed',
        expect.objectContaining({
          timestamp: '2024-01-15T10:00:00.000Z',
        })
      );

      jest.restoreAllMocks();
    });

    it('maintains stable reference to trackEvent function', () => {
      const { rerender } = render(<CallFilesModal {...defaultProps} isOpen={true} />);

      const firstCallArgs = mockTrackEvent.mock.calls[0];
      mockTrackEvent.mockClear();

      rerender(<CallFilesModal {...defaultProps} isOpen={true} />);

      const secondCallArgs = mockTrackEvent.mock.calls[0];

      // The event name and structure should be consistent
      expect(firstCallArgs[0]).toBe(secondCallArgs[0]);
      expect(Object.keys(firstCallArgs[1])).toEqual(Object.keys(secondCallArgs[1]));
    });

    it('tracks different call IDs correctly', () => {
      const { rerender } = render(<CallFilesModal {...defaultProps} isOpen={true} callId="call-1" />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_modal_viewed',
        expect.objectContaining({ callId: 'call-1' })
      );

      mockTrackEvent.mockClear();

      rerender(<CallFilesModal {...defaultProps} isOpen={true} callId="call-2" />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_modal_viewed',
        expect.objectContaining({ callId: 'call-2' })
      );
    });
  });
});
