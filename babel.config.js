module.exports = function (api) {
  api.cache(true);

  const isTest = process.env.NODE_ENV === 'test';

  const presets = isTest
    ? ['babel-preset-expo'] // Use regular Expo preset for tests without NativeWind
    : [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'];

  return {
    presets,
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@env': './src/lib/env.js',
            '@unitools/image': '@unitools/image-expo',
            '@unitools/router': '@unitools/router-expo',
            '@unitools/link': '@unitools/link-expo',
            '@tailwind.config': './tailwind.config.js',
            '@assets': './assets',
          },
          extensions: ['.ios.ts', '.android.ts', '.ts', '.ios.tsx', '.android.tsx', '.tsx', '.jsx', '.js', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
