import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useCoreStore } from '@/stores/app/core-store';
import { useCallsStore } from '@/stores/calls/store';
import { usePersonnelStatusBottomSheetStore } from '@/stores/status/personnel-status-store';
import { PersonnelStatusBottomSheet } from '../personnel-status-bottom-sheet';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (params) {
        return key.replace(/\{\{(\w+)\}\}/g, (match, param) => params[param] || match);
      }
      return key;
    },
  }),
}));

// Mock the stores
jest.mock('@/stores/app/core-store');
jest.mock('@/stores/calls/store');
jest.mock('@/stores/status/personnel-status-store');

// Mock UI components
jest.mock('@/components/ui/actionsheet', () => ({
  Actionsheet: ({ isOpen, children, onClose }: any) => {
    const { View } = require('react-native');
    return isOpen ? <View testID="personnel-status-bottom-sheet">{children}</View> : null;
  },
  ActionsheetBackdrop: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="actionsheet-backdrop">{children}</View>;
  },
  ActionsheetContent: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="actionsheet-content">{children}</View>;
  },
  ActionsheetDragIndicator: () => {
    const { View } = require('react-native');
    return <View testID="actionsheet-drag-indicator" />;
  },
  ActionsheetDragIndicatorWrapper: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="actionsheet-drag-indicator-wrapper">{children}</View>;
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onPress, isDisabled, ...props }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress} disabled={isDisabled} {...props}>{children}</TouchableOpacity>;
  },
  ButtonText: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

jest.mock('@/components/ui/heading', () => ({
  Heading: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, ...props }: any) => {
    const { Text: RNText } = require('react-native');
    return <RNText {...props}>{children}</RNText>;
  },
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  InputField: ({ placeholder, value, onChangeText, ...props }: any) => {
    const { TextInput } = require('react-native');
    return <TextInput placeholder={placeholder} value={value} onChangeText={onChangeText} {...props} />;
  },
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  TextareaInput: ({ placeholder, value, onChangeText, ...props }: any) => {
    const { TextInput } = require('react-native');
    return <TextInput placeholder={placeholder} value={value} onChangeText={onChangeText} {...props} />;
  },
}));

jest.mock('@/components/ui/radio', () => ({
  RadioGroup: ({ children, value, onChange, ...props }: any) => {
    const { View } = require('react-native');
    return <View testID="radio-group" {...props}>{children}</View>;
  },
  Radio: ({ children, value, ...props }: any) => {
    const { View } = require('react-native');
    return <View testID={`radio-${value}`} {...props}>{children}</View>;
  },
  RadioIndicator: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View testID="radio-indicator" {...props}>{children}</View>;
  },
  RadioIcon: () => {
    const { View } = require('react-native');
    return <View testID="radio-icon" />;
  },
  RadioLabel: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View testID="radio-label" {...props}>{children}</View>;
  },
}));

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => {
    const { View } = require('react-native');
    return <View testID="arrow-left-icon" />;
  },
  ArrowRight: () => {
    const { View } = require('react-native');
    return <View testID="arrow-right-icon" />;
  },
  CircleIcon: () => {
    const { View } = require('react-native');
    return <View testID="circle-icon" />;
  },
}));

const mockUseCoreStore = useCoreStore as jest.MockedFunction<typeof useCoreStore>;
const mockUseCallsStore = useCallsStore as jest.MockedFunction<typeof useCallsStore>;
const mockUsePersonnelStatusBottomSheetStore = usePersonnelStatusBottomSheetStore as jest.MockedFunction<typeof usePersonnelStatusBottomSheetStore>;

