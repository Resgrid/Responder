import { generateWebViewHtml, defaultWebViewProps } from '../webview-html';

describe('WebView HTML Utility', () => {
  describe('generateWebViewHtml', () => {
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
