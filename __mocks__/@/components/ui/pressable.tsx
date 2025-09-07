// @ts-nocheck
import React from 'react';

export function Pressable(props: any) {
  return React.createElement('button', { ...props, type: 'button', onClick: props.onPress }, props.children);
}
