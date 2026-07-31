import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import React, { forwardRef, memo } from 'react';
import { StyleSheet } from 'react-native';

import { headingStyle } from './styles';
type IHeadingProps = VariantProps<typeof headingStyle> &
  React.ComponentPropsWithoutRef<'h1'> & {
    as?: React.ElementType;
    testID?: string;
    numberOfLines?: number;
  };

const getMergedHeadingStyle = (numberOfLines?: number, style?: IHeadingProps['style']): React.CSSProperties | undefined => {
  const lineClampStyle: React.CSSProperties | undefined = numberOfLines
    ? {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: numberOfLines,
        overflow: 'hidden',
      }
    : undefined;
  const flatStyle = StyleSheet.flatten(style) as React.CSSProperties | undefined;
  return lineClampStyle ? { ...lineClampStyle, ...flatStyle } : flatStyle;
};

const MappedHeading = memo(
  forwardRef<HTMLHeadingElement, IHeadingProps>(function MappedHeading({ size, className, isTruncated, bold, underline, strikeThrough, sub, italic, highlight, testID, numberOfLines, style, ...props }, ref) {
    const mergedStyle = getMergedHeadingStyle(numberOfLines, style);
    switch (size) {
      case '5xl':
      case '4xl':
      case '3xl':
        return (
          <h1
            className={headingStyle({
              size,
              isTruncated,
              bold,
              underline,
              strikeThrough,
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
      case '2xl':
        return (
          <h2
            className={headingStyle({
              size,
              isTruncated,
              bold,
              underline,
              strikeThrough,
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
      case 'xl':
        return (
          <h3
            className={headingStyle({
              size,
              isTruncated,
              bold,
              underline,
              strikeThrough,
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
      case 'lg':
        return (
          <h4
            className={headingStyle({
              size,
              isTruncated,
              bold,
              underline,
              strikeThrough,
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
      case 'md':
        return (
          <h5
            className={headingStyle({
              size,
              isTruncated,
              bold,
              underline,
              strikeThrough,
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
      case 'sm':
      case 'xs':
        return (
          <h6
            className={headingStyle({
              size,
              isTruncated,
              bold,
              underline,
              strikeThrough,
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
      default:
        return (
          <h4
            className={headingStyle({
              size,
              isTruncated,
              bold,
              underline,
              strikeThrough,
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
  })
);

const Heading = memo(
  forwardRef<HTMLHeadingElement, IHeadingProps>(function Heading({ className, size = 'lg', as: AsComp, testID, numberOfLines, style, ...props }, ref) {
    const { isTruncated, bold, underline, strikeThrough, sub, italic, highlight } = props;

    if (AsComp) {
      const mergedStyle = getMergedHeadingStyle(numberOfLines, style);
      return (
        <AsComp
          className={headingStyle({
            size,
            isTruncated,
            bold,
            underline,
            strikeThrough,
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

    return <MappedHeading className={className} size={size} ref={ref} numberOfLines={numberOfLines} style={style} {...props} />;
  })
);

Heading.displayName = 'Heading';

export { Heading };
