// Re-export the side menu content for native platforms.
// On web, metro resolves to side-menu.web.tsx instead.
// Using a separate side-menu-content.tsx file breaks the require cycle
// that occurred when side-menu.web.tsx imported './side-menu' — which on web
// resolved back to side-menu.web.tsx itself, causing infinite recursion / OOM.
export { default, SideMenu } from './side-menu-content';
