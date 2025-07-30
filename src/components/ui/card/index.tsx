import type { VariantProps } from '@gluestack-ui/nativewind-utils';
import React from 'react';
import { View, type ViewProps } from 'react-native';

import { cardStyle } from './styles';

type ICardProps = ViewProps & VariantProps<typeof cardStyle> & { className?: string };

const Card = React.forwardRef<React.ElementRef<typeof View>, ICardProps>(({ className, size = 'md', variant = 'elevated', ...props }, ref) => {
  return <View className={cardStyle({ size, variant, class: className })} {...props} ref={ref} />;
});

Card.displayName = 'Card';

// CardContent component for layout consistency
type ICardContentProps = ViewProps & { className?: string };

const CardContent = React.forwardRef<React.ElementRef<typeof View>, ICardContentProps>(({ className, ...props }, ref) => {
  return <View className={`${className || ''}`} {...props} ref={ref} />;
});

CardContent.displayName = 'CardContent';

export { Card, CardContent };
