export enum CallVideoFeedFormat {
  RTSP = 0,
  HLS = 1,
  MJPEG = 2,
  YouTubeLive = 3,
  WebRTC = 4,
  DASH = 5,
  Embed = 6,
  Other = 99,
}

export enum CallVideoFeedType {
  Drone = 0,
  FixedCamera = 1,
  BodyCam = 2,
  TrafficCam = 3,
  WeatherCam = 4,
  SatelliteFeed = 5,
  WebCam = 6,
  Other = 99,
}

export enum CallVideoFeedStatus {
  Active = 0,
  Inactive = 1,
  Error = 2,
}
