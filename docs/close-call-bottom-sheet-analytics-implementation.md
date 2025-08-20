# Close Call Bottom Sheet Analytics Implementation

## Overview
This document outlines the analytics implementation for the `CloseCallBottomSheet` component following the established patterns used throughout the Resgrid Responder mobile application.

## Changes Made

### 1. Analytics Hook Integration
- Added `useAnalytics` hook import and usage
- Added `useFocusEffect` hook for tracking view analytics when modal becomes visible
- Added `useCallback` and `useRef` imports for proper analytics tracking

### 2. Analytics Events Implemented

#### View Analytics
- **Event Name**: `close_call_bottom_sheet_viewed`
- **Triggered**: When the bottom sheet is opened and becomes visible
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `callId`: ID of the call being closed
  - `isLoading`: Loading state of the component

#### Close Type Selection Analytics
- **Event Name**: `close_call_type_selected`
- **Triggered**: When user selects a close call type from the dropdown
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `callId`: ID of the call
  - `closeType`: Selected close type (1-7)
  - `previousType`: Previously selected type (0 if none)

#### Close Attempt Analytics
- **Event Name**: `close_call_attempted`
- **Triggered**: When user submits the form to close the call
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `callId`: ID of the call
  - `closeType`: Selected close type
  - `hasNote`: Whether a note was provided
  - `noteLength`: Length of the note text

#### Close Success Analytics
- **Event Name**: `close_call_succeeded`
- **Triggered**: When the call is successfully closed via API
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `callId`: ID of the call
  - `closeType`: Close type used
  - `hasNote`: Whether a note was provided
  - `noteLength`: Length of the note text

#### Close Failure Analytics
- **Event Name**: `close_call_failed`
- **Triggered**: When the API call to close the call fails
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `callId`: ID of the call
  - `closeType`: Close type attempted
  - `hasNote`: Whether a note was provided
  - `noteLength`: Length of the note text
  - `error`: Error message from the failed API call

#### Manual Close Analytics
- **Event Name**: `close_call_bottom_sheet_closed`
- **Triggered**: When user manually closes the bottom sheet (cancel button)
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `callId`: ID of the call
  - `wasManualClose`: Always true for manual closes
  - `hadCloseCallType`: Whether a close type was selected
  - `hadCloseCallNote`: Whether a note was entered

### 3. Error Handling
- All analytics calls are wrapped in try-catch blocks
- Analytics errors are logged as warnings and do not break the component functionality
- Uses the same error handling pattern as other modal components in the project

### 4. Component State Management
- Added `wasModalOpenRef` to track if modal was actually opened (prevents false close events)
- Added `handleCloseCallTypeChange` callback for tracking close type selection
- Updated form handlers to include analytics tracking

## Testing

### Unit Tests Added
The test suite includes comprehensive analytics testing:

1. **View Analytics Tests**:
   - Tracks view analytics when opened
   - Tracks view analytics with loading state
   - Does not track when modal is closed

2. **Interaction Analytics Tests**:
   - Tracks close type selection
   - Tracks close type changes with previous type
   - Tracks manual close with and without form data

3. **Submit Flow Analytics Tests**:
   - Tracks close attempt with and without note
   - Tracks successful close operations
   - Tracks failed close operations

4. **Error Handling Tests**:
   - Handles analytics errors gracefully
   - Verifies timestamp format correctness

### Test Results
All 28 tests pass successfully, including:
- 16 existing functional tests
- 12 new analytics-specific tests

## Implementation Pattern
This implementation follows the established analytics patterns used in other modal components:
- `CallNotesModal`
- `CallFilesModal`
- `CallImagesModal`
- `AudioStreamBottomSheet`
- `BluetoothAudioModal`

The pattern ensures consistency across the application and makes analytics data reliable and comparable between different components.

## Analytics Events Summary
- **6 distinct events** track the complete user journey through the close call flow
- **Comprehensive data** captured including user selections, timing, and error states
- **Graceful error handling** ensures analytics failures don't impact user experience
- **Follows established patterns** for consistency with other components
