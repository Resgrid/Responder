import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import React from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { hstackStyle } from './styles';

type IHStackProps = React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof hstackStyle> & { style?: StyleProp<ViewStyle>; testID?: string };

const HStack = React.forwardRef<React.ElementRef<'div'>, IHStackProps>(({ className, space, reversed, style, testID, ...props }, ref) => {
  const flatStyle = Array.isArray(style) ? StyleSheet.flatten(style) : style;
  return <div className={hstackStyle({ space, reversed, class: className })} style={flatStyle as React.CSSProperties} data-testid={testID} {...props} ref={ref} />;
});

HStack.displayName = 'HStack';

export { HStack };
