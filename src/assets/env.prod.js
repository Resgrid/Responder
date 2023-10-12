(function (window) {
    window['env'] = window['env'] || {};
  
    // Environment variables
    window['env']['baseApiUrl'] = '${BASE_API_URL}';
    window['env']['resgridApiUrl'] = '${API_URL}';
    window['env']['channelUrl'] = '${CHANNEL_URL}';
    window['env']['channelHubName'] = '${CHANNEL_HUB_NAME}';
    window['env']['realtimeGeolocationHubName'] = '${GEOLOCATION_HUB_NAME}';
    window['env']['logLevel'] = '${LOG_LEVEL}';
    window['env']['isDemo'] = '${IS_DEMO}';
    window['env']['demoToken'] = '${DEMO_TOKEN}';
    window['env']['loggingKey'] = '${LOGGING_KEY}';
    window['env']['appKey'] = '${APP_KEY}';
  })(this);