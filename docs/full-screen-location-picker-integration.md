# Full Screen Location Picker - Location Store Integration

## Overview

The `FullScreenLocationPicker` component has been enhanced to integrate with the app's location store and location services for better location handling and user experience.

## Key Features

### 1. Location Store Integration
- Automatically uses stored location from `useLocationStore()` when available
- Updates location store when user selects a location on the map
- Maintains consistent location state across the app

### 2. Smart Location Initialization
The component uses a priority-based approach for determining initial location:

1. **Provided initial location** (if valid and not 0,0)
2. **Stored location from location store** (if available and not 0,0)
3. **Current device location** (requested when user taps "Get My Location")

### 3. Location Service Integration
- Uses the app's `locationService` for permission handling
- Consistent permission management across the app
- Timeout handling for location requests

## Usage Example

```tsx
import React, { useState } from 'react';
import FullScreenLocationPicker from '@/components/maps/full-screen-location-picker';
import { useLocationStore } from '@/stores/app/location-store';

const MyComponent = () => {
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const locationStore = useLocationStore();

  const handleLocationSelected = (location) => {
    console.log('Selected location:', location);
    setSelectedLocation(location);
    // Location store is automatically updated by the component
  };

  return (
    <View>
      <Button onPress={() => setShowLocationPicker(true)}>
        Pick Location
      </Button>
      
      {/* Display current stored location */}
      {locationStore.latitude && locationStore.longitude && (
        <Text>
          Current location: {locationStore.latitude}, {locationStore.longitude}
        </Text>
      )}

      {showLocationPicker && (
        <FullScreenLocationPicker
          // Optional: provide initial location
          initialLocation={selectedLocation}
          onLocationSelected={handleLocationSelected}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </View>
  );
};
```

## Component Behavior

### Automatic Location Detection
1. If you provide an `initialLocation`, it will be used
2. If no initial location is provided, the component checks the location store
3. If the stored location is valid (not null and not 0,0), it will be used automatically
4. If no stored location exists, the map shows a default view and the user can tap "Get My Location"

### Location Store Updates
The component automatically updates the location store in two scenarios:
1. When a user taps on the map to select a location
2. When a user confirms their location selection

This ensures that the selected location is available throughout the app via the location store.

### Error Handling
- Graceful handling of permission denials
- Timeout protection for location requests (15 seconds)
- Fallback to manual location selection if automatic detection fails
- Clear error messages when Mapbox is not configured

## Benefits

1. **Improved User Experience**: Users see their current location immediately if it's available
2. **Consistent State Management**: Location state is synchronized across the app
3. **Reduced Location Requests**: Reuses stored location when appropriate
4. **Better Performance**: Avoids unnecessary location API calls
5. **Graceful Degradation**: Falls back to manual selection if automatic detection fails

## Testing

The component includes comprehensive tests covering:
- Location store integration
- Stored location prioritization
- LocationObject creation for store updates
- Error handling scenarios

Run tests with:
```bash
yarn test --testPathPattern=full-screen-location-picker
```

## Dependencies

- `@/stores/app/location-store`: For location state management
- `@/services/location`: For location permissions and services
- `expo-location`: For device location access
- `@rnmapbox/maps`: For map display and interaction