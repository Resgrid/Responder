import { Linking } from 'react-native';
import { Platform } from 'react-native';
import type { StoreApi, UseBoundStore } from 'zustand';

import { Env } from './env';

export function openLinkInBrowser(url: string) {
  Linking.canOpenURL(url).then((canOpen) => canOpen && Linking.openURL(url));
}

type WithSelectors<S> = S extends { getState: () => infer T } ? S & { use: { [K in keyof T]: () => T[K] } } : never;

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(_store: S) => {
  let store = _store as WithSelectors<typeof _store>;
  store.use = {};
  for (let k of Object.keys(store.getState())) {
    (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
  }

  return store;
};

export const IS_ANDROID = Platform.OS === 'android';
export const IS_IOS = Platform.OS === 'ios';
export const DEFAULT_CENTER_COORDINATE = [-77.036086, 38.910233];
export const SF_OFFICE_COORDINATE = [-122.400021, 37.789085];

export function onSortOptions(a: any, b: any) {
  if (a.label < b.label) {
    return -1;
  }

  if (a.label > b.label) {
    return 1;
  }

  return 0;
}

export function getAvatarUrl(userId: string) {
  return Env.BASE_API_URL + Env.RESGRID_API_URL + '/Avatars/Get?id=' + userId;
}

export function invertColor(hex: string, bw: boolean): string {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1);
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.');
  }
  let r = parseInt(hex.slice(0, 2), 16),
    g = parseInt(hex.slice(2, 4), 16),
    b = parseInt(hex.slice(4, 6), 16);
  if (bw) {
    // https://stackoverflow.com/a/3943023/112731
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#000000' : '#FFFFFF';
  }
  // invert color components
  let r2 = (255 - r).toString(16),
    g2 = (255 - g).toString(16),
    b2 = (255 - b).toString(16);
  // pad each with zeros and return
  return '#' + padZero(r2, 2) + padZero(g2, 2) + padZero(b2, 2);
}

export function padZero(str: string, len: number): string {
  len = len || 2;
  var zeros = new Array(len).join('0');
  return (zeros + str).slice(-len);
}

export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Strips HTML tags and elements from a text string
 * @param html The HTML string to be stripped
 * @returns Plain text with all HTML tags removed
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';

  // Remove HTML tags using regex
  const withoutTags = html.replace(/<[^>]*>/g, '');

  // Replace common HTML entities
  return withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .trim();
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function to2Digit(str: string): string {
  if (!str) {
    return '';
  }

  const isString: boolean = typeof str === 'string';
  if (isString && str.length === 1) {
    str = 0 + str;
  }
  return str;
}

export function getMinutesBetweenDates(startDate: Date, endDate: Date): number {
  let diff = endDate.getTime() - startDate.getTime();
  return diff / 60000;
}

export function parseDateISOString(s: string): Date {
  const b = s.split(/\D/);
  return new Date(parseInt(b[0], 10), parseInt(b[1], 10) - 1, parseInt(b[2], 10), parseInt(b[3], 10), parseInt(b[4], 10), parseInt(b[5], 10));
}

export function getDate(date: string): string {
  if (!date) {
    return 'Unknown';
  }

  const d = new Date(date);
  const datestring = ('0' + d.getDate()).slice(-2) + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + d.getFullYear() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);

  return datestring;
}

export function formatDateForDisplay(date: Date, format: string): string {
  // Original idea from: https://weblog.west-wind.com/posts/2008/Mar/18/A-simple-formatDate-function-for-JavaScript

  if (!date) {
    return '';
  }

  if (!format) {
    format = 'MM/dd/yyyy';
  }

  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  let hours = date.getHours();
  if (format.indexOf('t') > -1) {
    if (hours > 11) {
      format = format.replace('t', 'pm');
    } else {
      format = format.replace('t', 'am');
    }
  }

  if (format.indexOf('MMMM') > -1) {
    format = format.replace('MMMM', monthNames[date.getMonth()]);
  } else if (format.indexOf('MMM') > -1) {
    format = format.replace('MMM', monthShortNames[date.getMonth()]);
  } else if (format.indexOf('MM') > -1) {
    format = format.replace('MM', padLeadingZero(month).toString());
  }

  if (format.indexOf('yyyy') > -1) {
    format = format.replace('yyyy', year.toString());
  } else if (format.indexOf('yy') > -1) {
    format = format.replace('yy', year.toString().substr(2, 2));
  }

  format = format.replace('dd', padLeadingZero(date.getDate()).toString());

  if (format.indexOf('HH') > -1) {
    format = format.replace('HH', padLeadingZero(hours).toString());
  }

  if (format.indexOf('hh') > -1) {
    if (hours > 12) {
      hours = hours - 12;
    }

    if (hours === 0) {
      hours = hours = 12;
    }
    format = format.replace('hh', padLeadingZero(hours).toString());
  }
  if (format.indexOf('mm') > -1) {
    format = format.replace('mm', padLeadingZero(date.getMinutes()).toString());
  }

  if (format.indexOf('ss') > -1) {
    format = format.replace('ss', padLeadingZero(date.getSeconds()).toString());
  }
  if (format.indexOf('dd') > -1) {
    format = format.replace('ss', padLeadingZero(date.getDay()).toString());
  }
  if (format.indexOf('Z') > -1) {
    let timeZone: string | undefined;
    try {
      // Chrome, Firefox
      let zone = /.*\s(.+)/.exec(
        new Date()?.toLocaleDateString(navigator.language, {
          timeZoneName: 'short',
        })
      );
      if (zone) {
        timeZone = zone[1];
      }
    } catch (e) {
      // IE, some loss in accuracy due to guessing at the abbreviation
      // Note: This regex adds a grouping around the open paren as a
      //       workaround for an IE regex parser bug
      timeZone = new Date().toTimeString()?.match(new RegExp('[A-Z](?!.*[(])', 'g'))?.join('');
    }

    if (timeZone) {
      format = format.replace('Z', timeZone);
    }
  }

  return format;
}

