# Login Analytics Implementation

## Overview

This document describes the analytics implementation for the Login page (`src/app/login/index.tsx`), which tracks user interactions and login flow events for business intelligence and user behavior analysis.

## Analytics Events Tracked

### 1. Page View Event
- **Event Name:** `login_viewed`
- **Trigger:** When the login page becomes visible (using `useFocusEffect`)
- **Properties:**
  - `timestamp`: ISO string of when the event occurred

### 2. Login Attempt Event
- **Event Name:** `login_attempted`
- **Trigger:** When user submits the login form
- **Properties:**
  - `timestamp`: ISO string of when the event occurred
  - `username`: The username attempted (for analytics purposes)

### 3. Login Success Event
- **Event Name:** `login_success`
- **Trigger:** When login is successful and user is authenticated
- **Properties:**
  - `timestamp`: ISO string of when the event occurred

### 4. Login Failure Event
- **Event Name:** `login_failed`
- **Trigger:** When login fails with an error
- **Properties:**
  - `timestamp`: ISO string of when the event occurred
  - `error`: Error message or "Unknown error" if no specific error

## Implementation Details

### Core Integration
- **Hook Used:** `useAnalytics()` from `@/hooks/use-analytics`
- **Focus Detection:** `useFocusEffect` from `@react-navigation/native`
- **Error Handling:** All analytics calls are wrapped to prevent impact on core functionality

### Page View Tracking
```typescript
useFocusEffect(
  useCallback(() => {
    trackEvent('login_viewed', {
      timestamp: new Date().toISOString(),
    });
  }, [trackEvent])
);
```

### Login Flow Tracking
```typescript
// On login attempt
const onSubmit: LoginFormProps['onSubmit'] = async (data) => {
  trackEvent('login_attempted', {
    timestamp: new Date().toISOString(),
    username: data.username,
  });
  await login({ username: data.username, password: data.password });
};

// On successful login
useEffect(() => {
  if (status === 'signedIn' && isAuthenticated) {
    trackEvent('login_success', {
      timestamp: new Date().toISOString(),
    });
    router.push('/(app)');
  }
}, [status, isAuthenticated, router, trackEvent]);

// On login failure
useEffect(() => {
  if (status === 'error') {
    trackEvent('login_failed', {
      timestamp: new Date().toISOString(),
      error: error || 'Unknown error',
    });
    setIsErrorModalVisible(true);
  }
}, [status, error, trackEvent]);
```

## Usage Examples

### View Tracking
```typescript
// Automatically triggered when screen becomes visible
useFocusEffect(
  useCallback(() => {
    trackEvent('login_viewed', {
      timestamp: new Date().toISOString(),
    });
  }, [trackEvent])
);
```

### Login Attempt Tracking
```typescript
// When user submits login form
trackEvent('login_attempted', {
  timestamp: new Date().toISOString(),
  username: 'user@example.com',
});
```

### Success/Failure Tracking
```typescript
// When login succeeds
trackEvent('login_success', {
  timestamp: new Date().toISOString(),
});

// When login fails
trackEvent('login_failed', {
  timestamp: new Date().toISOString(),
  error: 'Invalid credentials',
});
```

## Test Coverage

### Test Files Created
1. **`index.test.tsx`** - Main component tests with analytics verification
2. **`index-analytics-simple.test.tsx`** - Simple analytics data structure validation
3. **`index-analytics-integration.test.ts`** - Integration tests for analytics flow

### Test Scenarios Covered
- ✅ Analytics tracking on page view
- ✅ Analytics tracking on login attempt
- ✅ Analytics tracking on successful login
- ✅ Analytics tracking on failed login
- ✅ Error handling for unknown errors
- ✅ Data structure validation
- ✅ Event timing and sequence
- ✅ Hook integration verification

### Running Tests
```bash
# Run all login tests
yarn test --testPathPattern="src/app/login/__tests__"

# Run specific test files
yarn test --testPathPattern="src/app/login/__tests__/index.test.tsx"
yarn test --testPathPattern="src/app/login/__tests__/index-analytics-simple.test.tsx"
yarn test --testPathPattern="src/app/login/__tests__/index-analytics-integration.test.ts"
```

## Technical Implementation Notes

### Focus Detection
- Uses `useFocusEffect` to track when users actually view the page
- Prevents duplicate tracking when component re-renders
- Only tracks when the callback is triggered

### Data Privacy
- Username is tracked for analytics purposes (consider privacy implications)
- Error messages are tracked for debugging purposes
- All data follows existing analytics privacy patterns

### Performance
- Analytics calls are non-blocking
- Uses `useCallback` for optimized re-renders
- Minimal overhead on component performance

### Error Handling
- Graceful degradation if analytics service fails
- Login failures tracked with specific error context
- No impact on core functionality if analytics fails

## Business Intelligence Value

### User Behavior Insights
- **Login Frequency:** Track how often users access the login page
- **Login Success Rate:** Monitor authentication success/failure rates
- **Error Patterns:** Identify common login issues and error types
- **User Flow:** Understand the complete login journey

### Operational Metrics
- **Performance Monitoring:** Track login response times through event timing
- **Error Analysis:** Identify and resolve common authentication issues
- **User Experience:** Monitor and improve the login process

### Data-Driven Improvements
- **A/B Testing:** Support for testing different login flows
- **Feature Usage:** Track adoption of login-related features
- **Support Optimization:** Reduce support tickets through error analysis
