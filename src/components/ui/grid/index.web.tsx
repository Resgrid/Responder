import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import React from 'react';

import { gridItemStyle, gridStyle } from './styles';

type IGridProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof gridStyle> & {
    gap?: number;
    rowGap?: number;
    columnGap?: number;
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    padding?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingStart?: number;
    paddingEnd?: number;
    _extra: {
      className: string;
    };
    testID?: string;
  };

const Grid = React.forwardRef<HTMLDivElement, IGridProps>(function Grid({ className, _extra, testID, ...props }, ref) {
  const gridClass = _extra?.className;
  const finalGridClass = gridClass ?? '';
  return (
    <div
      ref={ref}
      className={gridStyle({
        class: className + ' ' + finalGridClass,
      })}
      data-testid={testID}
      {...props}
    />
  );
});

type IGridItemProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof gridItemStyle> & {
    index?: number;
    _extra: {
      className: string;
    };
  };
const GridItem = React.forwardRef<HTMLDivElement, IGridItemProps>(function GridItem({ className, _extra, ...props }, ref) {
  const gridItemClass = _extra?.className;

  const finalGridItemClass = gridItemClass ?? '';
  return (
    <div
      ref={ref}
      className={gridItemStyle({
        class: className + ' ' + finalGridItemClass,
      })}
      {...props}
    />
  );
});

Grid.displayName = 'Grid';
GridItem.displayName = 'GridItem';

export { Grid, GridItem };
