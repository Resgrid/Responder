import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import React from 'react';
import { StyleSheet } from 'react-native';

import { textStyle } from './styles';

type ITextProps = React.ComponentProps<'span'> & VariantProps<typeof textStyle> & { testID?: string; numberOfLines?: number };

const Text = React.forwardRef<React.ElementRef<'span'>, ITextProps>(
  ({ className, isTruncated, bold, underline, strikeThrough, size = 'md', sub, italic, highlight, testID, numberOfLines, style, ...props }: { className?: string } & ITextProps, ref) => {
    const lineClampStyle: React.CSSProperties | undefined = numberOfLines
      ? {
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: numberOfLines,
          overflow: 'hidden',
        }
      : undefined;
    const flatStyle = StyleSheet.flatten(style) as React.CSSProperties | undefined;
    const mergedStyle = lineClampStyle ? { ...lineClampStyle, ...flatStyle } : flatStyle;
    return (
      <span
        className={textStyle({
          isTruncated,
          bold,
          underline,
          strikeThrough,
          size,
          sub,
          italic,
          highlight,
          class: className,
        })}
        style={mergedStyle}
        data-testid={testID}
        {...props}
        ref={ref}
      />
    );
  }
);

Text.displayName = 'Text';

export { Text };