export function formatDateString(date: Date): string {
  const day = date.getDate(); // yields date
  const month = date.getMonth() + 1; // yields month (add one as '.getMonth()' is zero indexed)
  const year = date.getFullYear(); // yields year
  const hour = date.getHours(); // yields hours
  const minute = date.getMinutes(); // yields minutes
  const second = date.getSeconds(); // yields seconds
  let timeZone = '';

  /*
      try {
          // Chrome, Firefox
          timeZone = /.*\s(.+)/.exec((new Date()).toLocaleDateString(navigator.language, { timeZoneName:'short' }))[1];
      } catch(e) {
          // IE, some loss in accuracy due to guessing at the abbreviation
          // Note: This regex adds a grouping around the open paren as a
          //       workaround for an IE regex parser bug
          timeZone = (new Date()).toTimeString().match(new RegExp('[A-Z](?!.*[\(])','g')).join('');
      }
      */

  timeZone = createDateUTCOffset(date);

  const time = padLeadingZero(month) + '/' + padLeadingZero(day) + '/' + year + ' ' + padLeadingZero(hour) + ':' + padLeadingZero(minute) + ':' + padLeadingZero(second) + ' ' + timeZone;

  return time;
}

export function padLeadingZero(value: number): string {
  return value < 10 ? '0' + value : value.toString();
}

export function createDateUTCOffset(date: Date): string {
  const sign = date.getTimezoneOffset() > 0 ? '-' : '+';
  const offset = Math.abs(date.getTimezoneOffset());
  const hours = padLeadingZero(Math.floor(offset / 60));
  const minutes = padLeadingZero(offset % 60);
  return sign + hours + ':' + minutes;
}

export function addDaysToDate(date: string, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function subtractDaysFromDate(date: string, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

export function getTimeAgo(time: any, floor: number = 0): string {
  if (!time) {
    return 'Unknown';
  }

  switch (typeof time) {
    case 'number':
      break;
    case 'string':
      time = +new Date(time);
      break;
    case 'object':
      if (time.constructor === Date) {
        time = time.getTime();
      }
      break;
    default:
      time = +new Date();
  }

  const timeFormats = [
    [60, 'seconds', 1], // 60
    [120, '1 minute ago', '1 minute from now'], // 60*2
    [3600, 'minutes', 60], // 60*60, 60
    [7200, '1 hour ago', '1 hour from now'], // 60*60*2
    [86400, 'hours', 3600], // 60*60*24, 60*60
    [172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
    [604800, 'days', 86400], // 60*60*24*7, 60*60*24
    [1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
    [2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
    [4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
    [29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
    [58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
    [2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
    [5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
    [58060800000, 'centuries', 2903040000], // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
  ];
  let seconds = (+new Date() - time) / 1000,
    token = 'ago',
    listChoice = 1;

  if (floor > 0 && seconds < floor) {
    seconds = seconds + floor;
  }

  if (seconds === 0) {
    return 'Just now';
  }
  if (seconds < 0) {
    seconds = Math.abs(seconds);
    token = 'from now';
    listChoice = 2;
  }
  let i = 0,
    format;
  while ((format = timeFormats[i++])) {
    if (seconds < Number(format[0])) {
      if (typeof format[2] === 'string') {
        return format[listChoice].toString();
      } else {
        return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
      }
    }
  }
  return time;
}

export function getTimeAgoUtc(time: any): string {
  if (!time) {
    return 'Unknown';
  }

  switch (typeof time) {
    case 'number':
      break;
    case 'string':
      time = +new Date(time);
      break;
    case 'object':
      if (time.constructor === Date) {
        time = time.getTime();
      }
      break;
    default:
      time = +new Date();
  }

  const currentDate = new Date();
  time = Number(new Date(time).getTime() + 0 * 60 * 1000);

  const timeFormats = [
    [60, 'seconds', 1], // 60
    [120, '1 minute ago', '1 minute from now'], // 60*2
    [3600, 'minutes', 60], // 60*60, 60
    [7200, '1 hour ago', '1 hour from now'], // 60*60*2
    [86400, 'hours', 3600], // 60*60*24, 60*60
    [172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
    [604800, 'days', 86400], // 60*60*24*7, 60*60*24
    [1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
    [2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
    [4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
    [29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
    [58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
    [2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
    [5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
    [58060800000, 'centuries', 2903040000], // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
  ];
  let seconds = (Number(new Date(currentDate).getTime() + new Date(currentDate).getTimezoneOffset() * 60 * 1000) - time) / 1000,
    token = 'ago',
    listChoice = 1;

  if (seconds === 0) {
    return 'Just now';
  }
  if (seconds < 0) {
    seconds = Math.abs(seconds);
    token = 'from now';
    listChoice = 2;
  }
  let i = 0,
    format;
  while ((format = timeFormats[i++])) {
    if (seconds < Number(format[0])) {
      if (typeof format[2] === 'string') {
        return format[listChoice].toString();
      } else {
        return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
      }
    }
  }
  return time;
}
