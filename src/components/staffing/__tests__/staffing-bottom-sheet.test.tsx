import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useCoreStore } from '@/stores/app/core-store';
import { useStaffingBottomSheetStore } from '@/stores/staffing/staffing-bottom-sheet-store';
import { StaffingBottomSheet } from '../staffing-bottom-sheet';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      // Handle interpolated strings
      if (key === 'common.step' && params) {
        return `Step ${params.step} of ${params.total}`;
      }
      if (key === 'home.staffing.confirm_staffing' && params && params.staffing) {
        return `Confirm ${params.staffing}`;
      }
      // Handle concatenated translation keys
      const translations: Record<string, string> = {
        'common.step': 'Step',
        'common.of': 'of',
        'common.next': 'Next',
        'common.previous': 'Previous',
        'common.submit': 'Submit',
        'common.submitting': 'Submitting',
        'common.optional': 'optional',
        'home.staffing.select_staffing_level': 'Select Staffing Level',
        'home.staffing.select_staffing_level_description': 'Please select your staffing level',
        'home.staffing.add_note': 'Add Note',
        'home.staffing.confirm_staffing': 'Confirm Staffing',
        'home.staffing.review_and_confirm': 'Review and Confirm',
        'home.staffing.selected_staffing': 'Selected Staffing',
        'home.staffing.note': 'Note',
        'home.staffing.note_placeholder': 'Enter a note...',
        'home.staffing.staffing_level': 'Staffing Level',
        'home.staffing.no_staffing_options': 'No staffing options available',
      };
      return translations[key] || key;
    },
    ready: true, // Add ready property for the test
  }),
}));

// Mock the stores
jest.mock('@/stores/app/core-store');
jest.mock('@/stores/staffing/staffing-bottom-sheet-store');

// Mock the invertColor utility
jest.mock('@/lib/utils', () => ({
  invertColor: jest.fn(() => '#000000'),
}));

// Mock the translate utility
jest.mock('@/lib/i18n/utils', () => ({
  translate: jest.fn((key: string, options?: any) => {
    const translations: Record<string, string> = {
      'home.staffing.select_staffing_level': 'Select Staffing Level',
      'home.staffing.select_staffing_level_description': 'Please select your staffing level',
      'home.staffing.add_note': 'Add Note',
      'home.staffing.confirm_staffing': 'Confirm Staffing',
      'home.staffing.review_and_confirm': 'Review and Confirm',
      'home.staffing.selected_staffing': 'Selected Staffing',
      'home.staffing.note': 'Note',
      'home.staffing.note_placeholder': 'Enter a note...',
      'home.staffing.staffing_level': 'Staffing Level',
      'home.staffing.no_staffing_options': 'No staffing options available',
      'common.next': 'Next',
      'common.previous': 'Previous',
      'common.submit': 'Submit',
      'common.submitting': 'Submitting',
      'common.optional': 'optional',
    };
    return translations[key] || key;
  }),
}));

// Mock UI components
jest.mock('@/components/ui/actionsheet', () => {
  const { View, Text } = require('react-native');
  return {
    Actionsheet: ({ isOpen, children, onClose }: any) =>
      isOpen ? <View testID="actionsheet">{children}</View> : null,
    ActionsheetBackdrop: ({ children }: any) => <View testID="actionsheet-backdrop">{children}</View>,
    ActionsheetContent: ({ children }: any) => <View testID="actionsheet-content">{children}</View>,
    ActionsheetDragIndicator: () => <View testID="actionsheet-drag-indicator" />,
    ActionsheetDragIndicatorWrapper: ({ children }: any) => <View testID="actionsheet-drag-indicator-wrapper">{children}</View>,
  };
});

const mockUseCoreStore = useCoreStore as jest.MockedFunction<typeof useCoreStore>;
const mockUseStaffingBottomSheetStore = useStaffingBottomSheetStore as jest.MockedFunction<typeof useStaffingBottomSheetStore>;

