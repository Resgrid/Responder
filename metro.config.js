/* eslint-env node */

const { getSentryExpoConfig } = require('@sentry/react-native/metro');
//const { getDefaultConfig } = require('expo/metro-config');
//const path = require('path');
const { withNativewind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname, {
  isCSSEnabled: true,
});

// Force zustand (and subpaths) to resolve to its CJS build on web.
// Its ESM build uses `import.meta.env`, which Metro's web output does not support.
const path = require('path');
const zustandCjsRoot = path.dirname(require.resolve('zustand/package.json'));
const zustandSubpathMap = {
  zustand: 'index.js',
  'zustand/vanilla': 'vanilla.js',
  'zustand/traditional': 'traditional.js',
  'zustand/middleware': 'middleware.js',
  'zustand/shallow': 'shallow.js',
  'zustand/context': 'context.js',
  'zustand/middleware/immer': 'middleware/immer.js',
};
const defaultResolveRequest = config.resolver.resolveRequest;
const webModuleStubs = {
  'react-native-ble-manager': path.resolve(__dirname, 'src/stubs/react-native-ble-manager.web.ts'),
  '@livekit/react-native': path.resolve(__dirname, 'src/stubs/livekit-react-native.web.ts'),
  '@livekit/react-native-webrtc': path.resolve(__dirname, 'src/stubs/livekit-react-native-webrtc.web.ts'),
  'countly-sdk-react-native-bridge': path.resolve(__dirname, 'src/stubs/countly-sdk.web.ts'),
  'countly-sdk-react-native-bridge/CountlyConfig': path.resolve(__dirname, 'src/stubs/countly-config.web.ts'),
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (Object.prototype.hasOwnProperty.call(zustandSubpathMap, moduleName)) {
      return {
        type: 'sourceFile',
        filePath: path.join(zustandCjsRoot, zustandSubpathMap[moduleName]),
      };
    }
    if (Object.prototype.hasOwnProperty.call(webModuleStubs, moduleName)) {
      return {
        type: 'sourceFile',
        filePath: webModuleStubs[moduleName],
      };
    }
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 1. Watch all files within the monorepo
// 2. Let Metro know where to resolve packages and in what order
//config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Configure path aliases
//config.resolver.extraNodeModules = {
//  '@': path.resolve(__dirname, 'src'),
//  '@env': path.resolve(__dirname, 'src/lib/env.js'),
//  '@assets': path.resolve(__dirname, 'assets'),
//};

module.exports = withNativewind(config, { inlineRem: 16 });