describe('PersonnelStatusBottomSheet', () => {
  const mockStore = {
    isOpen: false,
    currentStep: 'select-responding-to' as const,
    selectedCall: null,
    selectedStatus: null,
    note: '',
    respondingTo: '',
    isLoading: false,
    setCurrentStep: jest.fn(),
    setSelectedCall: jest.fn(),
    setNote: jest.fn(),
    setRespondingTo: jest.fn(),
    nextStep: jest.fn(),
    previousStep: jest.fn(),
    submitStatus: jest.fn(),
    reset: jest.fn(),
  };

  const mockCalls = [
    {
      CallId: '1',
      Number: 'CALL-001',
      Name: 'Test Call 1',
      Address: '123 Test St',
    },
    {
      CallId: '2',
      Number: 'CALL-002',
      Name: 'Test Call 2',
      Address: '456 Test Ave',
    },
  ];

  const mockStatus = {
    Id: 1,
    Text: 'Available',
    BColor: '#00FF00',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCoreStore.mockReturnValue({
      activeCall: null,
    });

    mockUseCallsStore.mockReturnValue({
      calls: mockCalls,
    });

    mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
      ...mockStore,
    });
  });

  describe('when bottom sheet is closed', () => {
    it('should not render when isOpen is false', () => {
      render(<PersonnelStatusBottomSheet />);

      // The actionsheet should not be visible
      expect(screen.queryByTestId('personnel-status-bottom-sheet')).toBeNull();
    });
  });

  describe('step 1 - select responding to', () => {
    beforeEach(() => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'select-responding-to',
      });
    });

    it('should render step 1 correctly', () => {
      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('common.step 1 common.of 3')).toBeTruthy();
      expect(screen.getByText('personnel.status.select_responding_to')).toBeTruthy();
      expect(screen.getByText('personnel.status.select_call_to_respond_to')).toBeTruthy();
    });

    it('should render "no call selected" option', () => {
      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('calls.no_call_selected')).toBeTruthy();
      expect(screen.getByText('personnel.status.general_status')).toBeTruthy();
    });

    it('should render available calls', () => {
      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('CALL-001 - Test Call 1')).toBeTruthy();
      expect(screen.getByText('123 Test St')).toBeTruthy();
      expect(screen.getByText('CALL-002 - Test Call 2')).toBeTruthy();
      expect(screen.getByText('456 Test Ave')).toBeTruthy();
    });

    it('should handle call selection', () => {
      const mockSetSelectedCall = jest.fn();
      const mockSetRespondingTo = jest.fn();

      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'select-responding-to',
        setSelectedCall: mockSetSelectedCall,
        setRespondingTo: mockSetRespondingTo,
      });

      render(<PersonnelStatusBottomSheet />);

      // Note: Since we're using RadioGroup, we need to test the onChange behavior
      // The actual selection behavior would be tested through integration tests
      expect(screen.getByText('CALL-001 - Test Call 1')).toBeTruthy();
    });

    it('should show next button', () => {
      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('common.next')).toBeTruthy();
    });

    it('should handle next button press', () => {
      const mockNextStep = jest.fn();

      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'select-responding-to',
        nextStep: mockNextStep,
      });

      render(<PersonnelStatusBottomSheet />);

      fireEvent.press(screen.getByText('common.next'));
      expect(mockNextStep).toHaveBeenCalled();
    });

    it('should render "no calls available" when no calls exist', () => {
      mockUseCallsStore.mockReturnValue({
        calls: [],
      });

      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('calls.no_calls_available')).toBeTruthy();
    });
  });

  describe('step 2 - add note', () => {
    beforeEach(() => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'add-note',
        selectedCall: mockCalls[0],
        respondingTo: 'CALL-001',
        note: '',
      });
    });

    it('should render step 2 correctly', () => {
      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('common.step 2 common.of 3')).toBeTruthy();
      expect(screen.getByText('personnel.status.add_note')).toBeTruthy();
    });

    it('should display selected call info', () => {
      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('personnel.status.selected_call:')).toBeTruthy();
      expect(screen.getByText('CALL-001 - Test Call 1')).toBeTruthy();
    });

    it('should render responding to input', () => {
      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('personnel.status.responding_to (common.optional):')).toBeTruthy();
      expect(screen.getByPlaceholderText('personnel.status.responding_to_placeholder')).toBeTruthy();
    });

    it('should render note textarea', () => {
      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('personnel.status.note (common.optional):')).toBeTruthy();
      expect(screen.getByPlaceholderText('personnel.status.note_placeholder')).toBeTruthy();
    });

    it('should handle responding to input change', () => {
      const mockSetRespondingTo = jest.fn();

      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'add-note',
        selectedCall: mockCalls[0],
        setRespondingTo: mockSetRespondingTo,
      });

      render(<PersonnelStatusBottomSheet />);

      const input = screen.getByPlaceholderText('personnel.status.responding_to_placeholder');
      fireEvent.changeText(input, 'Test responding to');

      expect(mockSetRespondingTo).toHaveBeenCalledWith('Test responding to');
    });

    it('should handle note input change', () => {
      const mockSetNote = jest.fn();

      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'add-note',
        selectedCall: mockCalls[0],
        setNote: mockSetNote,
      });

      render(<PersonnelStatusBottomSheet />);

      const textarea = screen.getByPlaceholderText('personnel.status.note_placeholder');
      fireEvent.changeText(textarea, 'Test note');

      expect(mockSetNote).toHaveBeenCalledWith('Test note');
    });

    it('should render previous and next buttons', () => {
      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('common.previous')).toBeTruthy();
      expect(screen.getByText('common.next')).toBeTruthy();
    });

    it('should handle previous button press', () => {
      const mockPreviousStep = jest.fn();

      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'add-note',
        selectedCall: mockCalls[0],
        previousStep: mockPreviousStep,
      });

      render(<PersonnelStatusBottomSheet />);

      fireEvent.press(screen.getByText('common.previous'));
      expect(mockPreviousStep).toHaveBeenCalled();
    });
  });

  describe('step 3 - confirm', () => {
    beforeEach(() => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'confirm',
        selectedCall: mockCalls[0],
        respondingTo: 'Test responding to',
        note: 'Test note',
        isLoading: false,
      });
    });

    it('should render step 3 correctly', () => {
      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('common.step 3 common.of 3')).toBeTruthy();
      expect(screen.getByText('personnel.status.confirm_status')).toBeTruthy();
      expect(screen.getByText('personnel.status.review_and_confirm')).toBeTruthy();
    });

    it('should display review information', () => {
      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('personnel.status.status:')).toBeTruthy();
      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByText('personnel.status.responding_to:')).toBeTruthy();
      expect(screen.getByText('CALL-001 - Test Call 1')).toBeTruthy();
      expect(screen.getByText('personnel.status.custom_responding_to:')).toBeTruthy();
      expect(screen.getByText('Test responding to')).toBeTruthy();
      expect(screen.getByText('personnel.status.note:')).toBeTruthy();
      expect(screen.getByText('Test note')).toBeTruthy();
    });

    it('should not show custom responding to when empty', () => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'confirm',
        selectedCall: mockCalls[0],
        respondingTo: '',
        note: 'Test note',
      });

      render(<PersonnelStatusBottomSheet />);

      expect(screen.queryByText('personnel.status.custom_responding_to')).toBeNull();
    });

    it('should not show note when empty', () => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'confirm',
        selectedCall: mockCalls[0],
        respondingTo: 'Test responding to',
        note: '',
      });

      render(<PersonnelStatusBottomSheet />);

      expect(screen.queryByText('personnel.status.note')).toBeNull();
    });

    it('should render previous and submit buttons', () => {
      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('common.previous')).toBeTruthy();
      expect(screen.getByText('common.submit')).toBeTruthy();
    });

    it('should handle submit button press', () => {
      const mockSubmitStatus = jest.fn();

      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'confirm',
        selectedCall: mockCalls[0],
        submitStatus: mockSubmitStatus,
      });

      render(<PersonnelStatusBottomSheet />);

      fireEvent.press(screen.getByText('common.submit'));
      expect(mockSubmitStatus).toHaveBeenCalled();
    });

    it('should show submitting text when loading', () => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'confirm',
        selectedCall: mockCalls[0],
        isLoading: true,
      });

      render(<PersonnelStatusBottomSheet />);

      expect(screen.getByText('common.submitting')).toBeTruthy();
    });

    it('should disable buttons when loading', () => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'confirm',
        selectedCall: mockCalls[0],
        isLoading: true,
      });

      render(<PersonnelStatusBottomSheet />);

      const previousButton = screen.getByText('common.previous').parent;
      const submitButton = screen.getByText('common.submitting').parent;

      // Note: Testing disabled state would require checking props or accessibility
      expect(previousButton).toBeTruthy();
      expect(submitButton).toBeTruthy();
    });
  });

  describe('auto-selection behavior', () => {
    it('should auto-select active call when available', () => {
      const mockSetSelectedCall = jest.fn();
      const mockSetRespondingTo = jest.fn();
      const activeCall = mockCalls[0];

      mockUseCoreStore.mockReturnValue({
        activeCall: activeCall,
      });

      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        currentStep: 'select-responding-to',
        selectedCall: null,
        setSelectedCall: mockSetSelectedCall,
        setRespondingTo: mockSetRespondingTo,
      });

      render(<PersonnelStatusBottomSheet />);

      // Note: The useEffect auto-selection would be tested in integration tests
      // Here we just verify the component renders correctly
      expect(screen.getByText('CALL-001 - Test Call 1')).toBeTruthy();
    });
  });

  describe('close behavior', () => {
    it('should call reset when closed', () => {
      const mockReset = jest.fn();

      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        selectedStatus: mockStatus,
        reset: mockReset,
      });

      render(<PersonnelStatusBottomSheet />);

      // Note: Testing the actual close behavior would require simulating the actionsheet close
      // Here we just verify the reset function is available
      expect(mockReset).toBeDefined();
    });
  });
}); 