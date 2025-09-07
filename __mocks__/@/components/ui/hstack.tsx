// @ts-nocheck
import React from 'react';

export function HStack(props: any) {
  return React.createElement('div', { ...props, style: { display: 'flex', flexDirection: 'row', ...(props.style || {}) } }, props.children);
}
