import sanitizeHtml from 'sanitize-html';

interface WebViewHtmlOptions {
  content: string;
  isDarkMode: boolean;
  fontSize?: number;
  lineHeight?: number;
  padding?: number;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Sanitizes HTML content to prevent XSS attacks and other security vulnerabilities.
 * Uses a strict allowlist of safe tags and attributes, removing dangerous elements
 * like scripts, iframes, meta refresh, event handlers, and data/javascript URIs.
 */
export const sanitizeHtmlContent = (html: string): string => {
  return sanitizeHtml(html, {
    // Allowed tags - only safe, commonly used HTML elements
    allowedTags: [
      'p',
      'div',
      'span',
      'br',
      'hr',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'small',
      'sub',
      'sup',
      'ul',
      'ol',
      'li',
      'blockquote',
      'pre',
      'code',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'a',
      'img',
      'dl',
      'dt',
      'dd',
    ],
    // Allowed attributes per tag
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      table: ['width', 'cellpadding', 'cellspacing'],
      th: ['scope', 'colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      // Allow basic styling attributes for formatting
      '*': ['style', 'class'],
    },
    // Allowed URL schemes - exclude dangerous ones
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    // Disallow all data: and javascript: URIs
    allowedSchemesByTag: {
      img: ['http', 'https'], // Only allow http/https for images
      a: ['http', 'https', 'mailto', 'tel'], // Allow common safe protocols for links
    },
    // Allow only safe CSS properties to prevent CSS-based attacks
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{3,6}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i, /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[0-9.]+\s*\)$/i],
        'background-color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i, /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[0-9.]+\s*\)$/i],
        'font-size': [/^\d+(?:px|em|rem|%|pt)$/i],
        'font-weight': [/^(?:normal|bold|lighter|bolder|\d+)$/i],
        'text-align': [/^(?:left|right|center|justify)$/i],
        'text-decoration': [/^(?:none|underline|overline|line-through)$/i],
        margin: [/^\d+(?:px|em|rem|%)(?:\s+\d+(?:px|em|rem|%))*$/i],
        padding: [/^\d+(?:px|em|rem|%)(?:\s+\d+(?:px|em|rem|%))*$/i],
        border: [/^[\d\s]+(?:px|em|rem)\s+(?:solid|dashed|dotted)\s+#[0-9a-f]{3,6}$/i],
        width: [/^\d+(?:px|em|rem|%)$/i],
        height: [/^\d+(?:px|em|rem|%)$/i],
      },
    },
    // Remove any attributes starting with "on" (event handlers)
    transformTags: {
      '*': (tagName, attribs) => {
        const cleanAttribs: { [key: string]: string } = {};
        Object.keys(attribs).forEach((key) => {
          // Remove event handler attributes
          if (!key.toLowerCase().startsWith('on')) {
            cleanAttribs[key] = attribs[key];
          }
        });
        return {
          tagName,
          attribs: cleanAttribs,
        };
      },
    },
  });
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
