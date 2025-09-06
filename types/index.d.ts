// Temporary type fixes for compilation issues

declare module 'tailwind-variants/dist/config' {
  export interface TVConfig<V = any, EV = V> {
    [key: string]: any;
  }
}

// Component-specific overrides using module augmentation
declare module '@gluestack-ui/actionsheet' {
  interface ActionsheetProps {
    children?: React.ReactNode;
  }
}
