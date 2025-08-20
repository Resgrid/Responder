import { renderHook, act } from '@testing-library/react-native';
import React from 'react';

import { useCallDetailMenu } from '../call-detail-menu';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('@/stores/security/store', () => ({
  useSecurityStore: jest.fn(),
}));

describe('Call Detail Menu Analytics Tests', () => {
  const mockTrackEvent = jest.fn();
  const mockOnEditCall = jest.fn();
  const mockOnCloseCall = jest.fn();

  const { useAnalytics } = require('@/hooks/use-analytics');
  const { useSecurityStore } = require('@/stores/security/store');

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock analytics hook
    useAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    // Default security store mock - user can create calls
    useSecurityStore.mockReturnValue({
      canUserCreateCalls: true,
      getRights: jest.fn(),
      isUserDepartmentAdmin: false,
      isUserGroupAdmin: jest.fn(),
      canUserCreateNotes: false,
      canUserCreateMessages: false,
      canUserViewPII: false,
      departmentCode: 'TEST',
    });
  });

  it('should track analytics when menu is opened', () => {
    const { result } = renderHook(() =>
      useCallDetailMenu({
        onEditCall: mockOnEditCall,
        onCloseCall: mockOnCloseCall,
      })
    );

    // Open the menu
    act(() => {
      result.current.openMenu();
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_menu_viewed', {
      timestamp: expect.any(String),
      canEditCall: true,
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('should not track analytics when menu is closed', () => {
    const { result } = renderHook(() =>
      useCallDetailMenu({
        onEditCall: mockOnEditCall,
        onCloseCall: mockOnCloseCall,
      })
    );

    // Close the menu without opening it first
    act(() => {
      result.current.closeMenu();
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('should track analytics with canEditCall false when user cannot create calls', () => {
    useSecurityStore.mockReturnValue({
      canUserCreateCalls: false,
      getRights: jest.fn(),
      isUserDepartmentAdmin: false,
      isUserGroupAdmin: jest.fn(),
      canUserCreateNotes: false,
      canUserCreateMessages: false,
      canUserViewPII: false,
      departmentCode: 'TEST',
    });

    const { result } = renderHook(() =>
      useCallDetailMenu({
        onEditCall: mockOnEditCall,
        onCloseCall: mockOnCloseCall,
      })
    );

    act(() => {
      result.current.openMenu();
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_menu_viewed', {
      timestamp: expect.any(String),
      canEditCall: false,
    });
  });

  it('should track analytics with canEditCall false when canUserCreateCalls is undefined', () => {
    useSecurityStore.mockReturnValue({
      canUserCreateCalls: undefined,
      getRights: jest.fn(),
      isUserDepartmentAdmin: false,
      isUserGroupAdmin: jest.fn(),
      canUserCreateNotes: false,
      canUserCreateMessages: false,
      canUserViewPII: false,
      departmentCode: 'TEST',
    });

    const { result } = renderHook(() =>
      useCallDetailMenu({
        onEditCall: mockOnEditCall,
        onCloseCall: mockOnCloseCall,
      })
    );

    act(() => {
      result.current.openMenu();
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_menu_viewed', {
      timestamp: expect.any(String),
      canEditCall: false,
    });
  });

  it('should track analytics only once when menu is opened multiple times', () => {
    const { result } = renderHook(() =>
      useCallDetailMenu({
        onEditCall: mockOnEditCall,
        onCloseCall: mockOnCloseCall,
      })
    );

    // Open the menu multiple times
    act(() => {
      result.current.openMenu();
    });
    act(() => {
      result.current.openMenu();
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_menu_viewed', {
      timestamp: expect.any(String),
      canEditCall: true,
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('should track analytics again when menu is reopened after being closed', () => {
    const { result } = renderHook(() =>
      useCallDetailMenu({
        onEditCall: mockOnEditCall,
        onCloseCall: mockOnCloseCall,
      })
    );

    // Open, close, then open again
    act(() => {
      result.current.openMenu();
    });
    act(() => {
      result.current.closeMenu();
    });
    act(() => {
      result.current.openMenu();
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_menu_viewed', {
      timestamp: expect.any(String),
      canEditCall: true,
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('should track correct timestamp format', () => {
    const { result } = renderHook(() =>
      useCallDetailMenu({
        onEditCall: mockOnEditCall,
        onCloseCall: mockOnCloseCall,
      })
    );

    act(() => {
      result.current.openMenu();
    });

    const callArgs = mockTrackEvent.mock.calls[0][1];
    const timestamp = callArgs.timestamp;

    // Verify timestamp is a valid ISO string
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
    expect(typeof timestamp).toBe('string');
  });

  it('should handle analytics errors gracefully', () => {
    // Mock console.warn to suppress the expected warning
    const originalWarn = console.warn;
    console.warn = jest.fn();

    // Mock trackEvent to throw an error
    mockTrackEvent.mockImplementation(() => {
      throw new Error('Analytics error');
    });

    const { result } = renderHook(() =>
      useCallDetailMenu({
        onEditCall: mockOnEditCall,
        onCloseCall: mockOnCloseCall,
      })
    );

    // Should not throw an error when opening menu
    expect(() => {
      act(() => {
        result.current.openMenu();
      });
    }).not.toThrow();

    expect(mockTrackEvent).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('Failed to track call detail menu analytics:', expect.any(Error));

    // Restore original console.warn
    console.warn = originalWarn;
  });
});
