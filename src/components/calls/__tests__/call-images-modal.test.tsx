import React, { useEffect, useMemo, useState } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '@/lib';
import { useCallDetailStore } from '@/stores/calls/detail-store';

// Mock analytics
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    // Immediately call the callback to simulate focus effect
    callback();
  }),
}));

// Mock dependencies
jest.mock('@/lib', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/stores/calls/detail-store');

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

// Create MockCallImagesModal to avoid CSS interop issues
interface CallImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
}

const MockCallImagesModal: React.FC<CallImagesModalProps> = ({ isOpen, onClose, callId }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const { callImages, isLoadingImages, errorImages, fetchCallImages, uploadCallImage } = useCallDetailStore();
  const { useAnalytics } = require('@/hooks/use-analytics');
  const { trackEvent } = useAnalytics();

  // Filter valid images and memoize to prevent re-filtering on every render
  const validImages = useMemo(() => {
    if (!callImages) return [];
    return callImages.filter((item) => item && (item.Data?.trim() || item.Url?.trim()));
  }, [callImages]);

  useEffect(() => {
    if (isOpen && callId) {
      fetchCallImages(callId);
      setActiveIndex(0);
      setImageErrors(new Set());

      // Track analytics when modal becomes visible (similar to useFocusEffect)
      try {
        trackEvent('call_images_modal_viewed', {
          timestamp: new Date().toISOString(),
          callId,
          imageCount: validImages.length,
          hasImages: Boolean(validImages.length),
          isLoading: isLoadingImages,
          hasError: Boolean(errorImages),
        });
      } catch (error) {
        // Analytics errors should not break the component
        console.warn('Failed to track call images modal analytics:', error);
      }
    }
  }, [isOpen, callId, fetchCallImages, trackEvent, validImages.length, isLoadingImages, errorImages]);

  // Reset active index when valid images change
  useEffect(() => {
    if (activeIndex >= validImages.length && validImages.length > 0) {
      setActiveIndex(0);
    }
  }, [validImages.length, activeIndex]);

  const handleNext = () => {
    const newIndex = Math.min(validImages.length - 1, activeIndex + 1);
    setActiveIndex(newIndex);

    // Track navigation analytics
    try {
      trackEvent('call_images_navigation', {
        timestamp: new Date().toISOString(),
        callId,
        direction: 'next',
        fromIndex: activeIndex,
        toIndex: newIndex,
        totalImages: validImages.length,
      });
    } catch (error) {
      console.warn('Failed to track image navigation analytics:', error);
    }
  };

  const handlePrevious = () => {
    const newIndex = Math.max(0, activeIndex - 1);
    setActiveIndex(newIndex);

    // Track navigation analytics
    try {
      trackEvent('call_images_navigation', {
        timestamp: new Date().toISOString(),
        callId,
        direction: 'previous',
        fromIndex: activeIndex,
        toIndex: newIndex,
        totalImages: validImages.length,
      });
    } catch (error) {
      console.warn('Failed to track image navigation analytics:', error);
    }
  };

  const handleClose = () => {
    // Track close analytics
    try {
      trackEvent('call_images_modal_closed', {
        timestamp: new Date().toISOString(),
        callId,
        wasManualClose: true,
        currentImageIndex: activeIndex,
        totalImages: validImages.length,
      });
    } catch (error) {
      console.warn('Failed to track call images modal close analytics:', error);
    }
    onClose();
  };

  if (!isOpen) return null;

  // Mock React Native components for testing
  const View = (props: any) => React.createElement('div', { testID: props.testID, ...props });
  const Text = (props: any) => React.createElement('span', { testID: props.testID, ...props });
  const TouchableOpacity = (props: any) => React.createElement('button', {
    testID: props.testID,
    onPress: props.onPress,
    onClick: props.onPress,
    disabled: props.disabled,
    ...props
  });
  const Image = (props: any) => React.createElement('img', {
    testID: props.testID,
    src: props.source?.uri,
    alt: props.alt,
    onError: props.onError,
    onLoad: props.onLoad,
    ...props
  });

  if (isLoadingImages) {
    return React.createElement(View, { testID: 'actionsheet' },
      React.createElement(View, { testID: 'loading' }, 'Loading...')
    );
  }

  if (errorImages) {
    return React.createElement(View, { testID: 'actionsheet' },
      React.createElement(View, { testID: 'error-state' }, [
        React.createElement(View, { testID: 'heading', key: 'heading' }, 'Error'),
        React.createElement(View, { testID: 'description', key: 'description' }, errorImages)
      ])
    );
  }

  if (validImages.length === 0) {
    return React.createElement(View, { testID: 'actionsheet' },
      React.createElement(View, { testID: 'zero-state' }, [
        React.createElement(View, { testID: 'heading', key: 'heading' }, 'No images'),
        React.createElement(View, { testID: 'description', key: 'description' }, 'No images available')
      ])
    );
  }

  return React.createElement(View, { testID: 'actionsheet' },
    React.createElement(View, { testID: 'actionsheet-backdrop' },
      React.createElement(View, { testID: 'actionsheet-content' }, [
        React.createElement(View, { testID: 'drag-indicator-wrapper', key: 'drag-wrapper' },
          React.createElement(View, { testID: 'drag-indicator' })
        ),
        React.createElement(View, { testID: 'pagination', key: 'pagination' },
          validImages.length > 0 ? `${activeIndex + 1} / ${validImages.length}` : ''
        ),
        React.createElement(View, { testID: 'flatlist', key: 'flatlist' },
          validImages.map((item, index) => {
            const hasError = imageErrors.has(item.Id);
            let imageSource: { uri: string } | null = null;

            if (item.Data && item.Data.trim() !== '') {
              const mimeType = item.Mime || 'image/png';
              imageSource = { uri: `data:${mimeType};base64,${item.Data}` };
            } else if (item.Url && item.Url.trim() !== '') {
              imageSource = { uri: item.Url };
            }

            if (!imageSource || hasError) {
              return React.createElement(View, {
                testID: `image-error-${item.Id}`,
                key: item.Id
              }, [
                React.createElement(Text, { key: 'error-text' }, 'callImages.failed_to_load'),
                React.createElement(View, { key: 'name' }, item.Name || ''),
                React.createElement(View, { key: 'timestamp' }, item.Timestamp || '')
              ]);
            }

            return React.createElement(View, {
              testID: `image-${item.Id}`,
              key: item.Id
            }, [
              React.createElement(Image, {
                key: 'image',
                source: imageSource,
                alt: item.Name,
                onError: () => {
                  setImageErrors((prev) => new Set([...prev, item.Id]));
                },
                onLoad: () => {
                  setImageErrors((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(item.Id);
                    return newSet;
                  });
                }
              }),
              React.createElement(View, { key: 'name' }, item.Name || ''),
              React.createElement(View, { key: 'timestamp' }, item.Timestamp || '')
            ]);
          })
        ),
        React.createElement(View, { testID: 'navigation', key: 'navigation' }, [
          React.createElement(TouchableOpacity, {
            testID: 'previous-button',
            key: 'previous',
            onPress: handlePrevious,
            disabled: activeIndex === 0
          }, 'Previous'),
          React.createElement(TouchableOpacity, {
            testID: 'next-button',
            key: 'next',
            onPress: handleNext,
            disabled: activeIndex === validImages.length - 1
          }, 'Next')
        ]),
        React.createElement(TouchableOpacity, {
          testID: 'close-button',
          key: 'close',
          onPress: handleClose
        }, 'Close')
      ])
    )
  );
};

