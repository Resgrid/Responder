export interface WeatherAlertSeverityScheduleData {
  Severity: string;
  Enabled: boolean;
  NotifyPush: boolean;
  NotifyEmail: boolean;
}

export interface WeatherAlertSettingsData {
  WeatherAlertsEnabled: boolean;
  MonitoredLatitude: string;
  MonitoredLongitude: string;
  MonitoredRadiusMiles: number;
  SourceType: string;
  SeveritySchedules: WeatherAlertSeverityScheduleData[];
}
