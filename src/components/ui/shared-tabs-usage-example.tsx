/**
 * Example usage of the SharedTabs component with custom font size
 */

/*
Example 1: Using small font size for compact layout
const compactTabs = [
  { key: 'overview', title: 'Overview', content: <div>Overview content</div> },
  { key: 'details', title: 'Details', content: <div>Details content</div> },
  { key: 'history', title: 'History', content: <div>History content</div> }
];

Small font size for tight space:
<SharedTabs tabs={compactTabs} titleFontSize="text-2xs" />

Example 2: Using large font size for better visibility
const accessibleTabs = [
  { key: 'home', title: 'Home', content: <div>Home content</div> },
  { key: 'settings', title: 'Settings', content: <div>Settings content</div> }
];

Large font size for accessibility:
<SharedTabs tabs={accessibleTabs} titleFontSize="text-lg" />

Example 3: Default behavior (no titleFontSize prop)
Uses responsive sizing based on size prop and screen orientation:
<SharedTabs tabs={compactTabs} size="sm" />  // Will use text-2xs/text-xs
<SharedTabs tabs={compactTabs} size="md" />  // Will use text-xs/text-sm  
<SharedTabs tabs={compactTabs} size="lg" />  // Will use text-sm/text-base

Example 4: Custom font size overrides size-based defaults:
<SharedTabs 
  tabs={compactTabs} 
  size="lg" 
  titleFontSize="text-xs"  // Overrides the large size default
/>

Available titleFontSize options:
- 'text-2xs' - Extra small text
- 'text-xs' - Small text
- 'text-sm' - Small-medium text
- 'text-base' - Base text size
- 'text-lg' - Large text
- 'text-xl' - Extra large text
*/
