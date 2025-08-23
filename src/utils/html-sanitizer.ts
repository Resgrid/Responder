/**
 * Basic HTML sanitizer utility for calendar item descriptions
 * This provides a simple way to sanitize HTML content before rendering in WebView
 * For production use, consider using a more robust library like DOMPurify
 */

/**
 * Simple HTML sanitizer that removes potentially dangerous elements and attributes
 * @param html The HTML content to sanitize
 * @returns Sanitized HTML content
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Remove script tags and their content
  let sanitized = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');

  // Remove object and embed tags
  sanitized = sanitized.replace(/<(object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '');

  // Remove form elements
  sanitized = sanitized.replace(/<(form|input|button|textarea|select)[^>]*>[\s\S]*?<\/\1>/gi, '');
  sanitized = sanitized.replace(/<(input|br|img|hr)[^>]*\/?>/gi, (match) => {
    // Allow safe self-closing tags but remove dangerous attributes
    if (match.toLowerCase().includes('input')) return '';
    return match.replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove event handlers
  });

  // Remove dangerous attributes from all tags
  sanitized = sanitized.replace(/(<[^>]+)(on\w+\s*=\s*["'][^"']*["'])/gi, '$1');
  sanitized = sanitized.replace(/(<[^>]+)(javascript:[^"'\s>]*)/gi, '$1');
  sanitized = sanitized.replace(/(<[^>]+)(data:[^"'\s>]*)/gi, '$1');

  // Remove style attributes that might contain javascript
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*expression\([^"']*\)["']/gi, '');

  return sanitized.trim();
}

/**
 * Extracts plain text from HTML content
 * @param html The HTML content to convert to plain text
 * @returns Plain text content
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  // Remove all HTML tags
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Checks if HTML content contains potentially dangerous elements
 * @param html The HTML content to check
 * @returns True if content appears safe, false otherwise
 */
export function isHtmlSafe(html: string): boolean {
  if (!html) return true;

  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /expression\s*\(/i, // CSS expressions
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(html));
}
