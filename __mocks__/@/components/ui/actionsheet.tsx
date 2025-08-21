// @ts-nocheck
import React from 'react';

export function Actionsheet(props: any) {
  const { isOpen, children } = props;
  return isOpen ? React.createElement(React.Fragment, null, children) : null;
}
export function ActionsheetBackdrop() {
  return React.createElement(React.Fragment, null);
}
export function ActionsheetContent(props: any) {
  return React.createElement(React.Fragment, null, props.children);
}
export function ActionsheetDragIndicator() {
  return React.createElement(React.Fragment, null);
}
export function ActionsheetDragIndicatorWrapper(props: any) {
  return React.createElement(React.Fragment, null, props.children);
}
