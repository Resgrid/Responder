# Message Details Sheet Analytics Implementation

## Overview
Added comprehensive analytics tracking to the `MessageDetailsSheet` component to monitor user interactions when viewing message details, responding to messages, and deleting messages.

## Changes Made

### 1. Analytics Hook Integration
- Added `useAnalytics` hook import and usage
- Added `useCallback` and `useEffect` imports for proper analytics tracking
- Added analytics tracking functions with proper error handling

### 2. Analytics Events Implemented

#### View Analytics
- **Event Name**: `message_details_sheet_viewed`
- **Triggered**: When the message details sheet becomes visible
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `messageId`: ID of the message being viewed
  - `messageType`: Numeric type of the message (0=Message, 1=Poll, 2=Alert)
  - `messageTypeLabel`: Human-readable message type label
  - `hasSubject`: Whether message has a subject
  - `hasBody`: Whether message has body content
  - `hasExpiration`: Whether message has an expiration date
  - `isExpired`: Whether message is currently expired
  - `hasRecipients`: Whether message has recipients
  - `recipientCount`: Number of recipients
  - `hasResponsedRecipients`: Whether any recipients have responded
  - `isSystemMessage`: Whether this is a system-generated message
  - `userHasResponded`: Whether the current user has already responded
  - `canRespond`: Whether the user can respond to this message
  - `sendingUserId`: ID of the user who sent the message

#### Response Analytics
- **Event Name**: `message_details_respond_started`
- **Triggered**: When user starts responding to a message
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `messageId`: ID of the message
  - `messageType`: Numeric type of the message
  - `messageTypeLabel`: Human-readable message type label

- **Event Name**: `message_details_respond_cancelled`
- **Triggered**: When user cancels responding to a message
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `messageId`: ID of the message
  - `messageType`: Numeric type of the message
  - `messageTypeLabel`: Human-readable message type label
  - `hadResponse`: Whether user had entered a response text
  - `hadNote`: Whether user had entered a note

- **Event Name**: `message_details_response_sent`
- **Triggered**: When user successfully sends a response
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `messageId`: ID of the message
  - `messageType`: Numeric type of the message
  - `messageTypeLabel`: Human-readable message type label
  - `hasNote`: Whether response included a note
  - `responseLength`: Length of the response text

#### Delete Analytics
- **Event Name**: `message_details_delete_confirmed`
- **Triggered**: When user confirms deletion of a message
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `messageId`: ID of the message
  - `messageType`: Numeric type of the message
  - `messageTypeLabel`: Human-readable message type label

- **Event Name**: `message_details_delete_cancelled`
- **Triggered**: When user cancels deletion of a message
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `messageId`: ID of the message
  - `messageType`: Numeric type of the message

### 3. Error Handling
- All analytics calls are wrapped in try-catch blocks
- Analytics errors are logged as warnings and do not break the component functionality
- Uses the same error handling pattern as other modal components in the project

### 4. Component State Management
- Added `trackViewAnalytics` function to calculate message information flags
- Updated action handlers to include analytics tracking
- Uses proper `useCallback` hooks to optimize performance
- Moved early return after hook declarations to comply with React hook rules

## Implementation Details

### Analytics Data Classification
The component intelligently analyzes message data to provide meaningful analytics:

- **Message Info**: Checks for subject, body, expiration dates
- **Recipients**: Checks for recipient count and response status
- **Response Capabilities**: Determines if user can respond based on message type, expiration, and previous responses
- **System Messages**: Identifies system-generated vs user-generated messages

### Error Handling Pattern
```typescript
try {
  trackEvent('event_name', { /* data */ });
} catch (error) {
  console.warn('Failed to track analytics:', error);
}
```

### Message Type Logic
- **Type 0 (Message)**: Cannot be responded to
- **Type 1 (Poll)**: Can be responded to if not expired and user hasn't responded
- **Type 2 (Alert)**: Can be responded to if not expired and user hasn't responded

## Testing

### Unit Tests Added
The test suite includes comprehensive analytics testing:

1. **View Analytics Tests**:
   - Tracks view analytics when sheet becomes visible
   - Tracks view analytics for different message types
   - Tracks view analytics for messages with minimal information
   - Tracks view analytics for expired messages
   - Does not track when sheet is closed or no message is selected
   - Handles analytics errors gracefully

2. **Response Analytics Tests**:
   - Tracks analytics when starting to respond
   - Tracks analytics when cancelling response (with and without content)
   - Tracks analytics when sending response
   - Handles response analytics errors gracefully

3. **Delete Analytics Tests**:
   - Tracks analytics when confirming delete
   - Tracks analytics when cancelling delete
   - Handles delete analytics errors gracefully

4. **Error Handling Tests**:
   - Handles analytics errors gracefully with console.warn
   - Verifies timestamp format correctness
   - Ensures component functionality is not affected by analytics failures

5. **Component Behavior Tests**:
   - Verifies component renders correctly
   - Tests conditional response button display
   - Tests message type display logic
   - Tests handling of partial message information

### Test Results
The tests successfully verify:
- Analytics tracking functionality works correctly
- Error handling prevents analytics failures from breaking the component
- Proper analytics data is collected for different message types and states
- Response and delete analytics work as expected
- Component behavior remains intact with analytics implementation

## Implementation Pattern
This implementation follows the established analytics patterns used in other modal components:
- `ContactDetailsSheet`
- `CallNotesModal`
- `DispatchSelectionModal`
- `CallFilesModal`
- `BluetoothAudioModal`

The pattern ensures consistency across the application and makes analytics data reliable and comparable between different components.

## Analytics Events Summary
- **5 distinct events** track the complete user journey through the message details view
- **Comprehensive data** captured including message metadata, user capabilities, and interaction outcomes
- **Graceful error handling** ensures analytics failures don't impact user experience
- **Follows established patterns** for consistency with other components
- **Performance optimized** with proper React hooks and memoization

## Files Modified
- `src/components/messages/message-details-sheet.tsx` - Added analytics tracking
- `src/components/messages/__tests__/message-details-sheet.test.tsx` - Added comprehensive analytics tests

## Dependencies
- `@/hooks/use-analytics` - Analytics hook for tracking events
- `react` - useCallback, useEffect hooks for proper React patterns
