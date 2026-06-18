const { withGradleProperties } = require('expo/config-plugins');

function setGradlePropertiesValue(config, key, value) {
  return withGradleProperties(config, (exportedConfig) => {
    const keyIdx = exportedConfig.modResults.findIndex((item) => item.type === 'property' && item.key === key);
    if (keyIdx >= 0) {
      exportedConfig.modResults.splice(keyIdx, 1, {
        type: 'property',
        key,
        value,
      });
    } else {
      exportedConfig.modResults.push({
        type: 'property',
        key,
        value,
      });
    }

    return exportedConfig;
  });
}

module.exports = function withCustomPlugin(config) {
  config = setGradlePropertiesValue(
    config,
    'org.gradle.jvmargs',
    '-Xmx4096m -XX:MaxMetaspaceSize=1024m' //Set data of your choice
  );

  // Limit native ABIs to the two real-device ARM architectures.
  // Dropping x86/x86_64 (emulator-only) halves the native lib build/merge/strip
  // work and disk usage in CI, while keeping full Play Store device coverage.
  config = setGradlePropertiesValue(config, 'reactNativeArchitectures', 'armeabi-v7a,arm64-v8a');

  return config;
};
