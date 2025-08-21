# Map Analytics Implementation

## Overview
This document describes the implementation of analytics tracking for the map page using the `useAnalytics` hook.

## Changes Made

### 1. Map Page Refactoring (`src/app/(app)/map.tsx`)

Added analytics tracking for the following user interactions:

#### View Tracking
- **Event**: `map_viewed`
- **Trigger**: When the map page becomes visible (using `useFocusEffect`)
- **Data**: 
  - `timestamp`: Current ISO timestamp
  - `isMapLocked`: Boolean indicating if map is in locked mode
  - `hasLocation`: Boolean indicating if user location is available

#### Pin Interactions
- **Event**: `map_pin_pressed`
- **Trigger**: When user taps on a map pin
- **Data**:
  - `timestamp`: Current ISO timestamp
  - `pinId`: Unique identifier of the pin
  - `pinTitle`: Display title of the pin
  - `pinType`: Type identifier (1=call, 2=personnel, 3=unit, etc.)

#### Map Navigation
- **Event**: `map_recentered`
- **Trigger**: When user presses the recenter button
- **Data**:
  - `timestamp`: Current ISO timestamp
  - `isMapLocked`: Boolean indicating if map is in locked mode
  - `zoomLevel`: Current zoom level (16 for locked, 12 for unlocked)

#### Call Management
- **Event**: `map_pin_set_as_current_call`
- **Trigger**: When user sets a pin as the current active call
- **Data**:
  - `timestamp`: Current ISO timestamp
  - `pinId`: Unique identifier of the pin
  - `pinTitle`: Display title of the pin
  - `pinType`: Type identifier

### 2. Test Implementation (`src/app/(app)/__tests__/map.test.tsx`)

Added comprehensive test coverage for analytics tracking:

#### Test Categories
1. **View Analytics**: Verifies tracking when map becomes visible
2. **Pin Interaction Analytics**: Tests tracking of pin press events
3. **Recenter Analytics**: Validates tracking of map recenter actions
4. **Call Management Analytics**: Tests tracking of setting pins as current calls
5. **State-based Analytics**: Tests tracking with different location and map lock states

#### Mock Data Enhancement
- Enhanced mock pin data to include all required properties (`Type`, `ImagePath`, etc.)
- Updated analytics hook mocking to properly test tracking function calls

## Benefits

1. **User Behavior Insights**: Track how users interact with the map interface
2. **Feature Usage**: Understand which map features are most used
3. **Performance Monitoring**: Track user experience patterns
4. **Error Tracking**: Identify issues with map interactions

## Integration

The analytics implementation integrates seamlessly with the existing:
- `useAnalytics` hook for consistent tracking
- Aptabase service for data collection
- Error handling and logging systems

## Testing

All tests pass successfully, ensuring:
- Analytics events are tracked correctly
- Proper data is sent with each event
- No breaking changes to existing functionality
- Edge cases are handled (no location, locked/unlocked states)
