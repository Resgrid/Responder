import type { ApiResponse } from '@/types/api';

import type { WeatherAlertResultData } from './weatherAlertResultData';

export type ActiveWeatherAlertsResult = ApiResponse<WeatherAlertResultData[]>;
