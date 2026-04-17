import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export const Button = React.forwardRef<any, any>((props, ref) => (
  <Pressable ref={ref} {...props} />
));
Button.displayName = 'Button';

export const ButtonText = React.forwardRef<any, any>((props, ref) => (
  <Text ref={ref} {...props} />
));
ButtonText.displayName = 'ButtonText';

export const ButtonIcon = React.forwardRef<any, any>(({ as: Icon, ...props }, ref) => {
  if (Icon) {
    return <Icon ref={ref} {...props} />;
  }
  return <View ref={ref} {...props} />;
});
ButtonIcon.displayName = 'ButtonIcon';

export const ButtonGroup = React.forwardRef<any, any>((props, ref) => (
  <View ref={ref} {...props} />
));
ButtonGroup.displayName = 'ButtonGroup';

export const ButtonSpinner = React.forwardRef<any, any>((props, ref) => (
  <ActivityIndicator ref={ref} {...props} />
));
ButtonSpinner.displayName = 'ButtonSpinner';
