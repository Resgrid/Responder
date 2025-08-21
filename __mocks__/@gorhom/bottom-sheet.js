// Manual mock for @gorhom/bottom-sheet
const React = require('react');
const { View } = require('react-native');

function BottomSheet(props) {
  return React.createElement(View, null, props.children);
}

function BottomSheetBackdrop(props) {
  return React.createElement(View, null, props.children);
}

function BottomSheetView(props) {
  return React.createElement(View, null, props.children);
}

module.exports = {
  __esModule: true,
  default: BottomSheet,
  BottomSheetBackdrop,
  BottomSheetView,
};
