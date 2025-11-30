'use client';
import React from 'react';
import { ActivityIndicator, ActivityIndicatorProps } from 'react-native';
import { tva, type VariantProps } from '@gluestack-ui/utils/nativewind-utils';

const spinnerStyle = tva({
  base: '',
  variants: {
    size: {
      sm: '',
      md: '',
      lg: '',
    },
  },
});

// Map size variants to ActivityIndicator sizes
const sizeMap: Record<string, 'small' | 'large'> = {
  sm: 'small',
  md: 'small',
  lg: 'large',
};

type ISpinnerProps = Omit<ActivityIndicatorProps, 'size'> &
  VariantProps<typeof spinnerStyle> & {
    className?: string;
  };

const Spinner = React.forwardRef<
  React.ElementRef<typeof ActivityIndicator>,
  ISpinnerProps
>(({ className, size = 'md', color, ...props }, ref) => {
  return (
    <ActivityIndicator
      ref={ref}
      size={sizeMap[size as string] || 'small'}
      color={color}
      {...props}
      className={spinnerStyle({ size, class: className })}
    />
  );
});

Spinner.displayName = 'Spinner';

export { Spinner };
export type { ISpinnerProps };
