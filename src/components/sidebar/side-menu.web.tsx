import React from 'react';

import { Box } from '@/components/ui/box';

// Import from side-menu-content directly to avoid a require cycle.
// On web, './side-menu' resolves to side-menu.web.tsx (this file), not side-menu.tsx.
import SideMenu from './side-menu-content';

const WebSidebar = () => {
  return (
    <Box className="hidden w-full max-w-[340px] flex-1 pl-12 md:flex md:web:max-h-[calc(100vh-144px)]">
      {/* common sidebar contents for web and mobile */}
      <SideMenu />
    </Box>
  );
};
export default WebSidebar;
