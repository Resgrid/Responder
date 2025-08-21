# Compose Message Sheet Analytics Implementation

## Overview
This document outlines the analytics implementation for the ComposeMessageSheet component, following the established patterns used throughout the Resgrid Responder application.

## Changes Made

### 1. Analytics Hook Integration
- Added `useAnalytics` hook import and usage
- Added `useCallback` and `useEffect` imports for proper analytics tracking
- Added analytics tracking functions with proper error handling

### 2. Analytics Events Implemented

#### View Analytics
- **Event Name**: `compose_message_sheet_viewed`
- **Triggered**: When the compose message sheet becomes visible
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `hasRecipients`: Whether recipients are loaded
  - `recipientCount`: Number of available recipients
  - `hasDispatchUsers`: Whether dispatch users are available
  - `hasDispatchGroups`: Whether dispatch groups are available
  - `hasDispatchRoles`: Whether dispatch roles are available
  - `hasDispatchUnits`: Whether dispatch units are available
  - `userCount`: Number of available users
  - `groupCount`: Number of available groups
  - `roleCount`: Number of available roles
  - `unitCount`: Number of available units
  - `isLoading`: Whether recipients are currently loading
  - `currentMessageType`: Current selected message type (0=Message, 1=Poll, 2=Alert)
  - `currentTab`: Current recipients tab (personnel, groups, roles)

#### Cancel Analytics
- **Event Name**: `compose_message_cancelled`
- **Triggered**: When user closes/cancels the compose sheet
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `hasSubject`: Whether user had entered a subject
  - `hasBody`: Whether user had entered message body
  - `hasRecipients`: Whether user had selected recipients
  - `recipientCount`: Number of selected recipients
  - `messageType`: Current message type when cancelled

#### Send Analytics
- **Event Name**: `compose_message_sent`
- **Triggered**: When message is successfully sent
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `messageType`: Type of message sent
  - `messageTypeLabel`: Human-readable message type
  - `recipientCount`: Number of recipients
  - `hasExpiration`: Whether message has expiration date
  - `subjectLength`: Length of subject text
  - `bodyLength`: Length of message body
  - `personnelCount`: Number of personnel recipients
  - `groupsCount`: Number of group recipients
  - `rolesCount`: Number of role recipients
  - `unitsCount`: Number of unit recipients

#### Send Failed Analytics
- **Event Name**: `compose_message_send_failed`
- **Triggered**: When message sending fails
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `messageType`: Type of message attempted
  - `recipientCount`: Number of recipients
  - `error`: Error message

#### Message Type Change Analytics
- **Event Name**: `compose_message_type_changed`
- **Triggered**: When user changes message type
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `fromType`: Previous message type number
  - `toType`: New message type number
  - `fromTypeLabel`: Previous message type label
  - `toTypeLabel`: New message type label

#### Recipients Selection Analytics
- **Event Name**: `compose_message_recipient_toggled`
- **Triggered**: When user selects/deselects a recipient
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `recipientId`: ID of the recipient
  - `recipientName`: Name of the recipient
  - `recipientType`: Type of recipient (Personnel, Groups, Roles, Unit)
  - `action`: Action performed ('added' or 'removed')
  - `totalSelected`: Total number of selected recipients
  - `currentTab`: Current recipients tab

#### Recipients Tab Change Analytics
- **Event Name**: `compose_message_recipients_tab_changed`
- **Triggered**: When user switches between recipient tabs
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `fromTab`: Previous tab
  - `toTab`: New tab
  - `selectedRecipientsCount`: Number of currently selected recipients

#### Recipients Sheet Opened Analytics
- **Event Name**: `compose_message_recipients_sheet_opened`
- **Triggered**: When user opens the recipients selection sheet
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `currentlySelectedCount`: Number of currently selected recipients
  - `hasDispatchData`: Whether dispatch data is available

### 3. Error Handling
- All analytics calls are wrapped in try-catch blocks
- Analytics errors are logged as warnings and do not break the component functionality
- Uses the same error handling pattern as other modal components in the project

### 4. Component State Management
- Added `trackViewAnalytics` function to calculate message information flags
- Updated action handlers to include analytics tracking
- Uses proper `useCallback` hooks to optimize performance
- Moved early return after hook declarations to comply with React hook rules

## Implementation Pattern
This implementation follows the established analytics patterns used in other modal components:
- `ContactDetailsSheet`
- `MessageDetailsSheet`
- `DispatchSelectionModal`
- `CallNotesModal`
- `BluetoothAudioModal`

The pattern ensures consistency across the application and makes analytics data reliable and comparable between different components.

## Analytics Events Summary
- **8 distinct events** track the complete user journey through the compose message flow
- **Comprehensive data** captured including form state, recipient selections, and interaction outcomes
- **Graceful error handling** ensures analytics failures don't impact user experience
- **Follows established patterns** for consistency with other components
- **Performance optimized** with proper React hooks and memoization

## Files Modified
- `src/components/messages/compose-message-sheet.tsx` - Added analytics tracking
- `src/components/messages/__tests__/compose-message-sheet.test.tsx` - Added comprehensive analytics tests

## Dependencies
- `@/hooks/use-analytics` - Analytics hook for tracking events
- `react` - useCallback, useEffect hooks for proper React patterns

## Testing
Comprehensive unit tests have been created to verify:
- Analytics tracking functionality works correctly
- Error handling prevents analytics failures from breaking the component
- Proper analytics data is collected for different interactions and states
- Component behavior remains intact with analytics implementation

The tests follow the same patterns as other component tests in the application and ensure that the analytics implementation is robust and maintainable.
