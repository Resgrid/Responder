// @ts-nocheck
import React from 'react';

export function Button(props: any) {
  return React.createElement('button', { ...props, type: 'button' }, props.children);
}

export function ButtonText(props: any) {
  return React.createElement('span', props, props.children);
}
