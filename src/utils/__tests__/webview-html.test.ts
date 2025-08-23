import { generateWebViewHtml, defaultWebViewProps, sanitizeHtmlContent } from '../webview-html';

describe('WebView HTML Utility', () => {
  describe('sanitizeHtmlContent', () => {
    it('removes script tags completely', () => {
      const maliciousHtml = '<p>Safe content</p><script>alert("XSS")</script><p>More content</p>';
      const sanitized = sanitizeHtmlContent(maliciousHtml);
      
      expect(sanitized).toContain('<p>Safe content</p>');
      expect(sanitized).toContain('<p>More content</p>');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('removes iframe tags completely', () => {
      const maliciousHtml = '<p>Content</p><iframe src="https://evil.com"></iframe>';
      const sanitized = sanitizeHtmlContent(maliciousHtml);
      
      expect(sanitized).toContain('<p>Content</p>');
      expect(sanitized).not.toContain('iframe');
    });

    it('removes meta refresh tags', () => {
      const maliciousHtml = '<p>Content</p><meta http-equiv="refresh" content="0;url=https://evil.com">';
      const sanitized = sanitizeHtmlContent(maliciousHtml);
      
      expect(sanitized).toContain('<p>Content</p>');
      expect(sanitized).not.toContain('meta');
      expect(sanitized).not.toContain('refresh');
    });

    it('removes event handler attributes', () => {
      const maliciousHtml = '<p onclick="alert(\'XSS\')" onmouseover="steal()">Content</p>';
      const sanitized = sanitizeHtmlContent(maliciousHtml);
      
      expect(sanitized).toContain('<p>Content</p>');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('onmouseover');
    });

    it('neutralizes javascript: URIs in links', () => {
      const maliciousHtml = '<a href="javascript:alert(\'XSS\')">Click me</a>';
      const sanitized = sanitizeHtmlContent(maliciousHtml);
      
      expect(sanitized).toContain('Click me');
      expect(sanitized).not.toContain('javascript:');
    });

    it('neutralizes data: URIs in images', () => {
      const maliciousHtml = '<img src="data:text/html,<script>alert(\'XSS\')</script>" alt="test">';
      const sanitized = sanitizeHtmlContent(maliciousHtml);
      
      expect(sanitized).toContain('alt="test"');
      expect(sanitized).not.toContain('data:');
    });

    it('allows safe HTML tags and attributes', () => {
      const safeHtml = '<h1>Title</h1><p><strong>Bold</strong> and <em>italic</em> text with <a href="https://example.com">link</a></p><img src="https://example.com/image.jpg" alt="image">';
      const sanitized = sanitizeHtmlContent(safeHtml);
      
      expect(sanitized).toContain('<h1>Title</h1>');
      expect(sanitized).toContain('<strong>Bold</strong>');
      expect(sanitized).toContain('<em>italic</em>');
      expect(sanitized).toContain('<a href="https://example.com">link</a>');
      expect(sanitized).toContain('<img src="https://example.com/image.jpg" alt="image"');
    });

    it('allows safe CSS in style attributes', () => {
      const styledHtml = '<p style="color: #FF0000; font-size: 16px;">Styled text</p>';
      const sanitized = sanitizeHtmlContent(styledHtml);
      
      expect(sanitized).toContain('Styled text');
      // Note: sanitize-html may modify the exact style formatting, so we check for content
      expect(sanitized).toContain('color:#FF0000');
      expect(sanitized).toContain('font-size:16px');
    });

    it('removes dangerous CSS from style attributes', () => {
      const maliciousHtml = '<p style="background: url(javascript:alert(\'XSS\'));">Content</p>';
      const sanitized = sanitizeHtmlContent(maliciousHtml);
      
      expect(sanitized).toContain('Content');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('url(');
    });

    it('preserves table structure', () => {
      const tableHtml = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
      const sanitized = sanitizeHtmlContent(tableHtml);
      
      expect(sanitized).toContain('<table>');
      expect(sanitized).toContain('<th>Header</th>');
      expect(sanitized).toContain('<td>Cell</td>');
    });

    it('preserves lists', () => {
      const listHtml = '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>Numbered 1</li></ol>';
      const sanitized = sanitizeHtmlContent(listHtml);
      
      expect(sanitized).toContain('<ul>');
      expect(sanitized).toContain('<li>Item 1</li>');
      expect(sanitized).toContain('<ol>');
      expect(sanitized).toContain('<li>Numbered 1</li>');
    });
  });

  describe('generateWebViewHtml', () => {
    it('sanitizes content before embedding in HTML', () => {
      const maliciousContent = '<p>Safe content</p><script>alert("XSS")</script>';
      const html = generateWebViewHtml({
        content: maliciousContent,
        isDarkMode: false,
      });

      expect(html).toContain('<p>Safe content</p>');
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('alert("XSS")');
    });

    it('generates HTML with light theme', () => {
      const html = generateWebViewHtml({
        content: '<p>Test content</p>',
        isDarkMode: false,
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<p>Test content</p>');
      expect(html).toContain('color: #1F2937'); // Light mode text color
      expect(html).toContain('background-color: #F9FAFB'); // Light mode background
    });

    it('generates HTML with dark theme', () => {
      const html = generateWebViewHtml({
        content: '<p>Test content</p>',
        isDarkMode: true,
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<p>Test content</p>');
      expect(html).toContain('color: #E5E7EB'); // Dark mode text color
      expect(html).toContain('background-color: #374151'); // Dark mode background
    });

    it('applies custom styling options', () => {
      const html = generateWebViewHtml({
        content: '<p>Custom content</p>',
        isDarkMode: false,
        fontSize: 18,
        lineHeight: 1.8,
        padding: 12,
        textColor: '#FF0000',
        backgroundColor: '#00FF00',
      });

      expect(html).toContain('font-size: 18px');
      expect(html).toContain('line-height: 1.8');
      expect(html).toContain('padding: 12px');
      expect(html).toContain('color: #FF0000');
      expect(html).toContain('background-color: #00FF00');
    });

    it('includes responsive viewport meta tag', () => {
      const html = generateWebViewHtml({
        content: '<p>Test</p>',
        isDarkMode: false,
      });

      expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">');
    });

    it('includes proper styling for HTML elements', () => {
      const html = generateWebViewHtml({
        content: '<p>Test</p>',
        isDarkMode: false,
      });

      // Check for various HTML element styles
      expect(html).toContain('img {'); // Image styling
      expect(html).toContain('a {'); // Link styling
      expect(html).toContain('table {'); // Table styling
      expect(html).toContain('blockquote {'); // Blockquote styling
      expect(html).toContain('pre, code {'); // Code styling
    });
  });

  describe('defaultWebViewProps', () => {
    it('provides secure default props', () => {
      expect(defaultWebViewProps.originWhitelist).toEqual(['about:']);
      expect(defaultWebViewProps.javaScriptEnabled).toBe(false);
      expect(defaultWebViewProps.domStorageEnabled).toBe(false);
      expect(defaultWebViewProps.startInLoadingState).toBe(false);
      expect(defaultWebViewProps.mixedContentMode).toBe('compatibility');
      expect(defaultWebViewProps.androidLayerType).toBe('software');
      expect(defaultWebViewProps.showsVerticalScrollIndicator).toBe(true);
      expect(defaultWebViewProps.showsHorizontalScrollIndicator).toBe(false);
    });
  });
});
