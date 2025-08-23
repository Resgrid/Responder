# WebView Security Implementation

## Overview

This document describes the security improvements implemented for the WebView component in `src/components/calendar/calendar-item-details-sheet.tsx` to address XSS vulnerabilities and unauthorized navigation risks.

## Security Vulnerabilities Addressed

### Original Issues

1. **XSS (Cross-Site Scripting)**: Raw HTML content was injected directly into WebView without sanitization
2. **JavaScript Execution**: JavaScript was enabled in WebView (`javaScriptEnabled={true}` by default)
3. **Unrestricted Navigation**: `originWhitelist={['*']}` allowed navigation to any domain
4. **DOM Storage Access**: DOM storage was enabled, allowing potential data persistence attacks
5. **File System Access**: File access was enabled, potentially allowing access to local files
6. **No Content Security Policy**: No CSP headers to restrict resource loading

### Security Enhancements Implemented

#### 1. JavaScript Disabled
```tsx
javaScriptEnabled={false}
```
- Disables JavaScript execution within the WebView
- Prevents script-based XSS attacks
- Eliminates DOM manipulation through injected scripts

#### 2. DOM Storage Disabled
```tsx
domStorageEnabled={false}
```
- Prevents localStorage and sessionStorage access
- Blocks potential data persistence attacks
- Eliminates cross-session data leakage

#### 3. File Access Restrictions
```tsx
allowFileAccess={false}
allowUniversalAccessFromFileURLs={false}
```
- Prevents access to local file system
- Blocks file:// URL schemes
- Eliminates potential local file inclusion attacks

#### 4. Origin Whitelist Restriction
```tsx
originWhitelist={['about:blank']}
```
- Restricts allowed origins to only `about:blank`
- Prevents navigation to external domains
- Blocks potential redirect attacks

#### 5. Navigation Control
```tsx
onShouldStartLoadWithRequest={(request) => {
  return request.url === 'about:blank' || request.url.startsWith('data:');
}}
onNavigationStateChange={(navState) => {
  if (navState.url !== 'about:blank' && !navState.url.startsWith('data:')) {
    return false;
  }
}}
```
- Explicitly controls which URLs can be loaded
- Only allows initial HTML content and data URLs
- Prevents unauthorized navigation attempts

#### 6. Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
```
- Restricts resource loading to prevent external content
- Only allows inline styles for basic formatting
- Blocks all other resource types (scripts, images, fonts, etc.)

#### 7. Safe Base URL
```tsx
source={{
  html: '...',
  baseUrl: 'about:blank',
}}
```
- Uses `about:blank` as base URL for relative links
- Prevents resolution to external domains
- Ensures all navigation stays within the WebView context

## HTML Sanitization

### Sanitizer Utility (`src/utils/html-sanitizer.ts`)

A comprehensive HTML sanitization utility was created to clean potentially dangerous HTML content:

#### Features:
- **Script Tag Removal**: Removes `<script>` tags and their content
- **Iframe Blocking**: Removes `<iframe>` elements
- **Object/Embed Removal**: Blocks `<object>` and `<embed>` tags
- **Form Element Removal**: Removes form-related elements (`<form>`, `<input>`, `<button>`)
- **Event Handler Removal**: Strips JavaScript event handlers (`onclick`, `onload`, etc.)
- **JavaScript URL Blocking**: Removes `javascript:` URLs
- **CSS Expression Prevention**: Blocks CSS expressions that could execute code

#### Usage:
```tsx
import { sanitizeHtml } from '@/utils/html-sanitizer';

// In the WebView HTML
<body>${sanitizeHtml(item.Description)}</body>
```

### Additional Utility Functions

- `htmlToPlainText()`: Strips all HTML tags for plain text display
- `isHtmlSafe()`: Checks if HTML content contains dangerous patterns
- `sanitizeEventForLogging()`: Sanitizes events for logging purposes

## Testing

### Security Test Suite (`src/components/calendar/__tests__/calendar-item-details-sheet.security.test.tsx`)

Comprehensive tests ensure:
- WebView security properties are correctly configured
- Navigation restrictions work as expected
- HTML sanitization prevents XSS attacks
- Error handling for edge cases

### Sanitizer Test Suite (`src/utils/__tests__/html-sanitizer.test.ts`)

Tests cover:
- Removal of dangerous HTML elements
- Event handler stripping
- JavaScript URL blocking
- CSS expression prevention
- Edge case handling

## Best Practices Implemented

1. **Defense in Depth**: Multiple layers of security (sanitization + WebView restrictions)
2. **Least Privilege**: Only minimum necessary permissions granted
3. **Input Validation**: All HTML content sanitized before rendering
4. **Content Security Policy**: Strict CSP headers prevent resource loading
5. **Navigation Control**: Explicit allow-list for navigation
6. **Error Handling**: Graceful degradation for invalid content

## Migration Notes

### For Developers

When working with WebView components in this codebase:

1. **Always sanitize HTML content** using the provided utility functions
2. **Use restrictive security settings** as demonstrated in this implementation
3. **Test with malicious payloads** to ensure XSS prevention
4. **Implement navigation controls** to prevent unwanted redirects
5. **Add CSP headers** to HTML content when possible

### For Content Creators

When creating calendar item descriptions:
- Avoid inline JavaScript or event handlers
- Use standard HTML formatting tags only
- Test content in the sanitized environment
- Report any legitimate content that gets blocked

## Future Considerations

1. **Content Validation**: Consider server-side HTML validation
2. **Allowlist Expansion**: If needed, carefully expand allowed HTML tags/attributes
3. **CSP Enhancement**: Consider stricter CSP policies as requirements evolve
4. **Security Audits**: Regular security reviews of WebView usage
5. **Alternative Rendering**: Consider markdown or other safe markup languages

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [React Native WebView Security](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md#controlling-navigation-state-changes)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
