/* eslint-disable no-undef */
// Manual mock for @react-native-community/netinfo
const NetInfo = {
  // Mock fetch to return connected by default
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  // Mock addEventListener to return an unsubscribe function
  addEventListener: jest.fn(() => () => {}),
  // Provide RNCNetInfo to satisfy native module expectations
  RNCNetInfo: {},
};
// Export default and named exports
module.exports = NetInfo;
module.exports.default = NetInfo;
