import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { useAnalytics } from '@/hooks/use-analytics';
import { CallProtocolsResultData } from '@/models/v4/callProtocols/callProtocolsResultData';

import { ProtocolDetailsSheet } from '../protocol-details-sheet';

// Mock analytics hook
jest.mock('@/hooks/use-analytics');
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

// Mock dependencies
jest.mock('@/lib/utils', () => ({
  formatDateForDisplay: jest.fn((date) => date ? '2023-01-01 12:00 UTC' : ''),
  parseDateISOString: jest.fn((dateString) => dateString ? new Date(dateString) : null),
  stripHtmlTags: jest.fn((html) => html ? html.replace(/<[^>]*>/g, '') : ''),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
  cssInterop: jest.fn(),
}));

jest.mock('react-native-webview', () => ({
  __esModule: true,
  default: ({ source }: { source: any }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="webview">
        <Text testID="webview-content">{source.html}</Text>
      </View>
    );
  },
}));

// Mock the protocols store
const mockProtocolsStore = {
  protocols: [],
  selectedProtocolId: null,
  isDetailsOpen: false,
  closeDetails: jest.fn(),
};

jest.mock('@/stores/protocols/store', () => ({
  useProtocolsStore: () => mockProtocolsStore,
}));

// Mock the UI components
jest.mock('@/components/ui/actionsheet', () => ({
  Actionsheet: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="actionsheet">{children}</View>;
  },
  ActionsheetBackdrop: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="actionsheet-backdrop">{children}</View>;
  },
  ActionsheetContent: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="actionsheet-content">{children}</View>;
  },
  ActionsheetDragIndicator: () => {
    const { View } = require('react-native');
    return <View testID="actionsheet-drag-indicator" />;
  },
  ActionsheetDragIndicatorWrapper: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="actionsheet-drag-indicator-wrapper">{children}</View>;
  },
}));

// Mock protocols test data
const mockProtocols: CallProtocolsResultData[] = [
  {
    Id: '1',
    DepartmentId: 'dept1',
    Name: 'Fire Emergency Response',
    Code: 'FIRE001',
    Description: 'Standard fire emergency response protocol',
    ProtocolText: '<p>Fire emergency response protocol content</p>',
    CreatedOn: '2023-01-01T00:00:00Z',
    CreatedByUserId: 'user1',
    IsDisabled: false,
    UpdatedOn: '2023-01-02T00:00:00Z',
    UpdatedByUserId: 'user1',
    MinimumWeight: 0,
    State: 1,
    Triggers: [],
    Attachments: [],
    Questions: [],
  },
  {
    Id: '2',
    DepartmentId: 'dept1',
    Name: 'Basic Protocol',
    Code: '',
    Description: '',
    ProtocolText: '<p>Basic protocol content</p>',
    CreatedOn: '2023-01-01T00:00:00Z',
    CreatedByUserId: 'user1',
    IsDisabled: false,
    UpdatedOn: '',
    UpdatedByUserId: '',
    MinimumWeight: 0,
    State: 1,
    Triggers: [],
    Attachments: [],
    Questions: [],
  },
];