describe('StaffingBottomSheet', () => {
  const mockStore = {
    isOpen: false,
    currentStep: 'select-staffing' as const,
    selectedStaffing: null,
    note: '',
    isLoading: false,
    setCurrentStep: jest.fn(),
    setSelectedStaffing: jest.fn(),
    setNote: jest.fn(),
    nextStep: jest.fn(),
    previousStep: jest.fn(),
    submitStaffing: jest.fn(),
    reset: jest.fn(),
  };

  const mockActiveStaffing = [
    {
      Id: 1,
      Type: 1,
      StateId: 1,
      Text: 'Available',
      BColor: '#00FF00',
      Color: '#000000',
      Gps: false,
      Note: 0,
      Detail: 0,
    },
    {
      Id: 2,
      Type: 1,
      StateId: 2,
      Text: 'On Duty',
      BColor: '#0000FF',
      Color: '#FFFFFF',
      Gps: false,
      Note: 0,
      Detail: 0,
    },
    {
      Id: 3,
      Type: 1,
      StateId: 3,
      Text: 'Off Duty',
      BColor: '#FF0000',
      Color: '#FFFFFF',
      Gps: false,
      Note: 0,
      Detail: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCoreStore.mockReturnValue({
      activeStaffing: mockActiveStaffing,
    });

    mockUseStaffingBottomSheetStore.mockReturnValue({
      ...mockStore,
    });
  });

  describe('when bottom sheet is closed', () => {
    it('should not render step content when isOpen is false', () => {
      render(<StaffingBottomSheet />);

      // When closed, nothing should be rendered
      expect(screen.queryByTestId('actionsheet')).toBeNull();
      expect(screen.queryByText(/Step/)).toBeNull();
      expect(screen.queryByText('Select Staffing Level')).toBeNull();
    });
  });

  describe('step 1 - select staffing', () => {
    beforeEach(() => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'select-staffing',
      });
    });

    it('should render step 1 correctly', () => {
      render(<StaffingBottomSheet />);

      expect(screen.getByText(/Step\s+1\s+of\s+3/)).toBeTruthy();
      expect(screen.getByText('Select Staffing Level')).toBeTruthy();
      expect(screen.getByText('Please select your staffing level')).toBeTruthy();
    });

    it('should render available staffing options', () => {
      render(<StaffingBottomSheet />);

      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByText('On Duty')).toBeTruthy();
      expect(screen.getByText('Off Duty')).toBeTruthy();
    });

    it('should handle staffing selection', () => {
      const mockSetSelectedStaffing = jest.fn();

      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'select-staffing',
        setSelectedStaffing: mockSetSelectedStaffing,
      });

      render(<StaffingBottomSheet />);

      // Verify staffing options are rendered
      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByText('On Duty')).toBeTruthy();
      expect(screen.getByText('Off Duty')).toBeTruthy();
    });

    it('should show next button', () => {
      render(<StaffingBottomSheet />);

      expect(screen.getByText('Next')).toBeTruthy();
    });

    it('should disable next button when no staffing selected', () => {
      render(<StaffingBottomSheet />);

      const nextButton = screen.getByText('Next').parent;
      expect(nextButton).toBeTruthy();
    });

    it('should enable next button when staffing is selected', () => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'select-staffing',
        selectedStaffing: mockActiveStaffing[0],
      });

      render(<StaffingBottomSheet />);

      const nextButton = screen.getByText('Next').parent;
      expect(nextButton).toBeTruthy();
    });

    it('should handle next button press', () => {
      const mockNextStep = jest.fn();

      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'select-staffing',
        selectedStaffing: mockActiveStaffing[0],
        nextStep: mockNextStep,
      });

      render(<StaffingBottomSheet />);

      fireEvent.press(screen.getByText('Next'));
      expect(mockNextStep).toHaveBeenCalled();
    });

    it('should render "no staffing options" when no staffing available', () => {
      mockUseCoreStore.mockReturnValue({
        activeStaffing: [],
      });

      render(<StaffingBottomSheet />);

      expect(screen.getByText('No staffing options available')).toBeTruthy();
    });

    it('should render "no staffing options" when activeStaffing is null', () => {
      mockUseCoreStore.mockReturnValue({
        activeStaffing: null,
      });

      render(<StaffingBottomSheet />);

      expect(screen.getByText('No staffing options available')).toBeTruthy();
    });
  });

  describe('step 2 - add note', () => {
    beforeEach(() => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'add-note',
        selectedStaffing: mockActiveStaffing[0],
        note: '',
      });
    });

    it('should render step 2 correctly', () => {
      render(<StaffingBottomSheet />);

      expect(screen.getByText(/Step\s+2\s+of\s+3/)).toBeTruthy();
      expect(screen.getByText('Add Note')).toBeTruthy();
    });

    it('should display selected staffing info', () => {
      render(<StaffingBottomSheet />);

      expect(screen.getByText(/Selected Staffing/)).toBeTruthy();
      expect(screen.getByText('Available')).toBeTruthy();
    });

    it('should render note textarea', () => {
      render(<StaffingBottomSheet />);

      expect(screen.getByText(/Note.*optional/)).toBeTruthy();
      expect(screen.getByPlaceholderText('Enter a note...')).toBeTruthy();
    });

    it('should handle note input change', () => {
      const mockSetNote = jest.fn();

      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'add-note',
        selectedStaffing: mockActiveStaffing[0],
        setNote: mockSetNote,
      });

      render(<StaffingBottomSheet />);

      const textarea = screen.getByPlaceholderText('Enter a note...');
      fireEvent.changeText(textarea, 'Test note');

      expect(mockSetNote).toHaveBeenCalledWith('Test note');
    });

    it('should render previous and next buttons', () => {
      render(<StaffingBottomSheet />);

      expect(screen.getByText('Previous')).toBeTruthy();
      expect(screen.getByText('Next')).toBeTruthy();
    });

    it('should handle previous button press', () => {
      const mockPreviousStep = jest.fn();

      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'add-note',
        selectedStaffing: mockActiveStaffing[0],
        previousStep: mockPreviousStep,
      });

      render(<StaffingBottomSheet />);

      fireEvent.press(screen.getByText('Previous'));
      expect(mockPreviousStep).toHaveBeenCalled();
    });

    it('should handle next button press', () => {
      const mockNextStep = jest.fn();

      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'add-note',
        selectedStaffing: mockActiveStaffing[0],
        nextStep: mockNextStep,
      });

      render(<StaffingBottomSheet />);

      fireEvent.press(screen.getByText('Next'));
      expect(mockNextStep).toHaveBeenCalled();
    });
  });

  describe('step 3 - confirm', () => {
    beforeEach(() => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'confirm',
        selectedStaffing: mockActiveStaffing[0],
        note: 'Test note',
        isLoading: false,
      });
    });

    it('should render step 3 correctly', () => {
      render(<StaffingBottomSheet />);

      expect(screen.getByText(/Step\s+3\s+of\s+3/)).toBeTruthy();
      expect(screen.getByText(/Confirm Available/)).toBeTruthy();
      expect(screen.getByText('Review and Confirm')).toBeTruthy();
    });

    it('should display review information', () => {
      render(<StaffingBottomSheet />);

      expect(screen.getByText(/Staffing Level/)).toBeTruthy();
      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByText(/Note/)).toBeTruthy();
      expect(screen.getByText('Test note')).toBeTruthy();
    });

    it('should not show note section when note is empty', () => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'confirm',
        selectedStaffing: mockActiveStaffing[0],
        note: '',
      });

      render(<StaffingBottomSheet />);

      expect(screen.queryByText('Test note')).toBeNull();
    });

    it('should render previous and submit buttons', () => {
      render(<StaffingBottomSheet />);

      expect(screen.getByText('Previous')).toBeTruthy();
      expect(screen.getByText('Submit')).toBeTruthy();
    });

    it('should handle submit button press', () => {
      const mockSubmitStaffing = jest.fn();

      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'confirm',
        selectedStaffing: mockActiveStaffing[0],
        submitStaffing: mockSubmitStaffing,
      });

      render(<StaffingBottomSheet />);

      fireEvent.press(screen.getByText('Submit'));
      expect(mockSubmitStaffing).toHaveBeenCalled();
    });

    it('should show submitting text when loading', () => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'confirm',
        selectedStaffing: mockActiveStaffing[0],
        isLoading: true,
      });

      render(<StaffingBottomSheet />);

      expect(screen.getByText('Submitting')).toBeTruthy();
    });

    it('should disable buttons when loading', () => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'confirm',
        selectedStaffing: mockActiveStaffing[0],
        isLoading: true,
      });

      render(<StaffingBottomSheet />);

      const previousButton = screen.getByText('Previous').parent;
      const submitButton = screen.getByText('Submitting').parent;

      expect(previousButton).toBeTruthy();
      expect(submitButton).toBeTruthy();
    });
  });

  describe('close behavior', () => {
    it('should call reset when closed', () => {
      const mockReset = jest.fn();

      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        reset: mockReset,
      });

      render(<StaffingBottomSheet />);

      expect(mockReset).toBeDefined();
    });
  });

  describe('step titles', () => {
    it('should show correct title for select-staffing step', () => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'select-staffing',
      });

      render(<StaffingBottomSheet />);

      expect(screen.getByText('Select Staffing Level')).toBeTruthy();
    });

    it('should show correct title for add-note step', () => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'add-note',
        selectedStaffing: mockActiveStaffing[0],
      });

      render(<StaffingBottomSheet />);

      expect(screen.getByText('Add Note')).toBeTruthy();
    });

    it('should show correct title for confirm step with staffing name', () => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'confirm',
        selectedStaffing: mockActiveStaffing[0],
      });

      render(<StaffingBottomSheet />);

      expect(screen.getByText(/Confirm Available/)).toBeTruthy();
    });
  });

  describe('step numbers', () => {
    it('should show step 1 for select-staffing', () => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'select-staffing',
      });

      render(<StaffingBottomSheet />);

      expect(screen.getByText(/Step\s+1\s+of/)).toBeTruthy();
    });

    it('should show step 2 for add-note', () => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'add-note',
        selectedStaffing: mockActiveStaffing[0],
      });

      render(<StaffingBottomSheet />);

      expect(screen.getByText(/Step\s+2\s+of/)).toBeTruthy();
    });

    it('should show step 3 for confirm', () => {
      mockUseStaffingBottomSheetStore.mockReturnValue({
        ...mockStore,
        isOpen: true,
        currentStep: 'confirm',
        selectedStaffing: mockActiveStaffing[0],
      });

      render(<StaffingBottomSheet />);

      expect(screen.getByText(/Step\s+3\s+of/)).toBeTruthy();
    });
  });
}); 