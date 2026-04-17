export enum WeatherAlertSeverity {
  Extreme = 'Extreme',
  Severe = 'Severe',
  Moderate = 'Moderate',
  Minor = 'Minor',
  Unknown = 'Unknown',
}

export enum WeatherAlertCategory {
  Met = 'Met',
  Geo = 'Geo',
  Fire = 'Fire',
  Health = 'Health',
  Env = 'Env',
  Transport = 'Transport',
  Infra = 'Infra',
  CBRNE = 'CBRNE',
  Other = 'Other',
}

export enum WeatherAlertUrgency {
  Immediate = 'Immediate',
  Expected = 'Expected',
  Future = 'Future',
  Past = 'Past',
  Unknown = 'Unknown',
}

export enum WeatherAlertCertainty {
  Observed = 'Observed',
  Likely = 'Likely',
  Possible = 'Possible',
  Unlikely = 'Unlikely',
  Unknown = 'Unknown',
}

export enum WeatherAlertStatus {
  Actual = 'Actual',
  Exercise = 'Exercise',
  System = 'System',
  Test = 'Test',
  Draft = 'Draft',
}

export enum WeatherAlertSourceType {
  NWS = 'NWS',
  EnvironmentCanada = 'EnvironmentCanada',
  MeteoAlarm = 'MeteoAlarm',
}

export const SEVERITY_COLORS: Record<string, string> = {
  [WeatherAlertSeverity.Extreme]: '#7B2D8E',
  [WeatherAlertSeverity.Severe]: '#DC2626',
  [WeatherAlertSeverity.Moderate]: '#F59E0B',
  [WeatherAlertSeverity.Minor]: '#3B82F6',
  [WeatherAlertSeverity.Unknown]: '#6B7280',
};

export const SEVERITY_ORDER: Record<string, number> = {
  [WeatherAlertSeverity.Extreme]: 0,
  [WeatherAlertSeverity.Severe]: 1,
  [WeatherAlertSeverity.Moderate]: 2,
  [WeatherAlertSeverity.Minor]: 3,
  [WeatherAlertSeverity.Unknown]: 4,
};

export const CATEGORY_ICONS: Record<string, string> = {
  [WeatherAlertCategory.Met]: 'CloudLightning',
  [WeatherAlertCategory.Fire]: 'Flame',
  [WeatherAlertCategory.Health]: 'Heart',
  [WeatherAlertCategory.Env]: 'Leaf',
  [WeatherAlertCategory.Geo]: 'Mountain',
  [WeatherAlertCategory.Transport]: 'Car',
  [WeatherAlertCategory.Infra]: 'Building',
  [WeatherAlertCategory.CBRNE]: 'AlertTriangle',
  [WeatherAlertCategory.Other]: 'AlertTriangle',
};
