// @ts-nocheck
import React from 'react';

export function VStack(props: any) {
  return React.createElement('div', { ...props, style: { display: 'flex', flexDirection: 'column', ...(props.style || {}) } }, props.children);
}
