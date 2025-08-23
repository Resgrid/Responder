/**
 * HTML sanitizer utility for calendar item descriptions using sanitize-html
 * This provides robust HTML sanitization for safe rendering in WebView components
 * Uses the sanitize-html package for comprehensive security and customizable configuration
 * For production use, review and adjust the sanitization options based on security requirements
 */

import sanitizeHtmlLib from 'sanitize-html';

/**
 * Checks if a URL scheme is safe (not javascript: or data:)
 */
function isSafeScheme(url: string): boolean {
  if (!url) return false;
  const normalizedUrl = url.toLowerCase().trim();
  return !normalizedUrl.startsWith('javascript:') && !normalizedUrl.startsWith('data:');
}

/**
 * Filters attributes to remove dangerous ones (on* events, unsafe styles)
 */
function filterDangerousAttributes(tag: string, name: string, value: string): boolean {
  // Block all event handlers (onclick, onload, etc.)
  if (name.toLowerCase().startsWith('on')) {
    return false;
  }

  // Block style attributes with expressions or javascript
  if (name.toLowerCase() === 'style') {
    const normalizedValue = value.toLowerCase();
    if (normalizedValue.includes('expression(') || normalizedValue.includes('javascript:')) {
      return false;
    }
  }

  // For URL attributes, ensure safe schemes
  if (['href', 'src', 'srcset', 'srcdoc'].includes(name.toLowerCase())) {
    return isSafeScheme(value);
  }

  return true;
}

// Strict sanitization configuration with explicit allowlist
export const strictSanitizeConfig: sanitizeHtmlLib.IOptions = {
  // Allow only safe HTML tags - strict allowlist (includes table tags for webview compatibility)
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'span',
    'div',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'blockquote',
    'pre',
    'code',
    // Table tags for webview compatibility
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    // Additional formatting tags
    'hr',
    's',
    'small',
    'sub',
    'sup',
    'dl',
    'dt',
    'dd',
  ],

  // Allow only safe attributes - strict allowlist with filtering
  allowedAttributes: {
    a: ['href', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    span: ['style'],
    div: ['style'],
    p: ['style'],
    table: ['width', 'cellpadding', 'cellspacing'],
    th: ['scope', 'colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
    '*': ['class'],
  },

  // Allow only safe URL schemes
  allowedSchemes: ['http', 'https', 'mailto'],

  // Specific schemes allowed per tag
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto'],
    img: ['http', 'https'],
  },

  // Disallow unknown tags (strict mode)
  disallowedTagsMode: 'discard',

  // Additional security options
  allowedIframeHostnames: [], // No iframes allowed
  allowedScriptHostnames: [], // No scripts allowed

  // Style attribute options - very restrictive
  allowedStyles: {
    '*': {
      color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/],
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      'font-size': [/^\d+(?:px|em|%)$/],
      'font-weight': [/^(?:normal|bold|bolder|lighter|\d+)$/],
      margin: [/^\d+(?:px|em|%)$/],
      padding: [/^\d+(?:px|em|%)$/],
    },
  },

  // Remove empty elements and dangerous tags
  nonTextTags: ['style', 'script', 'textarea', 'option'],

  // Transform tags for better security and validation
  transformTags: {
    a: (tagName, attribs) => {
      // Validate href attribute and remove if unsafe
      if (attribs.href && !isSafeScheme(attribs.href)) {
        delete attribs.href;
      }

      // Filter out dangerous attributes
      const filteredAttribs: Record<string, string> = {};
      Object.entries(attribs).forEach(([name, value]) => {
        if (filterDangerousAttributes(tagName, name, value)) {
          filteredAttribs[name] = value;
        }
      });

      return {
        tagName: 'a',
        attribs: {
          ...filteredAttribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      };
    },
    img: (tagName, attribs) => {
      // Validate src attribute and remove if unsafe
      if (attribs.src && !isSafeScheme(attribs.src)) {
        delete attribs.src;
      }

      // Filter out dangerous attributes
      const filteredAttribs: Record<string, string> = {};
      Object.entries(attribs).forEach(([name, value]) => {
        if (filterDangerousAttributes(tagName, name, value)) {
          filteredAttribs[name] = value;
        }
      });

      return {
        tagName: 'img',
        attribs: filteredAttribs,
      };
    },
    // Apply filtering to all other tags
    '*': (tagName, attribs) => {
      const filteredAttribs: Record<string, string> = {};
      Object.entries(attribs).forEach(([name, value]) => {
        if (filterDangerousAttributes(tagName, name, value)) {
          filteredAttribs[name] = value;
        }
      });

      return {
        tagName,
        attribs: filteredAttribs,
      };
    },
  },
};

/**
 * Sanitizes HTML content for safe rendering in calendar descriptions
 * @param input The HTML content to sanitize
 * @returns Sanitized HTML content safe for rendering
 */
export function sanitizeDescription(input: string): string {
  if (!input) return '';

  return sanitizeHtmlLib(input, strictSanitizeConfig).trim();
}

/**
 * Legacy function for backward compatibility - now uses sanitize-html
 * @param html The HTML content to sanitize
 * @returns Sanitized HTML content
 * @deprecated Use sanitizeDescription instead
 */
export function sanitizeHtml(html: string): string {
  return sanitizeDescription(html);
}

/**
 * Extracts plain text from HTML content
 * @param html The HTML content to convert to plain text
 * @returns Plain text content
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  // Use sanitize-html to strip all tags
  return sanitizeHtmlLib(html, { allowedTags: [], allowedAttributes: {} }).trim();
}

/**
 * Checks if HTML content contains potentially dangerous elements
 * @param html The HTML content to check
 * @returns True if content appears safe, false otherwise
 */
export function isHtmlSafe(html: string): boolean {
  if (!html) return true;

  // Sanitize the content and compare with original
  const sanitized = sanitizeDescription(html);
  const originalLength = html.replace(/\s+/g, ' ').trim().length;
  const sanitizedLength = sanitized.replace(/\s+/g, ' ').trim().length;

  // If sanitization significantly reduced the content length, it likely contained unsafe elements
  // Based on testing:
  // - Safe content: ratio = 1.0 (no change)
  // - onclick removal: ratio = ~0.39
  // - expression removal: ratio = ~0.27
  // - javascript: removal: ratio = ~0.36
  const lengthRatio = originalLength > 0 ? sanitizedLength / originalLength : 1;

  // Content is considered unsafe if the length ratio drops below 0.8
  // This catches cases where significant content was removed due to security concerns
  return lengthRatio >= 0.8 && sanitized.trim().length > 0;
}
