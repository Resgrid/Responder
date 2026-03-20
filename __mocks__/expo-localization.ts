export const getLocales = jest.fn().mockReturnValue([
  {
    languageCode: 'en',
    languageTag: 'en-US',
    regionCode: 'US',
    textDirection: 'ltr',
    digitGroupingSeparator: ',',
    decimalSeparator: '.',
    measurementSystem: 'imperial',
    currencyCode: 'USD',
    currencySymbol: '$',
    isRTL: false,
  },
]);

export const getCalendars = jest.fn().mockReturnValue([
  {
    calendar: 'gregorian',
    timeZone: 'America/New_York',
    uses24HourClock: false,
    firstWeekday: 1,
  },
]);

export const locale = 'en-US';
export const locales = ['en-US'];
export const timezone = 'America/New_York';
export const isRTL = false;
