import { useColorScheme } from 'nativewind';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, useWindowDimensions } from 'react-native';
import { create } from 'zustand';

import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

// Tab state management with zustand
interface TabState {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

const useTabStore = create<TabState>((set) => ({
  activeIndex: 0,
  setActiveIndex: (index) => set({ activeIndex: index }),
}));

// Types for the tab items
export interface TabItem {
  key: string;
  title: string | React.ReactNode;
  content: React.ReactNode;
  icon?: React.ReactNode;
  badge?: number;
}

interface SharedTabsProps {
  tabs: TabItem[];
  initialIndex?: number;
  scrollable?: boolean;
  variant?: 'default' | 'pills' | 'underlined' | 'segmented';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tabClassName?: string;
  tabsContainerClassName?: string;
  contentClassName?: string;
  onChange?: (index: number) => void;
}

export const SharedTabs: React.FC<SharedTabsProps> = ({
  tabs,
  initialIndex = 0,
  scrollable = true,
  variant = 'default',
  size = 'md',
  className = '',
  tabClassName = '',
  tabsContainerClassName = '',
  contentClassName = '',
  onChange,
}) => {
  const { t } = useTranslation();
  const [localActiveIndex, setLocalActiveIndex] = useState(initialIndex);
  const { activeIndex, setActiveIndex } = useTabStore();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Use local state if no external state management is needed
  const currentIndex = onChange ? activeIndex : localActiveIndex;

  const handleTabPress = useCallback(
    (index: number) => {
      if (onChange) {
        setActiveIndex(index);
        onChange(index);
      } else {
        setLocalActiveIndex(index);
      }
    },
    [onChange, setActiveIndex]
  );

  // Get dynamic class names for tabs
  const getTabClassName = (index: number) => {
    const isActive = index === currentIndex;
    
    // Base classes
    let baseClasses = 'flex-1 items-center justify-center flex-row';
    
    // Size-based padding classes
    const sizeClasses = {
      sm: isLandscape ? 'px-3 py-1.5' : 'px-2 py-1',
      md: isLandscape ? 'px-4 py-2' : 'px-3 py-1.5',
      lg: isLandscape ? 'px-5 py-2.5' : 'px-4 py-2',
    };
    
    baseClasses += ` ${sizeClasses[size]}`;
    
    // Variant-specific classes
    switch (variant) {
      case 'default':
      case 'underlined':
        baseClasses += isActive ? ' border-b-2 border-sky-300' : ' border-b-2 border-transparent';
        break;
      case 'pills':
        baseClasses += isActive ? ' bg-sky-300 rounded-full mx-0.5' : ' bg-transparent rounded-full mx-0.5';
        break;
      case 'segmented':
        baseClasses += isActive ? ' bg-sky-300 rounded-md mx-0.5' : ' bg-gray-100 dark:bg-gray-700 rounded-md mx-0.5';
        break;
    }
    
    return baseClasses;
  };

  const getTextClassName = (index: number) => {
    const isActive = index === currentIndex;
    
    // Base text classes
    let textClasses = isActive ? 'font-semibold' : 'font-medium';
    
    // Size-based text classes
    const textSizeClasses = {
      sm: isLandscape ? 'text-xs' : 'text-[10px]',
      md: isLandscape ? 'text-sm' : 'text-xs',
      lg: isLandscape ? 'text-base' : 'text-sm',
    };
    
    textClasses += ` ${textSizeClasses[size]}`;
    
    // Color based on variant and state
    if (variant === 'pills' && isActive) {
      textClasses += ' text-white';
    } else if (variant === 'segmented' && isActive) {
      textClasses += ' text-white';
    } else if (isActive) {
      textClasses += ' text-sky-300';
    } else {
      textClasses += ' text-gray-600 dark:text-gray-300';
    }
    
    return textClasses;
  };

  // Container class names
  const getContainerClassName = () => {
    let containerClasses = 'flex-row flex-1';
    
    switch (variant) {
      case 'default':
      case 'underlined':
        containerClasses += ' border-b border-gray-200 dark:border-gray-700';
        break;
      case 'pills':
        containerClasses += ' p-1';
        break;
      case 'segmented':
        containerClasses += ' bg-gray-50 dark:bg-gray-800 p-1 rounded-lg';
        break;
    }
    
    return containerClasses;
  };

  return (
    <Box className={`flex-1 ${className}`}>
      {/* Tab Headers */}
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className={getContainerClassName()}>
          {tabs.map((tab, index) => (
            <Pressable key={tab.key} className={`${getTabClassName(index)} ${tabClassName}`} onPress={() => handleTabPress(index)}>
              {tab.icon && <Box className={isLandscape ? 'mr-1.5' : 'mr-1'}>{tab.icon}</Box>}
              <Text className={getTextClassName(index)}>{typeof tab.title === 'string' ? t(tab.title) : tab.title}</Text>
              {tab.badge !== undefined && tab.badge > 0 && (
                <Box className={`${isLandscape ? 'ml-1.5' : 'ml-1'} min-w-[20px] items-center rounded-full bg-red-500 px-1.5 py-0.5`}>
                  <Text className="text-xs font-bold text-white">{tab.badge}</Text>
                </Box>
              )}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Box className={`${getContainerClassName()} ${tabsContainerClassName}`}>
          {tabs.map((tab, index) => (
            <Pressable key={tab.key} className={`${getTabClassName(index)} ${tabClassName}`} onPress={() => handleTabPress(index)}>
              {tab.icon && <Box className={isLandscape ? 'mr-1.5' : 'mr-1'}>{tab.icon}</Box>}
              <Text className={getTextClassName(index)}>{typeof tab.title === 'string' ? t(tab.title) : tab.title}</Text>
              {tab.badge !== undefined && tab.badge > 0 && (
                <Box className={`${isLandscape ? 'ml-1.5' : 'ml-1'} min-w-[20px] items-center rounded-full bg-red-500 px-1.5 py-0.5`}>
                  <Text className="text-xs font-bold text-white">{tab.badge}</Text>
                </Box>
              )}
            </Pressable>
          ))}
        </Box>
      )}

      {/* Tab Content */}
      <Box className={`flex-1 ${contentClassName}`}>{tabs[currentIndex]?.content}</Box>
    </Box>
  );
};
