# Messages Analytics Implementation

## Overview
This document describes the implementation of analytics tracking for the messages page using the `useAnalytics` hook.

## Changes Made

### 1. Messages Page Refactoring (`src/app/(app)/messages.tsx`)

Added analytics tracking for the following user interactions:

#### View Tracking
- **`messages_viewed`**: Tracked when the messages screen becomes visible
  - `timestamp`: ISO string of when the view was accessed
  - `currentFilter`: Current filter ('inbox', 'sent', 'all')
  - `messageCount`: Number of messages currently displayed

#### Message Interactions
- **`message_selected`**: Tracked when a user taps on a message to view details
  - `timestamp`: ISO string of interaction
  - `messageId`: Unique identifier of the selected message
  - `messageType`: Type of message (e.g., '0' for normal, '2' for alert)

- **`message_selection_toggled`**: Tracked when a message is selected/deselected in selection mode
  - `timestamp`: ISO string of interaction
  - `messageId`: Unique identifier of the message
  - `isSelected`: Boolean indicating if message is now selected

#### Selection Mode Management
- **`message_selection_mode_entered`**: Tracked when user enters selection mode via long press
  - `timestamp`: ISO string of interaction
  - `messageId`: ID of the first message selected

- **`message_selection_mode_exited`**: Tracked when user exits selection mode
  - `timestamp`: ISO string of interaction

#### Message Management
- **`messages_deleted`**: Tracked when user confirms deletion of selected messages
  - `timestamp`: ISO string of action
  - `messageCount`: Number of messages being deleted
  - `messageIds`: Comma-separated list of message IDs

- **`message_delete_cancelled`**: Tracked when user cancels deletion operation
  - `timestamp`: ISO string of action
  - `messageCount`: Number of messages that would have been deleted

#### Compose Operations
- **`message_compose_opened`**: Tracked when compose sheet is opened
  - `timestamp`: ISO string of action
  - `source`: Source of action ('fab' or 'zero_state')

#### Filter and Search
- **`messages_filter_changed`**: Tracked when user changes message filter
  - `timestamp`: ISO string of action
  - `fromFilter`: Previous filter setting
  - `toFilter`: New filter setting

- **`messages_searched`**: Tracked when user performs a search
  - `timestamp`: ISO string of action
  - `searchLength`: Length of search query
  - `currentFilter`: Current filter when search was performed

#### Data Refresh
- **`messages_refreshed`**: Tracked when user refreshes message list
  - `timestamp`: ISO string of action
  - `currentFilter`: Current filter when refresh was triggered

- **`messages_retry_pressed`**: Tracked when user presses retry after an error
  - `timestamp`: ISO string of action
  - `currentFilter`: Current filter when retry was pressed

### 2. Test Implementation (`src/app/(app)/__tests__/messages.test.tsx`)

Added comprehensive test coverage for analytics tracking:

#### Test Categories
1. **View Analytics**: Verifies tracking when messages screen becomes visible
2. **Message Interaction Analytics**: Tests tracking of message selection and detail view
3. **Compose Analytics**: Validates tracking of compose actions from both FAB and zero state
4. **Search Analytics**: Tests tracking of search operations
5. **Filter Analytics**: Tests tracking of filter changes
6. **Refresh Analytics**: Tests tracking of refresh and retry operations
7. **Selection Mode Analytics**: Tests tracking of selection mode entry and exit
8. **Delete Analytics**: Tests tracking of delete operations and cancellation

#### Mock Enhancements
- Enhanced lucide icon mocks to include testIDs for better test reliability
- Added `onLongPress` support to MessageCard mock
- Added testID to exit selection mode button for easier testing
- Updated analytics hook mocking to properly test tracking function calls

## Benefits

1. **User Behavior Insights**: Track how users interact with messages
2. **Feature Usage**: Understand which message features are most used
3. **Search Patterns**: Analyze how users search and filter messages
4. **Performance Monitoring**: Track refresh patterns and error recovery
5. **Deletion Patterns**: Understand message management behavior

## Integration

The analytics implementation integrates seamlessly with the existing:
- `useAnalytics` hook for consistent tracking
- Aptabase service for data collection
- Error handling and logging systems
- Message store state management

## Testing

All tests pass successfully, ensuring:
- Analytics events are tracked correctly
- Proper data is sent with each event
- No breaking changes to existing functionality
- Edge cases are handled (selection mode, error states, permissions)

The test suite includes 29 total tests with comprehensive coverage of both functionality and analytics tracking.
