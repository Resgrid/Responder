import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import React from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { centerStyle } from './styles';

type ICenterProps = React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof centerStyle> & { style?: StyleProp<ViewStyle>; testID?: string };

const Center = React.forwardRef<HTMLDivElement, ICenterProps>(({ className, style, testID, ...props }, ref) => {
  const flatStyle = Array.isArray(style) ? StyleSheet.flatten(style) : style;
  return <div className={centerStyle({ class: className })} style={flatStyle as React.CSSProperties} data-testid={testID} {...props} ref={ref} />;
});

Center.displayName = 'Center';

export { Center };
