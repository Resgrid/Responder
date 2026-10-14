import { readableColors, readableTextColor } from '../utils';

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

  it('reads opaque rgb() and rgba() colours', () => {
    expect(readableTextColor('rgb(0,0,0)')).toBe('#FFFFFF');
    expect(readableTextColor('rgb(200, 0, 0)')).toBe('#FFFFFF');
    expect(readableTextColor('RGB(255, 255, 0)')).toBe('#000000');
    expect(readableTextColor('rgba(30, 58, 138, 1)')).toBe('#FFFFFF');
    expect(readableTextColor(' rgba(255,255,255,1.0) ')).toBe('#000000');
  });

  it('returns undefined for values whose contrast it cannot work out', () => {
    expect(readableTextColor('')).toBeUndefined();
    expect(readableTextColor('label-default')).toBeUndefined();
    expect(readableTextColor('red')).toBeUndefined();
    expect(readableTextColor('hsl(0, 100%, 50%)')).toBeUndefined();
    expect(readableTextColor('rgba(0, 0, 0, 0.5)')).toBeUndefined();
    expect(readableTextColor('rgb(256, 0, 0)')).toBeUndefined();
    expect(readableTextColor('#12345')).toBeUndefined();
  });
});

describe('readableColors', () => {
  it('keeps a colour it can read and pairs it with the readable text colour', () => {
    expect(readableColors('#1e3a8a')).toEqual({ backgroundColor: '#1e3a8a', textColor: '#FFFFFF' });
    expect(readableColors('rgb(255, 255, 0)')).toEqual({ backgroundColor: 'rgb(255, 255, 0)', textColor: '#000000' });
  });

  it('adds the # React Native needs to draw bare hex', () => {
    expect(readableColors(' ff0000 ')).toEqual({ backgroundColor: '#ff0000', textColor: '#000000' });
  });

  it('swaps a colour it cannot read for the fallback and its text colour', () => {
    expect(readableColors('hsl(0, 100%, 25%)')).toEqual({ backgroundColor: '#808080', textColor: '#000000' });
    expect(readableColors('rgba(255, 255, 255, 0.2)', '#6b7280')).toEqual({ backgroundColor: '#6b7280', textColor: '#FFFFFF' });
    expect(readableColors(undefined, '#6b7280')).toEqual({ backgroundColor: '#6b7280', textColor: '#FFFFFF' });
    expect(readableColors(null)).toEqual({ backgroundColor: '#808080', textColor: '#000000' });
  });
});
