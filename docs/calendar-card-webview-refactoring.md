# Calendar Card WebView Refactoring

## Overview
This document describes the refactoring of the `CalendarCard` component to use WebView for rendering the `item.Description` field, ensuring consistent styling with other WebView instances throughout the app.

## Changes Made

### 1. Added WebView Utility (`src/utils/webview-html.ts`)
Created a reusable utility to generate consistent HTML content for WebView components across the app:

- **`generateWebViewHtml`**: Generates HTML with proper theming, responsive design, and security considerations
- **`defaultWebViewProps`**: Provides secure default props for WebView components

**Features:**
- Dark/light theme support
- Responsive design with proper viewport meta tags
- Security-first approach (disabled JavaScript, restricted origins)
- Consistent typography and styling
- Support for various HTML elements (tables, links, code blocks, etc.)

### 2. Refactored CalendarCard Component
Updated `src/components/calendar/calendar-card.tsx` to use WebView for description rendering:

**Changes:**
- Added WebView import and nativewind useColorScheme hook
- Replaced Text component with WebView for description display
- Added proper styling container (Box with rounded background)
- Integrated with the WebView utility for consistent HTML generation
- Maintained compact height (60px) appropriate for card preview

**Security Features:**
- Disabled JavaScript execution
- Restricted to local content only (`about:` origins)
- Proper content sanitization through HTML generation utility

### 3. Updated Tests
Enhanced `src/components/calendar/__tests__/calendar-card.test.tsx`:

- Added WebView and utility mocks
- Updated test assertions to check for WebView component instead of direct text
- Added specific tests for WebView rendering scenarios
- Ensured all existing functionality continues to work

### 4. Added Utility Tests
Created `src/utils/__tests__/webview-html.test.ts`:

- Comprehensive testing of HTML generation utility
- Theme switching verification
- Custom styling options testing
- Security props validation

## Benefits

### 1. Consistent Styling
- All WebView instances now use the same HTML template and styling
- Proper dark/light mode support across all WebViews
- Consistent typography and responsive behavior

### 2. Security
- Standardized security settings prevent potential XSS vulnerabilities
- Disabled JavaScript execution unless explicitly needed
- Restricted origin whitelist for content loading

### 3. Maintainability
- Centralized WebView configuration and styling
- Easy to update styling across all WebView instances
- Consistent approach for future WebView implementations

### 4. Better HTML Rendering
- Proper rendering of rich HTML content in calendar descriptions
- Support for formatting, links, lists, tables, and other HTML elements
- Better text wrapping and responsive behavior

## Usage Examples

### Basic WebView Implementation
```tsx
import WebView from 'react-native-webview';
import { defaultWebViewProps, generateWebViewHtml } from '@/utils/webview-html';

<WebView
  {...defaultWebViewProps}
  source={{
    html: generateWebViewHtml({
      content: htmlContent,
      isDarkMode: colorScheme === 'dark',
    }),
  }}
/>
```

### Custom Styling
```tsx
<WebView
  {...defaultWebViewProps}
  source={{
    html: generateWebViewHtml({
      content: htmlContent,
      isDarkMode: colorScheme === 'dark',
      fontSize: 16,
      lineHeight: 1.6,
      padding: 12,
    }),
  }}
/>
```

## Testing Strategy
- Mocked WebView component for unit tests
- Comprehensive utility function testing
- Integration testing with existing calendar card functionality
- Security props validation

## Compatibility
- Works with both iOS and Android platforms
- Consistent behavior across different screen sizes
- Proper dark/light mode support
- Maintains existing calendar card functionality

## Future Considerations
- Could be extended to support additional HTML features if needed
- Security settings can be adjusted per component if required
- Styling can be customized through utility parameters
- Easy to add analytics or performance monitoring if needed

## Migration Guide
For other components using WebView:

1. Import the utility: `import { defaultWebViewProps, generateWebViewHtml } from '@/utils/webview-html';`
2. Replace custom HTML generation with utility function
3. Use `defaultWebViewProps` spread for consistent security settings
4. Update tests to mock the utility functions
5. Ensure proper theme handling with `useColorScheme`
