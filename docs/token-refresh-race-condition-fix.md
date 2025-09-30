# Token Refresh Race Condition and Memory Leak Fix

## Problem
The original implementation had several critical issues with automatic token refresh:

1. **Race Conditions**: Multiple `setTimeout` timers could be active if login was called multiple times
2. **Memory Leaks**: Timers persisted even after logout/unmount, causing callbacks to execute with stale state
3. **No Cleanup Mechanism**: No way to cancel timers when needed
4. **Lost Timer References**: Timers couldn't be cancelled or tracked

## Solution
Replaced the `setTimeout`-based approach with a timestamp-based token refresh strategy that works proactively in the API interceptor:

### Key Changes

#### 1. Auth Store (`src/stores/auth/store.tsx`)
- **Removed** all `setTimeout` calls for automatic token refresh
- **Added** `isAccessTokenExpiringSoon()` method that checks if token expires within 5 minutes
- **Updated** `shouldRefreshToken()` to use the new expiring soon logic
- **Improved** token expiry checks to be more precise and include buffer time

#### 2. API Client (`src/api/common/client.tsx`)
- **Enhanced Request Interceptor**: Proactively checks if access token is expiring soon before making API calls
- **Improved Response Interceptor**: Better error handling that distinguishes between transient and permanent refresh failures
- **Added Transient Error Detection**: Network errors (503, 502, 504, 429) don't trigger logout, allowing retry
- **Enhanced Refresh Token Expiry Checks**: Validates refresh token before attempting refresh

#### 3. Error Handling Strategy
```typescript
// Transient errors (don't logout):
- 429 (Rate Limited)
- 503 (Service Unavailable) 
- 502 (Bad Gateway)
- 504 (Gateway Timeout)
- Network errors (no status)

// Permanent errors (logout immediately):
- 400 (Bad Request - invalid refresh token)
- 401 (Unauthorized)
- 403 (Forbidden)
- Other HTTP errors with status codes
```

### Benefits

1. **No Race Conditions**: Only one refresh attempt per API call, coordinated through the `isRefreshing` flag
2. **No Memory Leaks**: No timers or callbacks that can persist after component unmount
3. **Proactive Refresh**: Tokens are refreshed before they expire, preventing API failures
4. **Better User Experience**: Distinguishes between temporary network issues and permanent auth failures
5. **Automatic Cleanup**: No manual timer management required
6. **Timestamp-Based**: Uses actual token age vs. expiry time for accurate determination

### Flow

1. **API Request**: User makes an API call
2. **Request Interceptor**: Checks if access token is expiring soon (within 5 minutes)
3. **Proactive Refresh**: If expiring, refresh token before making the actual request
4. **Request Continues**: API call proceeds with fresh or existing token
5. **Response Interceptor**: Handles 401 errors as backup if refresh failed or wasn't triggered
6. **Error Classification**: Determines if refresh failure is transient or permanent
7. **Smart Logout**: Only logs out for permanent failures, retains session for transient issues

### Testing
- Added comprehensive test suite for new token refresh behavior
- Tests cover both request and response interceptor scenarios
- Validates transient vs permanent error handling
- Ensures proper logout behavior and token management

### Migration Notes
- No breaking changes to public API
- Existing auth flows continue to work
- Automatic token refresh now happens transparently during API calls
- More resilient to network issues and temporary service disruptions

This implementation eliminates the timer-based approach entirely, making the token refresh system more reliable, predictable, and resource-efficient.