// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  baseApiUrl: window["env"]["baseApiUrl"] || 'https://qaapi.resgrid.com',
  resgridApiUrl: window["env"]["resgridApiUrl"] || '/api/v4',
  channelUrl: window["env"]["channelUrl"] || 'https://qaevents.resgrid.com/',
  channelHubName: window["env"]["channelHubName"] || 'eventingHub',
  realtimeGeolocationHubName: window["env"]["realtimeGeolocationHubName"] || 'geolocationHub',
  logLevel: window["env"]["logLevel"] || 0,
  isDemo: window["env"]["isDemo"] || false,
  demoToken: window["env"]["demoToken"] || 'DEMOTOKEN',
  version: '99.99.99',
  loggingKey: window["env"]["loggingKey"] || 'LOGGINGKEY',
  appKey: window["env"]["appKey"] || 'APPKEY',
  appShellConfig: {
    debug: false,
    networkDelay: 500
  }
};


/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
