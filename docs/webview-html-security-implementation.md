# WebView HTML Security Implementation

## Overview

This document describes the security improvements implemented in the `webview-html.ts` utility to prevent XSS attacks and other security vulnerabilities when rendering HTML content in WebView components.

## Security Vulnerability

The original implementation directly embedded user-supplied content into generated HTML without sanitization:

```typescript
// VULNERABLE: Direct interpolation of content
<body>${content}</body>
```

This allowed for several attack vectors:
- **Script injection**: `<script>alert('XSS')</script>`
- **iframe embedding**: `<iframe src="https://evil.com"></iframe>`
- **Meta refresh attacks**: `<meta http-equiv="refresh" content="0;url=https://evil.com">`
- **Event handler attributes**: `<img onclick="alert('XSS')" src="x">`
- **Data URIs**: `<img src="data:text/html,<script>alert('XSS')</script>">`
- **JavaScript URIs**: `<a href="javascript:alert('XSS')">Click me</a>`

## Security Solution

### 1. Added HTML Sanitization

Implemented the `sanitizeHtmlContent()` function using the `sanitize-html` library with a strict allowlist approach:

```typescript
export const sanitizeHtmlContent = (html: string): string => {
  return sanitizeHtml(html, {
    // Comprehensive security configuration
  });
};
```

### 2. Security Configuration

#### Allowed Tags
Only safe, commonly used HTML elements are permitted:
- Text elements: `p`, `div`, `span`, `br`, `hr`
- Headers: `h1` through `h6`
- Formatting: `strong`, `b`, `em`, `i`, `u`, `s`, `small`, `sub`, `sup`
- Lists: `ul`, `ol`, `li`
- Other: `blockquote`, `pre`, `code`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `a`, `img`, `dl`, `dt`, `dd`

#### Blocked Tags
Dangerous elements are completely removed:
- `<script>` - JavaScript execution
- `<iframe>` - Embedded content
- `<object>`, `<embed>` - Plugin content
- `<meta>` with refresh - Redirects

#### Allowed Attributes
Strict allowlist per tag:
- Links (`a`): `href`, `title`
- Images (`img`): `src`, `alt`, `title`, `width`, `height`
- Tables (`table`, `th`, `td`): Basic table attributes
- All elements (`*`): `style`, `class` (with CSS restrictions)

#### URL Scheme Restrictions
- **General allowed schemes**: `http`, `https`, `mailto`, `tel`
- **Images**: Only `http` and `https` (blocks `data:` and `javascript:`)
- **Links**: `http`, `https`, `mailto`, `tel` (blocks `javascript:`)

#### CSS Property Allowlist
Only safe CSS properties are permitted in `style` attributes:
- Colors: `color`, `background-color` (validated hex/rgb patterns)
- Typography: `font-size`, `font-weight`, `text-align`, `text-decoration`
- Layout: `margin`, `padding`, `border`, `width`, `height`

#### Event Handler Removal
All attributes starting with "on" are automatically stripped:
- `onclick`, `onmouseover`, `onload`, etc.

### 3. Centralized Security

The `generateWebViewHtml()` function now automatically sanitizes all content:

```typescript
export const generateWebViewHtml = ({ content, ...options }: WebViewHtmlOptions): string => {
  // All content is automatically sanitized
  const sanitizedContent = sanitizeHtmlContent(content);
  
  // Safe interpolation into HTML template
  return `<body>${sanitizedContent}</body>`;
};
```

## Testing

Comprehensive test suite verifies security measures:

### XSS Prevention Tests
- Script tag removal
- Event handler attribute stripping
- JavaScript URI neutralization
- Data URI blocking

### Content Preservation Tests
- Safe HTML elements are preserved
- Basic styling is maintained
- Table structures remain intact
- List formatting is preserved

### Example Test Cases

```typescript
// Script injection blocked
sanitizeHtmlContent('<script>alert("XSS")</script><p>Safe</p>')
// Result: '<p>Safe</p>'

// Event handlers removed
sanitizeHtmlContent('<p onclick="alert(\'XSS\')">Content</p>')
// Result: '<p>Content</p>'

// Data URIs blocked
sanitizeHtmlContent('<img src="data:text/html,<script>alert(\'XSS\')</script>" alt="test">')
// Result: '<img alt="test" />'

// Safe content preserved
sanitizeHtmlContent('<h1>Title</h1><p><strong>Bold</strong> text</p>')
// Result: '<h1>Title</h1><p><strong>Bold</strong> text</p>'
```

## Dependencies

- **sanitize-html** (v2.17.0): Production dependency for HTML sanitization
- **@types/sanitize-html** (v2.16.0): Development dependency for TypeScript support

## Usage

All existing WebView usage automatically benefits from the security improvements:

```typescript
// Calendar descriptions
generateWebViewHtml({
  content: item.Description, // Now automatically sanitized
  isDarkMode,
  fontSize: 14,
});

// Contact notes
generateWebViewHtml({
  content: noteContent, // Now automatically sanitized
  isDarkMode: colorScheme === 'dark',
});
```

## Security Benefits

1. **XSS Prevention**: Eliminates script injection attacks
2. **Content Isolation**: Prevents iframe-based attacks
3. **URL Safety**: Blocks dangerous data: and javascript: URIs
4. **Event Blocking**: Removes all event handler attributes
5. **CSS Safety**: Restricts styling to safe properties only
6. **Redirect Prevention**: Blocks meta refresh redirects

## Backward Compatibility

The implementation maintains full backward compatibility:
- All existing function signatures unchanged
- Safe HTML content renders identically
- Only malicious content is removed
- No breaking changes to consuming components

## Performance Impact

- Minimal performance overhead from sanitization
- One-time processing per content render
- Cached sanitization library
- No impact on React Native WebView performance

## Future Considerations

- Monitor sanitize-html library updates for new security features
- Consider implementing content security policy (CSP) headers
- Add logging for blocked content in development mode
- Evaluate additional sanitization rules based on usage patterns
