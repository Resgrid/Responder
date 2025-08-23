import { htmlToPlainText, isHtmlSafe, sanitizeHtml, sanitizeDescription } from '@/utils/html-sanitizer';

describe('HTML Sanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("XSS")</script><p>Safe content</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert("XSS")');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe><p>Safe content</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<iframe>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should remove object and embed tags', () => {
      const input = '<object data="evil.swf"></object><embed src="evil.swf"><p>Safe content</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<object>');
      expect(result).not.toContain('<embed>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should remove form elements', () => {
      const input = '<form><input type="text"><button>Submit</button></form><p>Safe content</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<form>');
      expect(result).not.toContain('<input>');
      expect(result).not.toContain('<button>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should remove event handlers', () => {
      const input = '<p onclick="alert(1)">Click me</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click me</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
      // sanitize-html removes the href attribute entirely when it contains javascript:
      expect(result).toContain('<a>Click me</a>');
    });

    it('should handle empty or null input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
    });

    it('should preserve safe HTML', () => {
      const input = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
      const result = sanitizeHtml(input);
      expect(result).toBe(input);
    });
  });

  describe('htmlToPlainText', () => {
    it('should remove all HTML tags', () => {
      const input = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
      const result = htmlToPlainText(input);
      expect(result).toBe('Bold and italic text');
    });

    it('should handle empty input', () => {
      expect(htmlToPlainText('')).toBe('');
      expect(htmlToPlainText(null as any)).toBe('');
    });

    it('should handle complex HTML', () => {
      const input = '<div><h1>Title</h1><p>Paragraph with <a href="#">link</a></p></div>';
      const result = htmlToPlainText(input);
      expect(result).toBe('TitleParagraph with link');
    });
  });

  describe('isHtmlSafe', () => {
    it('should return false for dangerous content', () => {
      expect(isHtmlSafe('<script>alert(1)</script>')).toBe(false);
      expect(isHtmlSafe('<iframe src="evil.com"></iframe>')).toBe(false);
      expect(isHtmlSafe('<p onclick="alert(1)">Click</p>')).toBe(false);
      expect(isHtmlSafe('<a href="javascript:alert(1)">Click</a>')).toBe(false);
    });

    it('should return true for safe content', () => {
      expect(isHtmlSafe('<p>Safe content</p>')).toBe(true);
      expect(isHtmlSafe('<strong>Bold text</strong>')).toBe(true);
      expect(isHtmlSafe('')).toBe(true);
      expect(isHtmlSafe(null as any)).toBe(true);
    });

    it('should return false for CSS expressions', () => {
      expect(isHtmlSafe('<div style="background: expression(alert(1))">Evil</div>')).toBe(false);
    });
  });
});
