// @ts-nocheck
import React from 'react';

export function Avatar(props: any) {
  return React.createElement('div', { ...props, style: { width: '48px', height: '48px', borderRadius: '50%', ...(props.style || {}) } }, props.children);
}

export function AvatarImage(props: any) {
  return React.createElement('img', { ...props, alt: props.alt || '' });
}
