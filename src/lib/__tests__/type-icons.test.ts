import { getTypeIconUrl } from '../type-icons';

describe('getTypeIconUrl', () => {
  it('returns absolute http(s) URLs, trimmed', () => {
    expect(getTypeIconUrl('https://api.resgrid.dev/api/v4/TypeIcons/Pins/engine-responding?v=1')).toBe('https://api.resgrid.dev/api/v4/TypeIcons/Pins/engine-responding?v=1');
    expect(getTypeIconUrl('http://localhost:5151/api/v4/TypeIcons/abc')).toBe('http://localhost:5151/api/v4/TypeIcons/abc');
    expect(getTypeIconUrl('  HTTPS://api.resgrid.dev/api/v4/TypeIcons/abc  ')).toBe('HTTPS://api.resgrid.dev/api/v4/TypeIcons/abc');
  });

  it('returns null for missing, blank, relative or non-http values', () => {
    expect(getTypeIconUrl(undefined)).toBeNull();
    expect(getTypeIconUrl(null)).toBeNull();
    expect(getTypeIconUrl('')).toBeNull();
    expect(getTypeIconUrl('   ')).toBeNull();
    expect(getTypeIconUrl('/api/v4/TypeIcons/Pins/engine-responding')).toBeNull();
    expect(getTypeIconUrl('//api.resgrid.dev/api/v4/TypeIcons/abc')).toBeNull();
    expect(getTypeIconUrl('https://')).toBeNull();
    expect(getTypeIconUrl('https://api.resgrid.dev/a b')).toBeNull();
    expect(getTypeIconUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(getTypeIconUrl('javascript:alert(1)')).toBeNull();
    expect(getTypeIconUrl('ftp://api.resgrid.dev/icon.png')).toBeNull();
  });

  it('returns null for non-string values from a loosely typed payload', () => {
    expect(getTypeIconUrl(42 as unknown as string)).toBeNull();
    expect(getTypeIconUrl({} as unknown as string)).toBeNull();
  });
});
