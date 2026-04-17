import type { ApiResponse } from '@/types/api';

import type { WeatherAlertZoneResultData } from './weatherAlertZoneResultData';

export type WeatherAlertZonesResult = ApiResponse<WeatherAlertZoneResultData[]>;
