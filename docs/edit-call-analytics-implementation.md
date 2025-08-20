# Edit Call Analytics Implementation

## Overview

This document describes the analytics implementation for the Edit Call page (`src/app/call/[id]/edit.tsx`), which tracks user interactions, form submissions, and geocoding operations for business intelligence and user behavior analysis.

## Analytics Events Tracked

### 1. Page View Event
- **Event Name:** `call_edit_viewed`
- **Trigger:** When the page becomes visible/focused using `useFocusEffect`
- **Data Tracked:**
  - `timestamp`: ISO timestamp of view
  - `callId`: ID of the call being edited
  - `priority`: Current priority of the call
  - `type`: Current type of the call
  - `priorityCount`: Number of available call priorities
  - `typeCount`: Number of available call types
  - `hasGoogleMapsKey`: Boolean indicating if Google Maps API key is configured
  - `hasWhat3WordsKey`: Boolean indicating if what3words API key is configured
  - `hasAddress`: Boolean indicating if call has an address
  - `hasCoordinates`: Boolean indicating if call has coordinates
  - `hasContactInfo`: Boolean indicating if call has contact information

### 2. Call Update Events

#### Call Update Attempted
- **Event Name:** `call_update_attempted`
- **Trigger:** When user submits the form to update the call
- **Data Tracked:**
  - `timestamp`: ISO timestamp of attempt
  - `callId`: ID of the call being updated
  - `priority`: Selected priority
  - `type`: Selected call type
  - `hasNote`: Boolean indicating if note is provided
  - `hasAddress`: Boolean indicating if address is provided
  - `hasCoordinates`: Boolean indicating if coordinates are provided
  - `hasWhat3Words`: Boolean indicating if what3words is provided
  - `hasPlusCode`: Boolean indicating if plus code is provided
  - `hasContactName`: Boolean indicating if contact name is provided
  - `hasContactInfo`: Boolean indicating if contact info is provided
  - `dispatchEveryone`: Boolean indicating if dispatching to everyone
  - `dispatchCount`: Total number of dispatch targets selected

#### Call Update Success
- **Event Name:** `call_update_success`
- **Trigger:** When call update completes successfully
- **Data Tracked:**
  - `timestamp`: ISO timestamp of success
  - `callId`: ID of the updated call
  - `priority`: Final priority
  - `type`: Final call type
  - `hasLocation`: Boolean indicating if location coordinates are set
  - `dispatchMethod`: "everyone" or "selective"

#### Call Update Failed
- **Event Name:** `call_update_failed`
- **Trigger:** When call update fails
- **Data Tracked:**
  - `timestamp`: ISO timestamp of failure
  - `callId`: ID of the call
  - `priority`: Attempted priority
  - `type`: Attempted call type
  - `error`: Error message describing the failure

### 3. Location Selection Events

#### Location Selected
- **Event Name:** `call_edit_location_selected`
- **Trigger:** When user selects a location on the map
- **Data Tracked:**
  - `timestamp`: ISO timestamp of selection
  - `callId`: ID of the call
  - `hasAddress`: Boolean indicating if address is included
  - `latitude`: Selected latitude
  - `longitude`: Selected longitude

### 4. Dispatch Selection Events

#### Dispatch Selection Updated
- **Event Name:** `call_edit_dispatch_selection_updated`
- **Trigger:** When user updates dispatch selection
- **Data Tracked:**
  - `timestamp`: ISO timestamp of update
  - `callId`: ID of the call
  - `everyone`: Boolean indicating if "everyone" is selected
  - `userCount`: Number of individual users selected
  - `groupCount`: Number of groups selected
  - `roleCount`: Number of roles selected
  - `unitCount`: Number of units selected
  - `totalSelected`: Total number of targets selected

### 5. Address Search Events

#### Address Search Attempted
- **Event Name:** `call_edit_address_search_attempted`
- **Trigger:** When user initiates address search
- **Data Tracked:**
  - `timestamp`: ISO timestamp of attempt
  - `callId`: ID of the call
  - `hasGoogleMapsKey`: Boolean indicating if Google Maps API key is available

#### Address Search Success
- **Event Name:** `call_edit_address_search_success`
- **Trigger:** When address search returns results
- **Data Tracked:**
  - `timestamp`: ISO timestamp of success
  - `callId`: ID of the call
  - `resultCount`: Number of results returned
  - `hasMultipleResults`: Boolean indicating if multiple results were returned

#### Address Search Failed
- **Event Name:** `call_edit_address_search_failed`
- **Trigger:** When address search fails
- **Data Tracked:**
  - `timestamp`: ISO timestamp of failure
  - `callId`: ID of the call
  - `reason`: Reason for failure ("missing_api_key", "no_results", "network_error")
  - `status`: API response status (when applicable)
  - `error`: Error message (when applicable)

#### Address Selected
- **Event Name:** `call_edit_address_selected`
- **Trigger:** When user selects an address from multiple search results
- **Data Tracked:**
  - `timestamp`: ISO timestamp of selection
  - `callId`: ID of the call
  - `selectedAddress`: The formatted address that was selected

## Implementation Details

### Core Integration
- **Hook Used:** `useAnalytics()` from `@/hooks/use-analytics`
- **Focus Detection:** `useFocusEffect` from `@react-navigation/native`
- **Error Handling:** All analytics calls are wrapped in try-catch blocks to prevent impact on core functionality

