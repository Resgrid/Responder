(function (window) {
    window['env'] = window['env'] || {};
  
    // Environment variables
    window['env']['baseApiUrl'] = 'https://sjapi.resgrid.dev';
    window['env']['resgridApiUrl'] = '/api/v4';
    window['env']['channelUrl'] = 'https://sjevents.resgrid.dev/';
    window['env']['channelHubName'] = 'eventingHub';
    window['env']['realtimeGeolocationHubName'] = 'geolocationHub';
    window['env']['logLevel'] = '0';
    window['env']['isDemo'] = 'false';
    window['env']['demoToken'] = 'DEMOTOKEN';
    window['env']['loggingKey'] = 'LOGGINGKEY';
    window['env']['appKey'] = 'APPKEY';
  })(this);