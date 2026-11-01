const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const SERVICE_NAME = 'app.notifee.core.ForegroundService';

// Schemes src/lib/navigation.ts probes with Linking.canOpenURL before handing directions to a navigation
// app. Android 11+ answers false for any scheme the manifest does not declare in <queries>, even when the
// app is installed. (iOS declares the same schemes in LSApplicationQueriesSchemes in app.config.ts.)
const NAVIGATION_QUERY_SCHEMES = ['waze'];

/** Adds a VIEW-intent <queries> entry for each navigation scheme the manifest does not declare yet. */
const addNavigationAppQueries = (manifest) => {
  manifest.manifest.queries = manifest.manifest.queries || [];
  if (manifest.manifest.queries.length === 0) {
    manifest.manifest.queries.push({});
  }

  const declaresScheme = (scheme) => manifest.manifest.queries.some((query) => (query.intent || []).some((intent) => (intent.data || []).some((data) => data?.$?.['android:scheme'] === scheme)));

  const queries = manifest.manifest.queries[0];
  queries.intent = queries.intent || [];
  for (const scheme of NAVIGATION_QUERY_SCHEMES) {
    if (!declaresScheme(scheme)) {
      queries.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': scheme } }],
      });
    }
  }
  return manifest;
};

const withForegroundService = (config, { allowCleartextTraffic = false } = {}) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;

    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    addNavigationAppQueries(manifest);

    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    // Cleartext HTTP only in development builds (local API servers). Every other build is https-only so the
    // password grant and bearer tokens never leave the device unencrypted. Set explicitly, not just omitted, so a
    // prebuild that reuses an existing android/ dir drops an earlier 'true'. Debug builds still reach Metro: the
    // debug source-set manifest allows cleartext and overrides this one.
    mainApplication.$['android:usesCleartextTraffic'] = allowCleartextTraffic ? 'true' : 'false';

    // Disable adb/cloud backup of app data (PII, tokens)
    mainApplication.$['android:allowBackup'] = 'false';

    mainApplication['service'] = mainApplication['service'] || [];

    // Idempotent: a prebuild that reuses an existing android/ dir already has this service in
    // the base manifest — and non-clean prebuilds have already accumulated duplicates there — so
    // drop every copy before adding the canonical one.
    const serviceEntry = {
      $: {
        'android:name': SERVICE_NAME,
        // microphone only. mediaPlayback and connectedDevice are intentionally absent: this
        // service backs PTT capture, expo-audio owns its own mediaPlayback service for stream
        // playback, and Bluetooth PTT handsets run on the same microphone session. Play rejects
        // foreground-service types whose use case cannot be demonstrated in the app.
        'android:foregroundServiceType': 'microphone',
        'tools:replace': 'android:foregroundServiceType',
      },
    };
    mainApplication['service'] = mainApplication['service'].filter((service) => service?.$?.['android:name'] !== SERVICE_NAME);
    mainApplication['service'].push(serviceEntry);
    return config;
  });
};

module.exports = withForegroundService;
module.exports.addNavigationAppQueries = addNavigationAppQueries;
