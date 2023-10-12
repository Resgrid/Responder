(function (window) {
    window['env'] = window['env'] || {};
  
    // Environment variables
    window['env']['baseApiUrl'] = 'https://qaapi.resgrid.com';
    window['env']['resgridApiUrl'] = '/api/v4';
    window['env']['channelUrl'] = 'https://qaevents.resgrid.com/';
    window['env']['channelHubName'] = 'eventingHub';
    window['env']['realtimeGeolocationHubName'] = 'geolocationHub';
    window['env']['logLevel'] = '0';
    window['env']['isDemo'] = 'false';
    window['env']['demoToken'] = 'DEMOTOKEN';
    window['env']['loggingKey'] = 'LOGGINGKEY';
    window['env']['appKey'] = 'APPKEY';
  })(this);