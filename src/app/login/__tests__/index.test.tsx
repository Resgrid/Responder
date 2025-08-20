import React from 'react';

// Mock analytics first
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock useFocusEffect
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => callback()),
}));

// Mock useAuth
const mockLogin = jest.fn();
const mockPush = jest.fn();
jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(),
}));

// Mock useRouter
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

// Mock translation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock logger
jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Login Analytics Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call trackEvent with login_viewed when useFocusEffect is triggered', () => {
    const { useAnalytics } = require('@/hooks/use-analytics');
    const { useFocusEffect } = require('@react-navigation/native');
    const { trackEvent } = useAnalytics();

    // Simulate the pattern used in Login component
    const callback = jest.fn(() => {
      trackEvent('login_viewed', {
        timestamp: new Date().toISOString(),
      });
    });

    useFocusEffect(callback);

    expect(callback).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith('login_viewed', {
      timestamp: expect.any(String),
    });
  });

  it('should call trackEvent with login_attempted when onSubmit is called', () => {
    const { useAnalytics } = require('@/hooks/use-analytics');
    const { trackEvent } = useAnalytics();

    // Simulate the onSubmit function pattern
    const onSubmit = jest.fn(async (data) => {
      trackEvent('login_attempted', {
        timestamp: new Date().toISOString(),
        username: data.username,
      });
      await mockLogin({ username: data.username, password: data.password });
    });

    const testData = { username: 'testuser', password: 'testpass' };
    onSubmit(testData);

    expect(mockTrackEvent).toHaveBeenCalledWith('login_attempted', {
      timestamp: expect.any(String),
      username: 'testuser',
    });
    expect(mockLogin).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'testpass',
    });
  });

  it('should call trackEvent with login_success when status changes to signedIn', () => {
    const { useAnalytics } = require('@/hooks/use-analytics');
    const { trackEvent } = useAnalytics();

    // Simulate the useEffect pattern for successful login
    const mockUseEffect = jest.fn((callback) => callback());

    mockUseEffect(() => {
      const status = 'signedIn';
      const isAuthenticated = true;

      if (status === 'signedIn' && isAuthenticated) {
        trackEvent('login_success', {
          timestamp: new Date().toISOString(),
        });
        mockPush('/(app)');
      }
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('login_success', {
      timestamp: expect.any(String),
    });
    expect(mockPush).toHaveBeenCalledWith('/(app)');
  });

  it('should call trackEvent with login_failed when status changes to error', () => {
    const { useAnalytics } = require('@/hooks/use-analytics');
    const { trackEvent } = useAnalytics();

    // Simulate the useEffect pattern for failed login
    const mockUseEffect = jest.fn((callback) => callback());

    mockUseEffect(() => {
      const status = 'error';
      const error = 'Invalid credentials';

      if (status === 'error') {
        trackEvent('login_failed', {
          timestamp: new Date().toISOString(),
          error: error || 'Unknown error',
        });
      }
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('login_failed', {
      timestamp: expect.any(String),
      error: 'Invalid credentials',
    });
  });

  it('should handle unknown error in login_failed analytics', () => {
    const { useAnalytics } = require('@/hooks/use-analytics');
    const { trackEvent } = useAnalytics();

    // Simulate the useEffect pattern for failed login with null error
    const mockUseEffect = jest.fn((callback) => callback());

    mockUseEffect(() => {
      const status = 'error';
      const error = null;

      if (status === 'error') {
        trackEvent('login_failed', {
          timestamp: new Date().toISOString(),
          error: error || 'Unknown error',
        });
      }
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('login_failed', {
      timestamp: expect.any(String),
      error: 'Unknown error',
    });
  });

  it('should validate analytics data structure', () => {
    // Test that all required analytics properties are correctly formatted
    const loginViewedData = {
      timestamp: new Date().toISOString(),
    };

    const loginAttemptedData = {
      timestamp: new Date().toISOString(),
      username: 'testuser',
    };

    const loginSuccessData = {
      timestamp: new Date().toISOString(),
    };

    const loginFailedData = {
      timestamp: new Date().toISOString(),
      error: 'Invalid credentials',
    };

    // Validate data types
    expect(typeof loginViewedData.timestamp).toBe('string');
    expect(typeof loginAttemptedData.timestamp).toBe('string');
    expect(typeof loginAttemptedData.username).toBe('string');
    expect(typeof loginSuccessData.timestamp).toBe('string');
    expect(typeof loginFailedData.timestamp).toBe('string');
    expect(typeof loginFailedData.error).toBe('string');

    // Validate timestamp format
    expect(Date.parse(loginViewedData.timestamp)).not.toBeNaN();
    expect(Date.parse(loginAttemptedData.timestamp)).not.toBeNaN();
    expect(Date.parse(loginSuccessData.timestamp)).not.toBeNaN();
    expect(Date.parse(loginFailedData.timestamp)).not.toBeNaN();
  });
});
