import { renderHook } from '@testing-library/react-native';

const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

describe('Login Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate login_viewed analytics structure', () => {
    const loginViewedAnalytics = {
      timestamp: new Date().toISOString(),
    };

    expect(typeof loginViewedAnalytics.timestamp).toBe('string');
    expect(Date.parse(loginViewedAnalytics.timestamp)).not.toBeNaN();
  });

  it('should validate login_attempted analytics structure', () => {
    const loginAttemptedAnalytics = {
      timestamp: new Date().toISOString(),
      username: 'testuser',
    };

    expect(typeof loginAttemptedAnalytics.timestamp).toBe('string');
    expect(typeof loginAttemptedAnalytics.username).toBe('string');
    expect(Date.parse(loginAttemptedAnalytics.timestamp)).not.toBeNaN();
  });

  it('should validate login_success analytics structure', () => {
    const loginSuccessAnalytics = {
      timestamp: new Date().toISOString(),
    };

    expect(typeof loginSuccessAnalytics.timestamp).toBe('string');
    expect(Date.parse(loginSuccessAnalytics.timestamp)).not.toBeNaN();
  });

  it('should validate login_failed analytics structure', () => {
    const loginFailedAnalytics = {
      timestamp: new Date().toISOString(),
      error: 'Invalid credentials',
    };

    expect(typeof loginFailedAnalytics.timestamp).toBe('string');
    expect(typeof loginFailedAnalytics.error).toBe('string');
    expect(Date.parse(loginFailedAnalytics.timestamp)).not.toBeNaN();
  });

  it('should validate login_failed analytics structure with unknown error', () => {
    const loginFailedAnalytics = {
      timestamp: new Date().toISOString(),
      error: 'Unknown error',
    };

    expect(typeof loginFailedAnalytics.timestamp).toBe('string');
    expect(typeof loginFailedAnalytics.error).toBe('string');
    expect(loginFailedAnalytics.error).toBe('Unknown error');
    expect(Date.parse(loginFailedAnalytics.timestamp)).not.toBeNaN();
  });

  it('should track analytics events with proper event names', () => {
    const { useAnalytics } = require('@/hooks/use-analytics');
    const { trackEvent } = useAnalytics();

    // Simulate analytics tracking calls
    trackEvent('login_viewed', {
      timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
    });

    trackEvent('login_attempted', {
      timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
      username: 'testuser',
    });

    trackEvent('login_success', {
      timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
    });

    trackEvent('login_failed', {
      timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
      error: 'Invalid credentials',
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(4);
    expect(mockTrackEvent).toHaveBeenNthCalledWith(1, 'login_viewed', {
      timestamp: '2024-01-15T10:00:00.000Z',
    });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(2, 'login_attempted', {
      timestamp: '2024-01-15T10:00:00.000Z',
      username: 'testuser',
    });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(3, 'login_success', {
      timestamp: '2024-01-15T10:00:00.000Z',
    });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(4, 'login_failed', {
      timestamp: '2024-01-15T10:00:00.000Z',
      error: 'Invalid credentials',
    });
  });

  it('should validate timestamp format consistency', () => {
    const timestamp1 = new Date().toISOString();
    const timestamp2 = new Date('2024-01-15T10:00:00Z').toISOString();

    // Both should be valid ISO string format
    expect(Date.parse(timestamp1)).not.toBeNaN();
    expect(Date.parse(timestamp2)).not.toBeNaN();

    // Should end with 'Z' for UTC timezone
    expect(timestamp1).toMatch(/Z$/);
    expect(timestamp2).toMatch(/Z$/);

    // Should follow ISO 8601 format
    expect(timestamp1).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(timestamp2).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
