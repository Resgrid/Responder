# Splash Screen Logic Enhancement

## Changes Made

This update improves the splash screen hiding logic in `src/app/(app)/_layout.tsx` to provide a better user experience, especially on slower devices.

### Problem
The previous implementation immediately hid the splash screen on any authentication status change, including when the status was still `'idle'`. This could cause the splash to disappear too early, potentially showing blank screens or incomplete content during app initialization.

### Solution
Updated the splash screen hiding logic with the following improvements:

1. **Status-based Hiding**: Only hide the splash screen when the authentication status is settled (`'signedIn'` or `'signedOut'`), not when it's still `'idle'` or `'loading'`.

2. **Debounced Hiding**: Added a 200ms debounce before calling `hideSplash()` to smooth rendering on slow devices and prevent abrupt transitions.

3. **Proper Cleanup**: Ensure the timeout is properly cleared in the useEffect cleanup function to prevent memory leaks.

### Code Changes

**Before:**
```tsx
// Handle splash screen hiding
useEffect(() => {
  hideSplash();
}, [status, hideSplash]);
```

**After:**
```tsx
// Handle splash screen hiding - only hide when auth status is settled
useEffect(() => {
  // Only hide splash when status is settled (not 'idle' or 'loading')
  if (status === 'signedIn' || status === 'signedOut') {
    // Add debounce to smooth rendering on slow devices
    const splashTimeout = setTimeout(() => {
      hideSplash();
    }, 200); // 200ms debounce for optimal performance

    return () => {
      clearTimeout(splashTimeout);
    };
  }
}, [status, hideSplash]);
```

### Benefits

- **Better UX**: Prevents premature splash screen hiding that could expose uninitialized content
- **Smoother Transitions**: 200ms debounce provides smoother visual transitions
- **Device Optimization**: Particularly beneficial for lower-end devices that may take longer to render
- **Memory Safety**: Proper timeout cleanup prevents memory leaks
- **Consistent Behavior**: Ensures splash screen behavior is predictable across different authentication flows

### Technical Details

- **Auth Store Default**: The `useAuthStore` has a default status of `'idle'`, which ensures the gate works correctly
- **Debounce Duration**: 200ms was chosen as an optimal balance between responsiveness and smoothness
- **Cleanup**: The useEffect cleanup function ensures timeouts are cleared when the component unmounts or status changes
- **No Duplication**: The logic remains centralized in the `(app)/_layout.tsx` file, avoiding duplication across nested layouts

This enhancement provides a more polished and reliable splash screen experience while maintaining the existing authentication flow integrity.
