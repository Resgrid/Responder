/* eslint-env node */

const { getSentryExpoConfig } = require('@sentry/react-native/metro');
//const { getDefaultConfig } = require('expo/metro-config');
//const path = require('path');
const { withNativeWind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname, {
  isCSSEnabled: true,
});

// 1. Watch all files within the monorepo
// 2. Let Metro know where to resolve packages and in what order
//config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Configure path aliases
//config.resolver.extraNodeModules = {
//  '@': path.resolve(__dirname, 'src'),
//  '@env': path.resolve(__dirname, 'src/lib/env.js'),
//  '@assets': path.resolve(__dirname, 'assets'),
//};

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
