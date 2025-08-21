# Contact Details Sheet Analytics Implementation

## Overview
Added comprehensive analytics tracking to the `ContactDetailsSheet` component to monitor user interactions when viewing contact details and switching between tabs.

## Changes Made

### 1. Analytics Hook Integration
- Added `useAnalytics` hook import and usage
- Added `useCallback` and `useEffect` imports for proper analytics tracking
- Added analytics tracking functions with proper error handling

### 2. Analytics Events Implemented

#### View Analytics
- **Event Name**: `contact_details_sheet_viewed`
- **Triggered**: When the contact details sheet becomes visible
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `contactId`: ID of the contact being viewed
  - `contactType`: Type of contact ('person' or 'company')
  - `hasContactInfo`: Whether contact has phone/email information
  - `hasLocationInfo`: Whether contact has address/location information
  - `hasSocialMedia`: Whether contact has social media/website information
  - `hasDescription`: Whether contact has description/notes
  - `isImportant`: Whether contact is marked as important
  - `activeTab`: Current active tab ('details' or 'notes')

#### Tab Change Analytics
- **Event Name**: `contact_details_tab_changed`
- **Triggered**: When user switches between details and notes tabs
- **Data Tracked**:
  - `timestamp`: ISO string timestamp
  - `contactId`: ID of the contact being viewed
  - `fromTab`: Previous tab ('details' or 'notes')
  - `toTab`: New tab ('details' or 'notes')

### 3. Error Handling
- All analytics calls are wrapped in try-catch blocks
- Analytics errors are logged as warnings and do not break the component functionality
- Uses the same error handling pattern as other modal components in the project

### 4. Component State Management
- Added `trackViewAnalytics` function to calculate contact information flags
- Updated tab change handlers to include analytics tracking
- Uses proper `useCallback` hooks to optimize performance

## Implementation Details

### Analytics Data Classification
The component intelligently analyzes contact data to provide meaningful analytics:

- **Contact Info**: Checks for email, phone numbers (home, cell, office, fax, mobile)
- **Location Info**: Checks for address, city, state, zip, GPS coordinates
- **Social Media**: Checks for website, Twitter, Facebook, LinkedIn, Instagram, Threads, Bluesky, Mastodon
- **Description**: Checks for description, notes, or other information fields

### Error Handling Pattern
```typescript
try {
  trackEvent('event_name', { /* data */ });
} catch (error) {
  console.warn('Failed to track analytics:', error);
}
```

## Testing

### Unit Tests Added
The test suite includes comprehensive analytics testing:

1. **View Analytics Tests**:
   - Tracks view analytics when sheet becomes visible
   - Tracks view analytics for different contact types (person vs company)
   - Tracks view analytics for contacts with minimal information
   - Does not track when sheet is closed
   - Handles analytics errors gracefully

2. **Tab Change Analytics Tests**:
   - Tracks tab changes from details to notes
   - Tracks tab changes from notes to details
   - Handles tab change analytics errors gracefully

3. **Error Handling Tests**:
   - Handles analytics errors gracefully with console.warn
   - Verifies timestamp format correctness
   - Ensures component functionality is not affected by analytics failures

4. **Component Behavior Tests**:
   - Verifies component renders correctly
   - Tests tab switching functionality
   - Tests contact type display logic
   - Tests handling of partial contact information

### Test Results
The tests successfully verify:
- Analytics tracking functionality works correctly
- Error handling prevents analytics failures from breaking the component
- Proper analytics data is collected for different contact types
- Tab change analytics work as expected

## Implementation Pattern
This implementation follows the established analytics patterns used in other modal components:
- `CallNotesModal`
- `DispatchSelectionModal`
- `CallFilesModal`
- `BluetoothAudioModal`

The pattern ensures consistency across the application and makes analytics data reliable and comparable between different components.

## Analytics Events Summary
- **2 distinct events** track the complete user journey through the contact details view
- **Comprehensive data** captured including contact type, information availability, and user interactions
- **Graceful error handling** ensures analytics failures don't impact user experience
- **Follows established patterns** for consistency with other components
- **Performance optimized** with proper React hooks and memoization

## Files Modified
- `src/components/contacts/contact-details-sheet.tsx` - Added analytics tracking
- `src/components/contacts/__tests__/contact-details-sheet.test.tsx` - Added comprehensive analytics tests

## Dependencies
- `@/hooks/use-analytics` - Analytics hook for tracking events
- `react` - useCallback, useEffect hooks for proper React patterns
