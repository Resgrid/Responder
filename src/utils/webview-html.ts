import sanitizeHtml from 'sanitize-html';

import { strictSanitizeConfig } from '@/utils/html-sanitizer';

interface WebViewHtmlOptions {
  content: string;
  isDarkMode: boolean;
  fontSize?: number;
  lineHeight?: number;
  padding?: number;
  backgroundColor?: string;
  textColor?: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

// `String.fromCodePoint` throws on anything above U+10FFFF, and lone surrogates are
// malformed UTF-16. Both stay as the original entity text rather than taking down the
// render for one bad field.
const isDecodableCodePoint = (code: number): boolean => Number.isInteger(code) && code >= 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff);

const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const code = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return isDecodableCodePoint(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });

// Some API fields (e.g. protocol text) arrive HTML-entity-encoded: no real tags,
// just `&lt;p&gt;…`. Rendering that shows literal markup, so decode it first —
// only when there are no actual tags, and always BEFORE sanitizing so anything
// dangerous that decoding uncovers is still stripped.
const looksHtmlEncoded = (value: string): boolean => !/<[a-z!/]/i.test(value) && /&(lt|#0*60|#x0*3c);/i.test(value);

/**
 * Sanitizes HTML content to prevent XSS attacks and other security vulnerabilities.
 * Uses the centralized strict sanitization configuration from html-sanitizer.ts
 * for consistent security across the entire application.
 */
export const sanitizeHtmlContent = (html: string): string => {
  if (!html) {
    return '';
  }

  const source = looksHtmlEncoded(html) ? decodeHtmlEntities(html) : html;
  return sanitizeHtml(source, strictSanitizeConfig);
};

/**
 * Generates consistent HTML content for WebView components with proper theming and responsive design.
 * This utility ensures all WebViews in the app have consistent styling and security settings.
 * All content is automatically sanitized to prevent XSS attacks and other security vulnerabilities.
 */
export const generateWebViewHtml = ({ content, isDarkMode, fontSize = 16, lineHeight = 1.5, padding = 8, backgroundColor, textColor }: WebViewHtmlOptions): string => {
  // Sanitize the content to prevent XSS attacks and other security vulnerabilities
  const sanitizedContent = sanitizeHtmlContent(content);

  // Default colors based on theme
  const defaultTextColor = isDarkMode ? '#E5E7EB' : '#1F2937';
  const defaultBackgroundColor = isDarkMode ? '#374151' : '#F9FAFB';
  const linkColor = isDarkMode ? '#60A5FA' : '#3B82F6';
  const codeBackgroundColor = isDarkMode ? '#1F2937' : '#F3F4F6';
  const borderColor = isDarkMode ? '#374151' : '#E5E7EB';
  const quoteBorderColor = isDarkMode ? '#60A5FA' : '#3B82F6';
  const tableHeaderBackground = isDarkMode ? '#1F2937' : '#F9FAFB';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          html, body {
            margin: 0;
            padding: ${padding}px;
            width: 100%;
            height: auto;
            min-height: 100%;
            color: ${textColor || defaultTextColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-size: ${fontSize}px;
            line-height: ${lineHeight};
            word-wrap: break-word;
            overflow-wrap: break-word;
            background-color: ${backgroundColor || defaultBackgroundColor};
            box-sizing: border-box;
          }
          * {
            max-width: 100%;
            box-sizing: border-box;
          }
          p, div, span {
            margin: 0 0 12px 0;
          }
          p:last-child, div:last-child {
            margin-bottom: 0;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          a {
            color: ${linkColor};
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          ul, ol {
            padding-left: 20px;
            margin: 12px 0;
          }
          li {
            margin: 4px 0;
          }
          blockquote {
            border-left: 4px solid ${quoteBorderColor};
            margin: 12px 0;
            padding-left: 16px;
            font-style: italic;
          }
          pre, code {
            background-color: ${codeBackgroundColor};
            padding: 8px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: ${fontSize - 2}px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
          }
          th, td {
            border: 1px solid ${borderColor};
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: ${tableHeaderBackground};
            font-weight: bold;
          }
          h1, h2, h3, h4, h5, h6 {
            margin: 16px 0 8px 0;
            font-weight: bold;
          }
          h1:first-child, h2:first-child, h3:first-child, 
          h4:first-child, h5:first-child, h6:first-child {
            margin-top: 0;
          }
        </style>
      </head>
      <body>${sanitizedContent}</body>
    </html>
  `;
};

/**
 * Default WebView props that provide consistent security and behavior settings
 */
export const defaultWebViewProps = {
  // Security: Only allow local content, no external origins
  originWhitelist: ['about:'],
  // Security: Disable JavaScript and DOM storage by default
  javaScriptEnabled: false,
  domStorageEnabled: false,
  // Performance and UX
  startInLoadingState: false,
  mixedContentMode: 'compatibility' as const,
  androidLayerType: 'software' as const,
  // Scroll behavior
  showsVerticalScrollIndicator: true,
  showsHorizontalScrollIndicator: false,
};
