# Onboarding Analytics Implementation

## Overview

This document describes the analytics implementation for the Onboarding page (`src/app/onboarding.tsx`), which tracks user interactions and onboarding flow events for business intelligence and user behavior analysis.

## Analytics Events Tracked

### 1. Page View Event
- **Event Name:** `onboarding_viewed`
- **Trigger:** When the onboarding page becomes visible (using `useFocusEffect`)
- **Properties:**
  - `timestamp`: ISO string of when the event occurred
  - `currentSlide`: Current slide index (0-based)
  - `totalSlides`: Total number of onboarding slides

### 2. Slide Change Event
- **Event Name:** `onboarding_slide_changed`
- **Trigger:** When user scrolls between onboarding slides
- **Properties:**
  - `timestamp`: ISO string of when the event occurred
  - `fromSlide`: Previous slide index
  - `toSlide`: New slide index
  - `slideTitle`: Title of the slide user navigated to

### 3. Next Button Click Event
- **Event Name:** `onboarding_next_clicked`
- **Trigger:** When user clicks the "Next" button
- **Properties:**
  - `timestamp`: ISO string of when the event occurred
  - `currentSlide`: Current slide index when button was clicked
  - `slideTitle`: Title of the current slide

### 4. Skip Button Click Event
- **Event Name:** `onboarding_skip_clicked`
- **Trigger:** When user clicks the "Skip" button
- **Properties:**
  - `timestamp`: ISO string of when the event occurred
  - `currentSlide`: Current slide index when skip was clicked
  - `slideTitle`: Title of the current slide

### 5. Onboarding Completion Event
- **Event Name:** `onboarding_completed`
- **Trigger:** When user completes onboarding by clicking "Let's Get Started"
- **Properties:**
  - `timestamp`: ISO string of when the event occurred
  - `totalSlides`: Total number of onboarding slides
  - `completionMethod`: How the onboarding was completed ("finished" or "skipped")

## Implementation Details

### Core Integration
- **Hook Used:** `useAnalytics()` from `@/hooks/use-analytics`
- **Focus Detection:** `useFocusEffect` from `@react-navigation/native`
- **Error Handling:** All analytics calls are wrapped to prevent impact on core functionality

### Page View Tracking
```typescript
useFocusEffect(
  useCallback(() => {
    trackEvent('onboarding_viewed', {
      timestamp: new Date().toISOString(),
      currentSlide: currentIndex,
      totalSlides: onboardingData.length,
    });
  }, [trackEvent, currentIndex])
);
```

### Slide Change Tracking
```typescript
const handleScroll = (event) => {
  const index = Math.round(event.nativeEvent.contentOffset.x / width);
  const wasLastIndex = currentIndex;
  setCurrentIndex(index);

  // Analytics: Track slide changes
  if (index !== wasLastIndex) {
    trackEvent('onboarding_slide_changed', {
      timestamp: new Date().toISOString(),
      fromSlide: wasLastIndex,
      toSlide: index,
      slideTitle: onboardingData[index]?.title || 'Unknown',
    });
  }
};
```

### User Action Tracking
```typescript
// Next button click
const nextSlide = () => {
  trackEvent('onboarding_next_clicked', {
    timestamp: new Date().toISOString(),
    currentSlide: currentIndex,
    slideTitle: onboardingData[currentIndex]?.title || 'Unknown',
  });
};

// Skip button click
const handleSkip = () => {
  trackEvent('onboarding_skip_clicked', {
    timestamp: new Date().toISOString(),
    currentSlide: currentIndex,
    slideTitle: onboardingData[currentIndex]?.title || 'Unknown',
  });
};

// Completion
const handleCompletion = () => {
  trackEvent('onboarding_completed', {
    timestamp: new Date().toISOString(),
    totalSlides: onboardingData.length,
    completionMethod: 'finished',
  });
};
```

## Usage Examples

### View Tracking
```typescript
// Automatically triggered when screen becomes visible
useFocusEffect(
  useCallback(() => {
    trackEvent('onboarding_viewed', {
      timestamp: new Date().toISOString(),
      currentSlide: 0,
      totalSlides: 3,
    });
  }, [trackEvent])
);
```

### Slide Navigation Tracking
```typescript
// When user scrolls to a new slide
trackEvent('onboarding_slide_changed', {
  timestamp: new Date().toISOString(),
  fromSlide: 0,
  toSlide: 1,
  slideTitle: 'Instant Notifications',
});
```

### User Action Tracking
```typescript
// When user clicks next
trackEvent('onboarding_next_clicked', {
  timestamp: new Date().toISOString(),
  currentSlide: 1,
  slideTitle: 'Instant Notifications',
});

// When user skips onboarding
trackEvent('onboarding_skip_clicked', {
  timestamp: new Date().toISOString(),
  currentSlide: 2,
  slideTitle: 'Interact with Calls',
});

// When user completes onboarding
trackEvent('onboarding_completed', {
  timestamp: new Date().toISOString(),
  totalSlides: 3,
  completionMethod: 'finished',
});
```

## Test Coverage

### Test Files Created
1. **`onboarding.test.tsx`** - Main component tests with analytics verification
2. **`onboarding-analytics-simple.test.tsx`** - Simple analytics data structure validation
3. **`onboarding-analytics-integration.test.ts`** - Integration tests for analytics flow

### Test Scenarios Covered
- ✅ Analytics tracking on page view
- ✅ Analytics tracking on slide changes
- ✅ Analytics tracking on next button clicks
- ✅ Analytics tracking on skip button clicks
- ✅ Analytics tracking on onboarding completion
- ✅ Error handling for unknown slides
- ✅ Data structure validation
- ✅ Event timing and sequence
- ✅ Hook integration verification

### Running Tests
```bash
# Run all onboarding tests
yarn test --testPathPattern="src/app/__tests__/onboarding"

# Run specific test files
yarn test --testPathPattern="src/app/__tests__/onboarding.test.tsx"
yarn test --testPathPattern="src/app/__tests__/onboarding-analytics-simple.test.tsx"
yarn test --testPathPattern="src/app/__tests__/onboarding-analytics-integration.test.ts"
```

## Technical Implementation Notes

### Focus Detection
- Uses `useFocusEffect` to track when users actually view the page
- Prevents duplicate tracking when component re-renders
- Only tracks when the callback is triggered

### Data Privacy
- Slide titles are tracked for analytics purposes
- All data follows existing analytics privacy patterns
- No personally identifiable information is collected

### Performance
- Analytics calls are non-blocking
- Uses `useCallback` for optimized re-renders
- Minimal overhead on component performance

### Error Handling
- Graceful degradation if analytics service fails
- Unknown slide titles handled with fallback values
- No impact on core functionality if analytics fails

## Business Intelligence Value

### User Behavior Insights
- **Onboarding Completion Rate:** Track how many users complete the full onboarding
- **Skip Patterns:** Understand where users typically skip the onboarding
- **Slide Engagement:** Monitor which slides users spend time on vs skip quickly
- **User Flow:** Understand the complete onboarding journey

### Operational Metrics
- **Performance Monitoring:** Track onboarding flow performance
- **Drop-off Analysis:** Identify where users abandon the onboarding process
- **User Experience:** Monitor and improve the onboarding experience

### Data-Driven Improvements
- **A/B Testing:** Support for testing different onboarding flows
- **Content Optimization:** Improve slide content based on engagement metrics
- **User Success:** Correlate onboarding completion with user retention
