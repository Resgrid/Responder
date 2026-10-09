import { readableTextColor } from '../utils';

describe('readableTextColor', () => {
  it('uses white on dark backgrounds', () => {
    expect(readableTextColor('#000000')).toBe('#FFFFFF');
    expect(readableTextColor('#262626')).toBe('#FFFFFF');
    expect(readableTextColor('#475569')).toBe('#FFFFFF');
  });

  it('uses black on light backgrounds', () => {
    expect(readableTextColor('#ffffff')).toBe('#000000');
    expect(readableTextColor('#f8ac59')).toBe('#000000');
  });

  it('uses black on mid-tone status colours where white would fall below 3:1', () => {
    expect(readableTextColor('#23c6c8')).toBe('#000000');
    expect(readableTextColor('#449d44')).toBe('#000000');
    expect(readableTextColor('#ED5565')).toBe('#000000');
  });

  it('accepts 3-digit hex and a missing #', () => {
    expect(readableTextColor('#fff')).toBe('#000000');
    expect(readableTextColor('000')).toBe('#FFFFFF');
  });

  it('returns undefined for values that are not hex colours', () => {
    expect(readableTextColor('')).toBeUndefined();
    expect(readableTextColor('label-default')).toBeUndefined();
    expect(readableTextColor('rgb(0,0,0)')).toBeUndefined();
    expect(readableTextColor('#12345')).toBeUndefined();
  });
});
