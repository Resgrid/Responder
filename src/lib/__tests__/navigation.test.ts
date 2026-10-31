import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { Linking, Platform } from 'react-native';

import { logger } from '../logging';
import { openMapsWithAddress, openMapsWithDirections } from '../navigation';

// Mock expo-router — the real module pulls in its vendored react-navigation tree, which
// needs far more of react-native than the minimal stub below provides.
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  },
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
}));

// Mock the logger
jest.mock('../logging', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// The per-device "Navigation app" setting, controlled per test.
let mockNavigationApp = 'default';
jest.mock('@/lib/storage/navigation-app', () => ({
  getNavigationApp: () => mockNavigationApp,
}));

const MockedLinking = Linking as jest.Mocked<typeof Linking>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

const setPlatform = (os: string) => {
  (Platform as { OS: string }).OS = os;
};

// Brussels Grand-Place, the kind of call location in the Belgian report.
const LAT = 50.8467;
const LNG = 4.3525;
const POINT = '50.8467,4.3525';
const ADDRESS = 'Grand-Place 1, 1000 Bruxelles';
const ENCODED_ADDRESS = 'Grand-Place%201%2C%201000%20Bruxelles';

const GOOGLE_WEB_POINT = `https://www.google.com/maps/dir/?api=1&destination=${POINT}&travelmode=driving`;
const GOOGLE_WEB_ADDRESS = `https://www.google.com/maps/dir/?api=1&destination=${ENCODED_ADDRESS}&travelmode=driving`;

describe('Navigation Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigationApp = 'default';
    setPlatform('ios');
    // Every app is "installed" unless a test says otherwise.
    MockedLinking.canOpenURL.mockResolvedValue(true);
    MockedLinking.openURL.mockResolvedValue(true);
  });

  afterEach(() => {
    setPlatform('ios');
  });

  describe('openMapsWithDirections — URL per navigation app and platform', () => {
    it.each([
      // [platform, navigation app, URL opened, URL probed with canOpenURL (or null)]
      ['ios', 'default', `maps://maps.apple.com/?daddr=${POINT}&dirflg=d`, null],
      ['ios', 'apple_maps', `maps://maps.apple.com/?daddr=${POINT}&dirflg=d`, null],
      ['ios', 'google_maps', `comgooglemaps://?daddr=${POINT}&directionsmode=driving`, `comgooglemaps://?daddr=${POINT}&directionsmode=driving`],
      ['ios', 'waze', `waze://?ll=${POINT}&navigate=yes`, `waze://?ll=${POINT}&navigate=yes`],
      ['android', 'default', `geo:${POINT}?q=${POINT}(Grand-Place)`, null],
      ['android', 'google_maps', `google.navigation:q=${POINT}`, null],
      // Apple Maps cannot be chosen on Android; a stale value behaves as the device default.
      ['android', 'apple_maps', `geo:${POINT}?q=${POINT}(Grand-Place)`, null],
      ['android', 'waze', `waze://?ll=${POINT}&navigate=yes`, `waze://?ll=${POINT}&navigate=yes`],
      ['web', 'default', GOOGLE_WEB_POINT, null],
      ['web', 'google_maps', GOOGLE_WEB_POINT, null],
      ['web', 'apple_maps', GOOGLE_WEB_POINT, null],
      ['web', 'waze', `https://waze.com/ul?ll=${POINT}&navigate=yes`, null],
      ['windows', 'default', GOOGLE_WEB_POINT, null],
      ['macos', 'waze', `https://waze.com/ul?ll=${POINT}&navigate=yes`, null],
    ])('%s + %s opens %s', async (platform, app, expectedUrl, probedUrl) => {
      setPlatform(platform);
      mockNavigationApp = app;

      const result = await openMapsWithDirections(LAT, LNG, 'Grand-Place');

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenCalledTimes(1);
      expect(MockedLinking.openURL).toHaveBeenCalledWith(expectedUrl);
      if (probedUrl) {
        expect(MockedLinking.canOpenURL).toHaveBeenCalledWith(probedUrl);
      } else {
        // geo:, google.navigation:, maps:// and https links are opened directly. On Android 11+
        // canOpenURL answers false for undeclared schemes, which used to divert every tap.
        expect(MockedLinking.canOpenURL).not.toHaveBeenCalled();
      }
    });

    it.each(['ios', 'android'])('opens the Waze universal link on %s when Waze is not installed', async (platform) => {
      setPlatform(platform);
      mockNavigationApp = 'waze';
      MockedLinking.canOpenURL.mockResolvedValue(false);

      const result = await openMapsWithDirections(LAT, LNG, 'Grand-Place');

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenCalledTimes(1);
      expect(MockedLinking.openURL).toHaveBeenCalledWith(`https://waze.com/ul?ll=${POINT}&navigate=yes`);
    });

    it('opens Google Maps on the web on iOS when the Google Maps app is not installed', async () => {
      mockNavigationApp = 'google_maps';
      MockedLinking.canOpenURL.mockResolvedValue(false);

      const result = await openMapsWithDirections(LAT, LNG, 'Grand-Place');

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenCalledTimes(1);
      expect(MockedLinking.openURL).toHaveBeenCalledWith(GOOGLE_WEB_POINT);
    });

    it('treats a canOpenURL failure as "not installed" and moves on', async () => {
      mockNavigationApp = 'waze';
      MockedLinking.canOpenURL.mockRejectedValue(new Error('scheme not declared'));

      const result = await openMapsWithDirections(LAT, LNG);

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenCalledWith(`https://waze.com/ul?ll=${POINT}&navigate=yes`);
    });
  });

  describe('openMapsWithDirections — mobile-only navigation apps', () => {
    const ORIGIN = '50.8503,4.3517';

    it.each([
      // [platform, navigation app, URL opened]
      ['ios', 'gaia_gps', `gaiagps://map?lat=${LAT}&lng=${LNG}&z=14`],
      // Gaia GPS has no Android scheme; its universal link opens the app when it is installed.
      ['android', 'gaia_gps', `https://www.gaiagps.com/map/?lat=${LAT}&lon=${LNG}&zoom=14`],
      ['ios', 'here_wego', `https://share.here.com/r/mylocation/${POINT},Grand-Place?m=d`],
      ['android', 'here_wego', `https://share.here.com/r/mylocation/${POINT},Grand-Place?m=d`],
      ['ios', 'mapquest', `quest://search?q=${POINT}`],
      ['android', 'mapquest', `quest://search?q=${POINT}`],
      ['ios', 'onx_offroad', `https://offroad.onxmaps.com/offroad/map/query/${POINT}`],
      ['android', 'onx_offroad', `https://offroad.onxmaps.com/offroad/map/query/${POINT}`],
      // Without an origin Organic Maps can only drop a pin: its route link needs a start point.
      ['ios', 'organic_maps', `om://map?v=1&ll=${POINT}&n=Grand-Place`],
      ['android', 'organic_maps', `om://map?v=1&ll=${POINT}&n=Grand-Place`],
      ['ios', 'osmand', `osmandmaps://navigate?lat=${LAT}&lon=${LNG}&title=Grand-Place`],
      ['android', 'osmand', `osmand.api://navigate?dest_lat=${LAT}&dest_lon=${LNG}&dest_name=Grand-Place&profile=car`],
    ])('%s + %s opens %s', async (platform, app, expectedUrl) => {
      setPlatform(platform);
      mockNavigationApp = app;

      const result = await openMapsWithDirections(LAT, LNG, 'Grand-Place');

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenCalledTimes(1);
      expect(MockedLinking.openURL).toHaveBeenCalledWith(expectedUrl);
      // Their schemes are opened directly, so none of them needs declaring for canOpenURL.
      expect(MockedLinking.canOpenURL).not.toHaveBeenCalled();
    });

    it.each(['ios', 'android'])('routes in Organic Maps from the origin on %s', async (platform) => {
      setPlatform(platform);
      mockNavigationApp = 'organic_maps';

      await openMapsWithDirections(LAT, LNG, 'Grand-Place', 50.8503, 4.3517);

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`om://route?sll=${ORIGIN}&saddr=&dll=${POINT}&daddr=Grand-Place&type=vehicle`);
    });

    it('names an unlabelled Organic Maps destination by its coordinates', async () => {
      mockNavigationApp = 'organic_maps';

      await openMapsWithDirections(LAT, LNG, undefined, 50.8503, 4.3517);

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`om://route?sll=${ORIGIN}&saddr=&dll=${POINT}&daddr=50.8467%2C4.3525&type=vehicle`);
    });

    it('starts HERE WeGo from the live location even when an origin is given', async () => {
      mockNavigationApp = 'here_wego';

      await openMapsWithDirections(LAT, LNG, undefined, 50.8503, 4.3517);

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`https://share.here.com/r/mylocation/${POINT}?m=d`);
    });

    it('encodes the separators of a HERE WeGo name, which sits in the link path', async () => {
      mockNavigationApp = 'here_wego';

      await openMapsWithDirections(LAT, LNG, 'Station 1, North/East');

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`https://share.here.com/r/mylocation/${POINT},Station%201%2C%20North%2FEast?m=d`);
    });

    it.each([
      // [platform, navigation app, fallback opened when the app is not installed]
      ['ios', 'gaia_gps', `https://www.gaiagps.com/map/?lat=${LAT}&lon=${LNG}&zoom=14`],
      ['ios', 'organic_maps', `https://omaps.app/map?v=1&ll=${POINT}&n=Grand-Place`],
      ['android', 'organic_maps', `https://omaps.app/map?v=1&ll=${POINT}&n=Grand-Place`],
      ['ios', 'osmand', `https://osmand.net/map/navigate/?end=${POINT}&profile=car`],
      ['android', 'osmand', `https://osmand.net/map/navigate/?end=${POINT}&profile=car`],
      ['ios', 'mapquest', GOOGLE_WEB_POINT],
      ['android', 'mapquest', GOOGLE_WEB_POINT],
    ])('%s + %s falls back to %s when the app is not installed', async (platform, app, expectedUrl) => {
      setPlatform(platform);
      mockNavigationApp = app;
      MockedLinking.openURL.mockRejectedValueOnce(new Error('No Activity found to handle Intent'));

      const result = await openMapsWithDirections(LAT, LNG, 'Grand-Place');

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenCalledTimes(2);
      expect(MockedLinking.openURL).toHaveBeenLastCalledWith(expectedUrl);
    });

    it.each(['gaia_gps', 'here_wego', 'mapquest', 'onx_offroad', 'organic_maps', 'osmand'])('opens Google Maps on the web for a stale %s choice on the web', async (app) => {
      setPlatform('web');
      mockNavigationApp = app;

      await openMapsWithDirections(LAT, LNG, 'Grand-Place');

      expect(MockedLinking.openURL).toHaveBeenCalledTimes(1);
      expect(MockedLinking.openURL).toHaveBeenCalledWith(GOOGLE_WEB_POINT);
    });

    it('logs only the URL schemes when nothing opens', async () => {
      setPlatform('android');
      mockNavigationApp = 'osmand';
      MockedLinking.openURL.mockRejectedValue(new Error('Failed'));

      const result = await openMapsWithDirections(LAT, LNG, 'Grand-Place');

      expect(result).toBe(false);
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Failed to open a navigation app',
        context: expect.objectContaining({ navigationApp: 'osmand', platform: 'android', schemes: ['osmand.api', 'https', 'https'] }),
      });
    });
  });

  describe('openMapsWithDirections — origin', () => {
    const ORIGIN = '50.8503,4.3517';

    it.each([
      ['ios', 'default', `maps://maps.apple.com/?saddr=${ORIGIN}&daddr=${POINT}&dirflg=d`],
      ['ios', 'google_maps', `comgooglemaps://?saddr=${ORIGIN}&daddr=${POINT}&directionsmode=driving`],
      ['web', 'default', `https://www.google.com/maps/dir/?api=1&origin=${ORIGIN}&destination=${POINT}&travelmode=driving`],
      // geo:, google.navigation: and Waze always start from the device's current location.
      ['android', 'default', `geo:${POINT}?q=${POINT}`],
      ['android', 'google_maps', `google.navigation:q=${POINT}`],
      ['android', 'waze', `waze://?ll=${POINT}&navigate=yes`],
      ['ios', 'waze', `waze://?ll=${POINT}&navigate=yes`],
    ])('%s + %s with an origin opens %s', async (platform, app, expectedUrl) => {
      setPlatform(platform);
      mockNavigationApp = app;

      await openMapsWithDirections(LAT, LNG, undefined, 50.8503, 4.3517);

      expect(MockedLinking.openURL).toHaveBeenCalledWith(expectedUrl);
    });

    it.each([
      ['(0,0) sentinel', 0, 0],
      ['non-numeric', 'abc', 'def'],
      ['out of range', 95, 4.35],
    ])('drops a %s origin', async (_label, originLat, originLng) => {
      await openMapsWithDirections(LAT, LNG, undefined, originLat, originLng);

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`maps://maps.apple.com/?daddr=${POINT}&dirflg=d`);
    });
  });

  describe('openMapsWithDirections — coordinate formatting', () => {
    beforeEach(() => {
      setPlatform('android');
    });

    it('accepts numeric strings', async () => {
      await openMapsWithDirections('50.8467', '4.3525');

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`geo:${POINT}?q=${POINT}`);
    });

    it('accepts a decimal comma from a locale-formatted source and always emits a dot', async () => {
      await openMapsWithDirections('50,8467', ' 4,3525 ');

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`geo:${POINT}?q=${POINT}`);
    });

    it('rounds to 6 decimals without exponent notation or trailing zeros', async () => {
      await openMapsWithDirections(50.846712345, -0.0000001);

      expect(MockedLinking.openURL).toHaveBeenCalledWith('geo:50.846712,0?q=50.846712,0');
    });

    it('keeps negative coordinates', async () => {
      await openMapsWithDirections(-33.8688, -151.2093);

      expect(MockedLinking.openURL).toHaveBeenCalledWith('geo:-33.8688,-151.2093?q=-33.8688,-151.2093');
    });

    it('encodes the label, including the parentheses that delimit it in a geo: query', async () => {
      await openMapsWithDirections(LAT, LNG, 'Station 1 (North) & Co');

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`geo:${POINT}?q=${POINT}(Station%201%20%28North%29%20%26%20Co)`);
    });

    it('omits a blank label', async () => {
      await openMapsWithDirections(LAT, LNG, '   ');

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`geo:${POINT}?q=${POINT}`);
    });
  });

  describe('openMapsWithDirections — unusable coordinates', () => {
    it.each([
      ['the (0,0) sentinel', 0, 0],
      ['string zeros', '0', '0'],
      ['NaN', Number.NaN, Number.NaN],
      ['non-numeric strings', 'abc', 'def'],
      ['empty strings', '', ''],
      ['null', null, null],
      ['undefined', undefined, undefined],
      ['an out-of-range latitude', 95, 4.35],
      ['an out-of-range longitude', 50.85, 185],
    ])('navigates to the fallback address for %s', async (_label, latitude, longitude) => {
      setPlatform('android');

      const result = await openMapsWithDirections(latitude, longitude, 'Grand-Place', undefined, undefined, ADDRESS);

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenCalledTimes(1);
      expect(MockedLinking.openURL).toHaveBeenCalledWith(`geo:0,0?q=${ENCODED_ADDRESS}`);
    });

    it('hands the fallback address to Waze', async () => {
      mockNavigationApp = 'waze';

      await openMapsWithDirections(0, 0, undefined, undefined, undefined, ADDRESS);

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`waze://?q=${ENCODED_ADDRESS}&navigate=yes`);
    });

    it('prefers usable coordinates over the fallback address', async () => {
      setPlatform('android');

      await openMapsWithDirections(LAT, LNG, undefined, undefined, undefined, ADDRESS);

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`geo:${POINT}?q=${POINT}`);
    });

    it('opens nothing and returns false without coordinates or an address', async () => {
      const result = await openMapsWithDirections(0, 0, 'Equator');

      expect(result).toBe(false);
      expect(MockedLinking.openURL).not.toHaveBeenCalled();
      expect(mockedLogger.warn).toHaveBeenCalled();
    });

    it('opens nothing for a blank fallback address', async () => {
      const result = await openMapsWithDirections(Number.NaN, Number.NaN, undefined, undefined, undefined, '   ');

      expect(result).toBe(false);
      expect(MockedLinking.openURL).not.toHaveBeenCalled();
    });
  });

  describe('openMapsWithDirections — failures', () => {
    it('falls back to Google Maps on the web when the geo: intent has no handler', async () => {
      setPlatform('android');
      MockedLinking.openURL.mockRejectedValueOnce(new Error('No Activity found to handle Intent'));

      const result = await openMapsWithDirections(LAT, LNG, 'Grand-Place');

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenNthCalledWith(1, `geo:${POINT}?q=${POINT}(Grand-Place)`);
      expect(MockedLinking.openURL).toHaveBeenNthCalledWith(2, GOOGLE_WEB_POINT);
    });

    it('falls back to Google Maps on the web when Google Maps is not installed on Android', async () => {
      setPlatform('android');
      mockNavigationApp = 'google_maps';
      MockedLinking.openURL.mockRejectedValueOnce(new Error('No Activity found to handle Intent'));

      const result = await openMapsWithDirections(LAT, LNG);

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenLastCalledWith(GOOGLE_WEB_POINT);
    });

    it('falls back to Google Maps on the web when Apple Maps fails to open', async () => {
      MockedLinking.openURL.mockRejectedValueOnce(new Error('Unable to open URL'));

      const result = await openMapsWithDirections(LAT, LNG);

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenLastCalledWith(GOOGLE_WEB_POINT);
    });

    it('returns false and logs only the URL schemes when nothing opens', async () => {
      setPlatform('android');
      mockNavigationApp = 'waze';
      MockedLinking.canOpenURL.mockResolvedValue(false);
      MockedLinking.openURL.mockRejectedValue(new Error('Failed'));

      const result = await openMapsWithDirections(0, 0, undefined, undefined, undefined, ADDRESS);

      expect(result).toBe(false);
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Failed to open a navigation app',
        context: expect.objectContaining({ navigationApp: 'waze', platform: 'android', schemes: ['waze', 'https', 'https'] }),
      });
      // The incident address stays out of the logs (and so out of Sentry).
      expect(JSON.stringify(mockedLogger.error.mock.calls)).not.toContain('Bruxelles');
    });
  });

  describe('openMapsWithAddress', () => {
    it.each([
      ['ios', 'default', `maps://maps.apple.com/?daddr=${ENCODED_ADDRESS}&dirflg=d`],
      ['ios', 'apple_maps', `maps://maps.apple.com/?daddr=${ENCODED_ADDRESS}&dirflg=d`],
      ['ios', 'google_maps', `comgooglemaps://?daddr=${ENCODED_ADDRESS}&directionsmode=driving`],
      ['ios', 'waze', `waze://?q=${ENCODED_ADDRESS}&navigate=yes`],
      ['android', 'default', `geo:0,0?q=${ENCODED_ADDRESS}`],
      ['android', 'google_maps', `google.navigation:q=${ENCODED_ADDRESS}`],
      ['android', 'waze', `waze://?q=${ENCODED_ADDRESS}&navigate=yes`],
      ['web', 'default', GOOGLE_WEB_ADDRESS],
      ['web', 'google_maps', GOOGLE_WEB_ADDRESS],
      ['web', 'waze', `https://waze.com/ul?q=${ENCODED_ADDRESS}&navigate=yes`],
      ['windows', 'default', GOOGLE_WEB_ADDRESS],
    ])('%s + %s opens %s', async (platform, app, expectedUrl) => {
      setPlatform(platform);
      mockNavigationApp = app;

      const result = await openMapsWithAddress(ADDRESS);

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenCalledTimes(1);
      expect(MockedLinking.openURL).toHaveBeenCalledWith(expectedUrl);
    });

    it.each([
      // [platform, navigation app, URL opened]
      ['ios', 'mapquest', `quest://search?q=${ENCODED_ADDRESS}`],
      ['android', 'mapquest', `quest://search?q=${ENCODED_ADDRESS}`],
      ['ios', 'organic_maps', `om://search?query=${ENCODED_ADDRESS}`],
      ['android', 'organic_maps', `om://search?query=${ENCODED_ADDRESS}`],
      // These apps cannot take an address, so it goes to the device default.
      ['ios', 'gaia_gps', `maps://maps.apple.com/?daddr=${ENCODED_ADDRESS}&dirflg=d`],
      ['android', 'gaia_gps', `geo:0,0?q=${ENCODED_ADDRESS}`],
      ['ios', 'here_wego', `maps://maps.apple.com/?daddr=${ENCODED_ADDRESS}&dirflg=d`],
      ['android', 'here_wego', `geo:0,0?q=${ENCODED_ADDRESS}`],
      ['ios', 'onx_offroad', `maps://maps.apple.com/?daddr=${ENCODED_ADDRESS}&dirflg=d`],
      ['android', 'onx_offroad', `geo:0,0?q=${ENCODED_ADDRESS}`],
      ['ios', 'osmand', `maps://maps.apple.com/?daddr=${ENCODED_ADDRESS}&dirflg=d`],
      // OsmAnd searches an address around a point, and openMapsWithAddress has none to give it.
      ['android', 'osmand', `geo:0,0?q=${ENCODED_ADDRESS}`],
    ])('%s + %s opens %s for an address', async (platform, app, expectedUrl) => {
      setPlatform(platform);
      mockNavigationApp = app;

      const result = await openMapsWithAddress(ADDRESS);

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenCalledTimes(1);
      expect(MockedLinking.openURL).toHaveBeenCalledWith(expectedUrl);
    });

    it('searches the fallback address around the origin in OsmAnd on Android', async () => {
      setPlatform('android');
      mockNavigationApp = 'osmand';

      await openMapsWithDirections(0, 0, undefined, 50.8503, 4.3517, ADDRESS);

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`osmand.api://navigate_search?dest_search_query=${ENCODED_ADDRESS}&search_lat=50.8503&search_lon=4.3517&profile=car`);
    });

    it.each(['ios', 'android'])('opens the Waze universal link for an address on %s when Waze is not installed', async (platform) => {
      setPlatform(platform);
      mockNavigationApp = 'waze';
      MockedLinking.canOpenURL.mockResolvedValue(false);

      await openMapsWithAddress(ADDRESS);

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`https://waze.com/ul?q=${ENCODED_ADDRESS}&navigate=yes`);
    });

    it('encodes special characters', async () => {
      setPlatform('android');
      const address = 'Rue de l’Étuve 46 & Rue du Chêne, Bruxelles';

      await openMapsWithAddress(address);

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`geo:0,0?q=${encodeURIComponent(address)}`);
    });

    it('trims the address', async () => {
      setPlatform('android');

      await openMapsWithAddress(`  ${ADDRESS}  `);

      expect(MockedLinking.openURL).toHaveBeenCalledWith(`geo:0,0?q=${ENCODED_ADDRESS}`);
    });

    it('falls back to Google Maps on the web when the geo: intent has no handler', async () => {
      setPlatform('android');
      MockedLinking.openURL.mockRejectedValueOnce(new Error('No Activity found to handle Intent'));

      const result = await openMapsWithAddress(ADDRESS);

      expect(result).toBe(true);
      expect(MockedLinking.openURL).toHaveBeenLastCalledWith(GOOGLE_WEB_ADDRESS);
    });

    it.each(['', '   '])('opens nothing and returns false for a blank address (%p)', async (address) => {
      const result = await openMapsWithAddress(address);

      expect(result).toBe(false);
      expect(MockedLinking.openURL).not.toHaveBeenCalled();
    });

    it('returns false when nothing opens', async () => {
      MockedLinking.openURL.mockRejectedValue(new Error('Failed'));

      const result = await openMapsWithAddress(ADDRESS);

      expect(result).toBe(false);
      expect(mockedLogger.error).toHaveBeenCalled();
    });
  });
});