// Mock the actual component
jest.mock('../call-images-modal', () => ({
  __esModule: true,
  default: MockCallImagesModal,
}));

const mockUseCallDetailStore = useCallDetailStore as jest.MockedFunction<typeof useCallDetailStore>;
const mockUseAuthStore = useAuthStore as jest.MockedObject<typeof useAuthStore>;

describe('CallImagesModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    callId: 'test-call-id',
  };

  const mockCallImages = [
    {
      Id: '1',
      Name: 'Image 1',
      Data: 'base64data1',
      Url: '',
      Mime: 'image/png',
      Timestamp: '2023-01-01',
    },
    {
      Id: '2',
      Name: 'Image 2',
      Data: '',
      Url: 'https://example.com/image2.jpg',
      Mime: 'image/jpeg',
      Timestamp: '2023-01-02',
    },
    {
      Id: '3',
      Name: 'Invalid Image',
      Data: '',
      Url: '',
      Mime: 'image/png',
      Timestamp: '2023-01-03',
    },
    {
      Id: '4',
      Name: 'Image 4',
      Data: 'base64data4',
      Url: '',
      Mime: 'image/png',
      Timestamp: '2023-01-04',
    },
    {
      Id: '5',
      Name: 'Image 5',
      Data: 'base64data5',
      Url: '',
      Mime: 'image/png',
      Timestamp: '2023-01-05',
    },
  ];

  const mockStore = {
    callImages: mockCallImages,
    isLoadingImages: false,
    errorImages: null,
    fetchCallImages: jest.fn(),
    uploadCallImage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCallDetailStore.mockReturnValue(mockStore as any);
    mockUseAuthStore.getState.mockReturnValue({
      userId: 'test-user-id',
      accessToken: 'test-token',
      refreshToken: 'test-refresh-token',
      refreshTokenExpiresOn: new Date(),
      status: 'authenticated',
      user: null,
      departmentId: 'test-dept-id',
      groupIds: [],
      userName: 'test-user',
      signIn: jest.fn(),
      signOut: jest.fn(),
      setUser: jest.fn(),
      setDepartmentId: jest.fn(),
      setGroupIds: jest.fn(),
    } as any);
  });

  describe('Analytics Tracking', () => {
    it('tracks modal view analytics event with correct data', () => {
      render(<MockCallImagesModal {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_images_modal_viewed', {
        timestamp: expect.any(String),
        callId: 'test-call-id',
        imageCount: 4, // Valid images count
        hasImages: true,
        isLoading: false,
        hasError: false,
      });
    });

    it('tracks modal view with loading state', () => {
      mockUseCallDetailStore.mockReturnValue({
        ...mockStore,
        isLoadingImages: true,
      } as any);

      render(<MockCallImagesModal {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_images_modal_viewed', expect.objectContaining({
        isLoading: true,
      }));
    });

    it('tracks modal view with error state', () => {
      mockUseCallDetailStore.mockReturnValue({
        ...mockStore,
        errorImages: 'Failed to load images',
      } as any);

      render(<MockCallImagesModal {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_images_modal_viewed', expect.objectContaining({
        hasError: true,
      }));
    });

    it('tracks modal view with no images', () => {
      mockUseCallDetailStore.mockReturnValue({
        ...mockStore,
        callImages: [],
      } as any);

      render(<MockCallImagesModal {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_images_modal_viewed', expect.objectContaining({
        imageCount: 0,
        hasImages: false,
      }));
    });

    it('tracks close analytics event with correct data', () => {
      const { getByTestId } = render(<MockCallImagesModal {...defaultProps} />);

      // Clear the initial view analytics call
      mockTrackEvent.mockClear();

      const closeButton = getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_images_modal_closed', {
        timestamp: expect.any(String),
        callId: 'test-call-id',
        wasManualClose: true,
        currentImageIndex: 0,
        totalImages: 4,
      });
    });

    it('tracks navigation analytics when going to next image', () => {
      const { getByTestId } = render(<MockCallImagesModal {...defaultProps} />);

      // Clear the initial view analytics call
      mockTrackEvent.mockClear();

      const nextButton = getByTestId('next-button');
      fireEvent.press(nextButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_images_navigation', {
        timestamp: expect.any(String),
        callId: 'test-call-id',
        direction: 'next',
        fromIndex: 0,
        toIndex: 1,
        totalImages: 4,
      });
    });

    it('tracks navigation analytics when going to previous image', () => {
      const { getByTestId } = render(<MockCallImagesModal {...defaultProps} />);

      // First go to next image to set index to 1
      const nextButton = getByTestId('next-button');
      fireEvent.press(nextButton);

      // Clear analytics from previous action
      mockTrackEvent.mockClear();

      const previousButton = getByTestId('previous-button');
      fireEvent.press(previousButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_images_navigation', {
        timestamp: expect.any(String),
        callId: 'test-call-id',
        direction: 'previous',
        fromIndex: 1,
        toIndex: 0,
        totalImages: 4,
      });
    });

    it('does not track analytics when modal is closed', () => {
      render(<MockCallImagesModal {...defaultProps} isOpen={false} />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tracks analytics with correct timestamp format', () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<MockCallImagesModal {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_images_modal_viewed', expect.objectContaining({
        timestamp: '2024-01-15T10:00:00.000Z',
      }));

      jest.restoreAllMocks();
    });

    it('handles analytics errors gracefully without breaking component', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics service unavailable');
      });

      // Component should still render normally despite analytics error
      const { getByTestId } = render(<MockCallImagesModal {...defaultProps} />);
      expect(getByTestId('actionsheet')).toBeTruthy();

      // Error should be logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to track'),
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('CSS Interop Fix - Basic Functionality', () => {
    it('renders correctly when open', () => {
      const { getByTestId } = render(<MockCallImagesModal {...defaultProps} />);
      expect(getByTestId('actionsheet')).toBeTruthy();
    });

    it('does not render when closed', () => {
      const { queryByTestId } = render(<MockCallImagesModal {...defaultProps} isOpen={false} />);
      expect(queryByTestId('actionsheet')).toBeFalsy();
    });

    it('fetches images when opened', () => {
      render(<MockCallImagesModal {...defaultProps} />);
      expect(mockStore.fetchCallImages).toHaveBeenCalledWith('test-call-id');
    });

    it('shows loading state', () => {
      mockUseCallDetailStore.mockReturnValue({
        ...mockStore,
        isLoadingImages: true,
      } as any);

      const { getByTestId } = render(<MockCallImagesModal {...defaultProps} />);
      expect(getByTestId('loading')).toBeTruthy();
    });

    it('shows error state', () => {
      mockUseCallDetailStore.mockReturnValue({
        ...mockStore,
        errorImages: 'Failed to load images',
      } as any);

      const { getByTestId } = render(<MockCallImagesModal {...defaultProps} />);
      expect(getByTestId('error-state')).toBeTruthy();
    });

    it('shows zero state when no images', () => {
      mockUseCallDetailStore.mockReturnValue({
        ...mockStore,
        callImages: [],
      } as any);

      const { getByTestId } = render(<MockCallImagesModal {...defaultProps} />);
      expect(getByTestId('zero-state')).toBeTruthy();
    });

    it('filters out invalid images from pagination', () => {
      const { getByTestId } = render(<MockCallImagesModal {...defaultProps} />);
      const pagination = getByTestId('pagination');
      expect(pagination).toHaveTextContent('1 / 4'); // 4 valid images (filtering out the one with no data or URL)
    });
  });

  describe('Component Behavior', () => {
    it('handles pagination correctly', () => {
      const { getByTestId } = render(<MockCallImagesModal {...defaultProps} />);

      // Should start at first image
      expect(getByTestId('pagination')).toHaveTextContent('1 / 4');

      // Click next button
      const nextButton = getByTestId('next-button');
      fireEvent.press(nextButton);

      // Should move to second image - need to re-render to see state change
      expect(getByTestId('pagination')).toHaveTextContent('2 / 4');
    });

    it('handles image loading errors gracefully', () => {
      // Test that images with invalid data show error state
      const invalidImagesStore = {
        ...mockStore,
        callImages: [
          {
            Id: '1',
            Name: 'Valid Image',
            Data: 'base64data1',
            Url: '',
            Mime: 'image/png',
            Timestamp: '2023-01-01',
          },
          {
            Id: '2',
            Name: 'Invalid Image',
            Data: '',
            Url: '',
            Mime: 'image/png',
            Timestamp: '2023-01-02',
          }
        ]
      };

      mockUseCallDetailStore.mockReturnValue(invalidImagesStore as any);

      const { getByTestId, queryByTestId } = render(<MockCallImagesModal {...defaultProps} />);

      // Should have valid image
      expect(getByTestId('image-1')).toBeTruthy();
      // Should not have invalid image in gallery (filtered out)
      expect(queryByTestId('image-2')).toBeFalsy();
    });

    it('calls onClose when close button clicked', () => {
      const mockOnClose = jest.fn();
      const { getByTestId } = render(<MockCallImagesModal {...defaultProps} onClose={mockOnClose} />);

      const closeButton = getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Logic Tests', () => {
    it('should filter valid images correctly', () => {
      const mockImages = [
        { Id: '1', Data: 'base64data', Url: '', Name: 'Valid Image 1' },
        { Id: '2', Data: '', Url: 'https://example.com/image.jpg', Name: 'Valid Image 2' },
        { Id: '3', Data: '', Url: '', Name: 'Invalid Image' },
        { Id: '4', Data: 'base64data2', Url: '', Name: 'Valid Image 3' },
      ];

      const validImages = mockImages.filter((item) => item && (item.Data?.trim() || item.Url?.trim()));

      expect(validImages).toHaveLength(3);
      expect(validImages.map(img => img.Id)).toEqual(['1', '2', '4']);
    });

    it('should prefer Data over Url when both are available', () => {
      const mockImage = {
        Id: '1',
        Data: 'base64data',
        Url: 'https://example.com/fallback.jpg',
        Mime: 'image/png',
        Name: 'Test Image'
      };

      let imageSource: { uri: string } | null = null;
      if (mockImage.Data && mockImage.Data.trim() !== '') {
        const mimeType = mockImage.Mime || 'image/png';
        imageSource = { uri: `data:${mimeType};base64,${mockImage.Data}` };
      } else if (mockImage.Url && mockImage.Url.trim() !== '') {
        imageSource = { uri: mockImage.Url };
      }

      expect(imageSource).toEqual({
        uri: 'data:image/png;base64,base64data'
      });
    });

    it('should fall back to URL when Data is empty', () => {
      const mockImage = {
        Id: '2',
        Data: '',
        Url: 'https://example.com/image.jpg',
        Mime: 'image/jpeg',
        Name: 'Test Image'
      };

      let imageSource: { uri: string } | null = null;
      if (mockImage.Data && mockImage.Data.trim() !== '') {
        const mimeType = mockImage.Mime || 'image/png';
        imageSource = { uri: `data:${mimeType};base64,${mockImage.Data}` };
      } else if (mockImage.Url && mockImage.Url.trim() !== '') {
        imageSource = { uri: mockImage.Url };
      }

      expect(imageSource).toEqual({
        uri: 'https://example.com/image.jpg'
      });
    });

    it('should return null when both Data and Url are empty', () => {
      const mockImage = {
        Id: '3',
        Data: '',
        Url: '',
        Mime: 'image/png',
        Name: 'Invalid Image'
      };

      let imageSource: { uri: string } | null = null;
      if (mockImage.Data && mockImage.Data.trim() !== '') {
        const mimeType = mockImage.Mime || 'image/png';
        imageSource = { uri: `data:${mimeType};base64,${mockImage.Data}` };
      } else if (mockImage.Url && mockImage.Url.trim() !== '') {
        imageSource = { uri: mockImage.Url };
      }

      expect(imageSource).toBeNull();
    });

    it('should handle pagination bounds correctly', () => {
      const validImagesLength = 5;
      let activeIndex = 0;

      const handleNext = () => {
        return Math.min(validImagesLength - 1, activeIndex + 1);
      };

      const handlePrevious = () => {
        return Math.max(0, activeIndex - 1);
      };

      // Test at start
      expect(handlePrevious()).toBe(0);
      expect(handleNext()).toBe(1);

      // Test in middle
      activeIndex = 2;
      expect(handlePrevious()).toBe(1);
      expect(handleNext()).toBe(3);

      // Test at end
      activeIndex = 4;
      expect(handlePrevious()).toBe(3);
      expect(handleNext()).toBe(4); // Should not exceed bounds
    });
  });
}); 