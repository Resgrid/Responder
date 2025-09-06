// Quick test to verify the actionsheet DragIndicatorWrapper is working
import React from 'react';

import { ActionsheetDragIndicatorWrapper } from './src/components/ui/actionsheet';

const TestComponent = () => {
  // This should not be undefined if the fix is correct
  console.log('ActionsheetDragIndicatorWrapper is:', ActionsheetDragIndicatorWrapper);

  return <ActionsheetDragIndicatorWrapper>Test content</ActionsheetDragIndicatorWrapper>;
};

export default TestComponent;
