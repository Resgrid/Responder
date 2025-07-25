import React from 'react';

import { Box } from '@/components/ui/box';

import Sidebar from './sidebar';

const WebSidebar = () => {
  return (
    <Box className="hidden w-full max-w-[340px] flex-1 pl-12 md:flex md:web:max-h-[calc(100vh-144px)]">
      {/* common sidebar contents for web and mobile */}
      <Sidebar />
    </Box>
  );
};
export default WebSidebar;
