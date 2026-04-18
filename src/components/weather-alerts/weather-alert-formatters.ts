interface WeatherAlertTranslationFunction {
  (key: string): string;
}

const coerceWeatherAlertValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const normalizeWeatherAlertValue = (value: unknown): string =>
  coerceWeatherAlertValue(value)
    .trim()
    .replace(/[_\s-]+/g, '')
    .toLowerCase();

const WEATHER_ALERT_TRANSLATION_KEYS = {
  category: {
    met: 'Met',
    geo: 'Geo',
    fire: 'Fire',
    health: 'Health',
    env: 'Env',
    transport: 'Transport',
    infra: 'Infra',
    cbrne: 'CBRNE',
    other: 'Other',
  },
  certainty: {
    observed: 'Observed',
    likely: 'Likely',
    possible: 'Possible',
    unlikely: 'Unlikely',
    unknown: 'Unknown',
  },
  severity: {
    extreme: 'Extreme',
    severe: 'Severe',
    moderate: 'Moderate',
    minor: 'Minor',
    unknown: 'Unknown',
  },
  status: {
    actual: 'Actual',
    exercise: 'Exercise',
    system: 'System',
    test: 'Test',
    draft: 'Draft',
  },
  urgency: {
    immediate: 'Immediate',
    expected: 'Expected',
    future: 'Future',
    past: 'Past',
    unknown: 'Unknown',
  },
} as const;

const WEATHER_ALERT_NUMERIC_ENUMS = {
  certainty: {
    '0': 'Observed',
    '1': 'Likely',
    '2': 'Possible',
    '3': 'Unlikely',
    '4': 'Unknown',
  },
  severity: {
    '0': 'Extreme',
    '1': 'Severe',
    '2': 'Moderate',
    '3': 'Minor',
    '4': 'Unknown',
  },
  status: {
    '0': 'Active',
    '1': 'Updated',
    '2': 'Expired',
    '3': 'Cancelled',
  },
  urgency: {
    '0': 'Immediate',
    '1': 'Expected',
    '2': 'Future',
    '3': 'Past',
    '4': 'Unknown',
  },
} as const;

const toHumanReadableFallback = (value: unknown): string => {
  return coerceWeatherAlertValue(value)
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const normalizeWeatherAlertSeverity = (value: unknown): string => {
  const normalizedSeverity = normalizeWeatherAlertValue(value);
  const numericSeverity = WEATHER_ALERT_NUMERIC_ENUMS.severity[normalizedSeverity as keyof typeof WEATHER_ALERT_NUMERIC_ENUMS.severity];
  if (numericSeverity) {
    return numericSeverity;
  }

  return WEATHER_ALERT_TRANSLATION_KEYS.severity[normalizedSeverity as keyof typeof WEATHER_ALERT_TRANSLATION_KEYS.severity] ?? coerceWeatherAlertValue(value).trim();
};

export const formatWeatherAlertTranslation = (t: WeatherAlertTranslationFunction, group: keyof typeof WEATHER_ALERT_TRANSLATION_KEYS, value: unknown): string => {
  const trimmedValue = coerceWeatherAlertValue(value).trim();
  if (trimmedValue.length === 0) {
    return '';
  }

  const normalizedValue = normalizeWeatherAlertValue(trimmedValue);
  const numericEnumValue = WEATHER_ALERT_NUMERIC_ENUMS[group as keyof typeof WEATHER_ALERT_NUMERIC_ENUMS]?.[normalizedValue as never];
  if (numericEnumValue) {
    return t(`weatherAlerts.${group}.${numericEnumValue}`);
  }

  const mappedValue = WEATHER_ALERT_TRANSLATION_KEYS[group][normalizedValue as keyof (typeof WEATHER_ALERT_TRANSLATION_KEYS)[typeof group]];

  if (mappedValue) {
    return t(`weatherAlerts.${group}.${mappedValue}`);
  }

  return toHumanReadableFallback(trimmedValue);
};

export const getWeatherAlertSeverityOrder = (value: unknown): number => {
  const normalizedSeverity = normalizeWeatherAlertSeverity(value);

  const severityOrder = {
    Extreme: 0,
    Severe: 1,
    Moderate: 2,
    Minor: 3,
    Unknown: 4,
  } as const;

  return severityOrder[normalizedSeverity as keyof typeof severityOrder] ?? severityOrder.Unknown;
};

export const isSevereWeatherAlert = (value: unknown): boolean => {
  return getWeatherAlertSeverityOrder(value) <= 1;
};
