const React = require('react');
const { View } = require('react-native');

// Mock implementation of WebView
const MockWebView = React.forwardRef((props, ref) => {
  return React.createElement(View, {
    ...props,
    ref,
    testID: props.testID || 'webview-mock',
  });
});

module.exports = {
  WebView: MockWebView,
  default: MockWebView,
};