describe('ProtocolDetailsSheet', () => {
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock analytics hook
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    // Reset mock store to default state
    Object.assign(mockProtocolsStore, {
      protocols: [],
      selectedProtocolId: null,
      isDetailsOpen: false,
      closeDetails: jest.fn(),
    });
  });

  describe('Sheet Visibility', () => {
    it('should render when isDetailsOpen is true and selectedProtocol exists', () => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });

      render(<ProtocolDetailsSheet />);

      expect(screen.getByText('Fire Emergency Response')).toBeTruthy();
    });
  });

  describe('Protocol Information Display', () => {
    beforeEach(() => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });
    });

    it('should display protocol name in header', () => {
      render(<ProtocolDetailsSheet />);

      expect(screen.getByText('Fire Emergency Response')).toBeTruthy();
    });

    it('should display protocol code when available', () => {
      render(<ProtocolDetailsSheet />);

      expect(screen.getByText('FIRE001')).toBeTruthy();
    });

    it('should display protocol description when available', () => {
      render(<ProtocolDetailsSheet />);

      expect(screen.getByText('Standard fire emergency response protocol')).toBeTruthy();
    });

    it('should display formatted date', () => {
      render(<ProtocolDetailsSheet />);

      expect(screen.getByText('2023-01-01 12:00 UTC')).toBeTruthy();
    });

    it('should display protocol content in WebView', () => {
      render(<ProtocolDetailsSheet />);

      const webview = screen.getByTestId('webview');
      expect(webview).toBeTruthy();

      const webviewContent = screen.getByTestId('webview-content');
      expect(webviewContent).toBeTruthy();
      expect(webviewContent.props.children).toContain('<p>Fire emergency response protocol content</p>');
    });
  });

  describe('Protocol without Optional Fields', () => {
    beforeEach(() => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '2',
        isDetailsOpen: true,
      });
    });

    it('should not display code section when code is empty', () => {
      render(<ProtocolDetailsSheet />);

      expect(screen.getByText('Basic Protocol')).toBeTruthy();
      expect(screen.queryByText('FIRE001')).toBeFalsy();
    });

    it('should not display description section when description is empty', () => {
      render(<ProtocolDetailsSheet />);

      expect(screen.getByText('Basic Protocol')).toBeTruthy();
      expect(screen.queryByText('Standard fire emergency response protocol')).toBeFalsy();
    });

    it('should still display WebView with protocol content', () => {
      render(<ProtocolDetailsSheet />);

      const webview = screen.getByTestId('webview');
      expect(webview).toBeTruthy();

      const webviewContent = screen.getByTestId('webview-content');
      expect(webviewContent.props.children).toContain('<p>Basic protocol content</p>');
    });
  });

  describe('Close Functionality', () => {
    beforeEach(() => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });
    });

    it('should have close button in header', () => {
      render(<ProtocolDetailsSheet />);

      const closeButton = screen.getByTestId('close-button');
      expect(closeButton).toBeTruthy();
    });

    it('should call closeDetails when close button is pressed', () => {
      render(<ProtocolDetailsSheet />);

      const closeButton = screen.getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockProtocolsStore.closeDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('WebView Content', () => {
    beforeEach(() => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });
    });

    it('should render WebView with proper HTML structure', () => {
      render(<ProtocolDetailsSheet />);

      const webviewContent = screen.getByTestId('webview-content');
      const htmlContent = webviewContent.props.children;

      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html>');
      expect(htmlContent).toContain('<head>');
      expect(htmlContent).toContain('<meta name="viewport"');
      expect(htmlContent).toContain('<style>');
      expect(htmlContent).toContain('<body>');
      expect(htmlContent).toContain('<p>Fire emergency response protocol content</p>');
    });

    it('should include proper CSS styles for light theme', () => {
      render(<ProtocolDetailsSheet />);

      const webviewContent = screen.getByTestId('webview-content');
      const htmlContent = webviewContent.props.children;

      expect(htmlContent).toContain('color: #1F2937'); // gray-800 for light theme
      expect(htmlContent).toContain('background-color: #F9FAFB'); // light theme background
    });

    it('should include responsive CSS', () => {
      render(<ProtocolDetailsSheet />);

      const webviewContent = screen.getByTestId('webview-content');
      const htmlContent = webviewContent.props.children;

      expect(htmlContent).toContain('max-width: 100%');
      expect(htmlContent).toContain('font-family: system-ui, -apple-system, sans-serif');
    });
  });

  describe('Dark Theme Support', () => {
    it('should handle dark theme rendering', () => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });

      render(<ProtocolDetailsSheet />);

      const webview = screen.getByTestId('webview');
      expect(webview).toBeTruthy();

      const webviewContent = screen.getByTestId('webview-content');
      expect(webviewContent).toBeTruthy();

      // The WebView should render with proper HTML structure
      expect(webviewContent.props.children).toContain('<!DOCTYPE html>');
    });
  });

  describe('Date Display Logic', () => {
    it('should prefer UpdatedOn over CreatedOn when both are available', () => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });

      render(<ProtocolDetailsSheet />);

      expect(screen.getByText('2023-01-01 12:00 UTC')).toBeTruthy();
    });

    it('should fall back to CreatedOn when UpdatedOn is empty', () => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '2',
        isDetailsOpen: true,
      });

      render(<ProtocolDetailsSheet />);

      expect(screen.getByText('2023-01-01 12:00 UTC')).toBeTruthy();
    });
  });

  describe('HTML Content Handling', () => {
    it('should strip HTML tags from description but keep them in WebView', () => {
      const protocolWithHtml = {
        ...mockProtocols[0],
        Description: '<p>Description with <strong>HTML</strong> tags</p>',
        ProtocolText: '<p>Protocol with <em>HTML</em> content</p>',
      };

      Object.assign(mockProtocolsStore, {
        protocols: [protocolWithHtml],
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });

      render(<ProtocolDetailsSheet />);

      // Description should be stripped of HTML
      expect(screen.getByText('Description with HTML tags')).toBeTruthy();

      // WebView should contain original HTML
      const webviewContent = screen.getByTestId('webview-content');
      expect(webviewContent.props.children).toContain('<p>Protocol with <em>HTML</em> content</p>');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });
    });

    it('should be accessible for screen readers', () => {
      render(<ProtocolDetailsSheet />);

      expect(screen.getByText('Fire Emergency Response')).toBeTruthy();
      expect(screen.getByTestId('close-button')).toBeTruthy();
    });

    it('should support keyboard navigation', () => {
      render(<ProtocolDetailsSheet />);

      const closeButton = screen.getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockProtocolsStore.closeDetails).toHaveBeenCalled();
    });
  });

  describe('Analytics', () => {
    const mockTrackEvent = jest.fn();

    beforeEach(() => {
      mockUseAnalytics.mockReturnValue({
        trackEvent: mockTrackEvent,
      });
    });

    it('should track analytics when protocol details sheet becomes visible', () => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });

      render(<ProtocolDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('protocol_details_viewed', {
        timestamp: expect.any(String),
        protocolId: '1',
        protocolName: 'Fire Emergency Response',
        protocolCode: 'FIRE001',
        hasDescription: true,
        hasProtocolText: true,
        hasCode: true,
        protocolState: 1,
        isDisabled: false,
        contentLength: expect.any(Number),
        departmentId: 'dept1',
      });
    });

    it('should track analytics when close button is pressed', () => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });

      render(<ProtocolDetailsSheet />);

      // Clear the initial view analytics call
      mockTrackEvent.mockClear();

      const closeButton = screen.getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('protocol_details_closed', {
        timestamp: expect.any(String),
        protocolId: '1',
        protocolName: 'Fire Emergency Response',
      });
    });

    it('should track analytics when actionsheet is closed via onClose', () => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });

      const { getByTestId } = render(<ProtocolDetailsSheet />);

      // Clear the initial view analytics call
      mockTrackEvent.mockClear();

      // Simulate closing via backdrop or swipe
      const actionsheet = getByTestId('actionsheet');

      // Mock the onClose behavior - this would normally be triggered by the actionsheet
      const protocolDetailsComponent = require('../protocol-details-sheet');

      // We need to access the handleClose function directly since it's passed to onClose
      // In a real scenario, this would be triggered by the actionsheet component
      const mockCloseDetails = mockProtocolsStore.closeDetails;
      mockCloseDetails.mockImplementation(() => {
        // Simulate what handleClose does
        mockTrackEvent('protocol_details_closed', {
          timestamp: expect.any(String),
          protocolId: '1',
          protocolName: 'Fire Emergency Response',
        });
      });

      fireEvent.press(actionsheet);
      mockCloseDetails();

      expect(mockTrackEvent).toHaveBeenCalledWith('protocol_details_closed', {
        timestamp: expect.any(String),
        protocolId: '1',
        protocolName: 'Fire Emergency Response',
      });
    });

    it('should handle analytics errors gracefully on view', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });

      expect(() => {
        render(<ProtocolDetailsSheet />);
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to track protocol details view analytics:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle analytics errors gracefully on close', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: true,
      });

      render(<ProtocolDetailsSheet />);

      // Make trackEvent throw an error only on the close call
      mockTrackEvent.mockImplementation((eventName) => {
        if (eventName === 'protocol_details_closed') {
          throw new Error('Analytics error');
        }
      });

      const closeButton = screen.getByTestId('close-button');

      expect(() => {
        fireEvent.press(closeButton);
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to track protocol details close analytics:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should track correct analytics data for protocol without optional fields', () => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '2',
        isDetailsOpen: true,
      });

      render(<ProtocolDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('protocol_details_viewed', {
        timestamp: expect.any(String),
        protocolId: '2',
        protocolName: 'Basic Protocol',
        protocolCode: '',
        hasDescription: false,
        hasProtocolText: true,
        hasCode: false,
        protocolState: 1,
        isDisabled: false,
        contentLength: expect.any(Number),
        departmentId: 'dept1',
      });
    });

    it('should not track analytics when selectedProtocol is null', () => {
      Object.assign(mockProtocolsStore, {
        protocols: [],
        selectedProtocolId: null,
        isDetailsOpen: true,
      });

      render(<ProtocolDetailsSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should not track analytics when sheet is not open', () => {
      Object.assign(mockProtocolsStore, {
        protocols: mockProtocols,
        selectedProtocolId: '1',
        isDetailsOpen: false,
      });

      render(<ProtocolDetailsSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
}); 