### Page View Tracking
```typescript
useFocusEffect(
  useCallback(() => {
    if (!callDataLoading && !callDetailLoading && call && callPriorities.length > 0 && callTypes.length > 0) {
      trackEvent('call_edit_viewed', {
        timestamp: new Date().toISOString(),
        callId: callId || '',
        priority: callPriorities.find((p) => p.Id === call.Priority)?.Name || 'Unknown',
        type: callTypes.find((t) => t.Id === call.Type)?.Name || 'Unknown',
        priorityCount: callPriorities.length,
        typeCount: callTypes.length,
        hasGoogleMapsKey: !!config?.GoogleMapsKey,
        hasWhat3WordsKey: !!config?.W3WKey,
        hasAddress: !!call.Address,
        hasCoordinates: !!(call.Latitude && call.Longitude),
        hasContactInfo: !!(call.ContactName || call.ContactInfo),
      });
    }
  }, [trackEvent, callDataLoading, callDetailLoading, call, callPriorities, callTypes, callId, config?.GoogleMapsKey, config?.W3WKey])
);
```

### Form Submission Tracking
Analytics events are tracked at the beginning of the form submission process (attempted), when the API call succeeds (success), and when it fails (failed).

### Geocoding Analytics
Address search operations track attempts, successes, failures, and address selection from multiple results.

## Test Coverage

### Test Files Created
1. `src/app/call/[id]/__tests__/edit-analytics.test.tsx` - Main analytics functionality tests
2. `src/app/call/[id]/__tests__/edit-analytics-integration.test.ts` - Analytics integration tests
3. `src/app/call/[id]/__tests__/edit-analytics-simple.test.tsx` - Simple analytics tests

### Test Coverage Areas
- ✅ Analytics hook integration
- ✅ Page view tracking with useFocusEffect
- ✅ Form submission analytics (attempted, success, failed)
- ✅ Location selection tracking
- ✅ Dispatch selection analytics
- ✅ Address search analytics (attempted, success, failed)
- ✅ Address selection from multiple results
- ✅ Error handling and graceful degradation
- ✅ Data structure validation
- ✅ Configuration status tracking (API keys)
- ✅ Missing call ID handling

## Usage Examples

### View Tracking
```typescript
// Automatically triggered when screen becomes visible
useFocusEffect(
  useCallback(() => {
    trackEvent('call_edit_viewed', {
      timestamp: new Date().toISOString(),
      callId: callId || '',
      priority: 'High',
      type: 'Fire',
      priorityCount: callPriorities.length,
      typeCount: callTypes.length,
      hasGoogleMapsKey: !!config?.GoogleMapsKey,
      hasWhat3WordsKey: !!config?.W3WKey,
      hasAddress: !!call.Address,
      hasCoordinates: !!(call.Latitude && call.Longitude),
      hasContactInfo: !!(call.ContactName || call.ContactInfo),
    });
  }, [/* dependencies */])
);
```

### Form Submission Tracking
```typescript
// When user attempts to update a call
trackEvent('call_update_attempted', {
  timestamp: new Date().toISOString(),
  callId: callId || '',
  priority: data.priority,
  type: data.type,
  hasNote: !!data.note,
  hasAddress: !!data.address,
  hasCoordinates: !!(data.latitude && data.longitude),
  dispatchEveryone: data.dispatchSelection?.everyone || false,
  dispatchCount: totalDispatchCount,
});
```

### Location Selection Tracking
```typescript
// When user selects a location
trackEvent('call_edit_location_selected', {
  timestamp: new Date().toISOString(),
  callId: callId || '',
  hasAddress: !!location.address,
  latitude: location.latitude,
  longitude: location.longitude,
});
```

### Address Search Tracking
```typescript
// When user searches for an address
trackEvent('call_edit_address_search_attempted', {
  timestamp: new Date().toISOString(),
  callId: callId || '',
  hasGoogleMapsKey: !!config?.GoogleMapsKey,
});

// When search succeeds
trackEvent('call_edit_address_search_success', {
  timestamp: new Date().toISOString(),
  callId: callId || '',
  resultCount: results.length,
  hasMultipleResults: results.length > 1,
});
```

## Technical Implementation Notes

### Focus Detection
- Uses `useFocusEffect` to track when users actually view the page
- Prevents duplicate tracking when component re-renders
- Only tracks when stores are loaded with data

### Data Privacy
- No sensitive personal information is tracked
- Only metadata and interaction patterns captured
- Follows existing analytics privacy patterns

### Performance
- Analytics calls are non-blocking
- Uses `useCallback` for optimized re-renders
- Minimal overhead on component performance

### Error Handling
- Graceful degradation if analytics service fails
- Search failures tracked with specific error context
- No impact on core functionality if analytics fails

### Configuration Awareness
- Tracks availability of required API keys
- Helps identify deployment and configuration issues
- Provides insights into feature availability

## Future Enhancements

1. **Form Field Analytics:** Track individual field completion rates
2. **Time-to-Complete Tracking:** Measure how long form updates take
3. **Session Analytics:** Track multiple edit attempts in same session
4. **Geographic Pattern Analysis:** Analyze location update patterns by region
5. **Priority/Type Change Analysis:** Analyze how call classifications change during edits
6. **Offline Analytics:** Queue events when offline and sync when connected
7. **A/B Testing Support:** For testing different form layouts or features

## Maintenance

- Analytics events follow the established pattern from other screens
- Test coverage ensures reliability of tracking
- Type safety prevents runtime errors
- Follows project's analytics service architecture
- Consistent naming convention with other call-related analytics (prefixed with `call_edit_`)
