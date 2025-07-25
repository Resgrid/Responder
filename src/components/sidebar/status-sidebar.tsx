import * as React from 'react';

import { Text } from '@/components/ui/text';
import { useCoreStore } from '@/stores/app/core-store';

import { Card } from '../ui/card';

type ItemProps = {};

export const SidebarStatusCard = () => {
  const activeUnitStatus = useCoreStore((state) => state.activeUnitStatus);

  // Derive the display values from activeUnit when available, otherwise use defaults
  const displayStatus = activeUnitStatus?.State || 'Unknown';
  let displayColor = activeUnitStatus?.StateStyle ?? '';

  // Fix up the color values to match the design system
  if (displayColor === 'label-danger') {
    displayColor = '#ED5565';
  } else if (displayColor === 'label-info') {
    displayColor = '#23c6c8';
  } else if (displayColor === 'label-warning') {
    displayColor = '#f8ac59';
  } else if (displayColor === 'label-success') {
    displayColor = '#449d44';
  } else if (displayColor === 'label-onscene') {
    displayColor = '#449d44';
  } else if (displayColor === 'label-primary') {
    displayColor = '#228BCB';
  } else if (displayColor === 'label-returning') {
    displayColor = '';
  } else if (displayColor === 'label-default') {
    displayColor = '#262626';
  } else if (displayColor === 'label-enroute') {
    displayColor = '#449d44';
  }

  return (
    <Card className="flex-1 bg-background-50" style={{ backgroundColor: displayColor }} testID="status-card">
      <Text className="font-medium">{displayStatus}</Text>
    </Card>
  );
};
