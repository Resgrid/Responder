import { useColorScheme } from 'nativewind';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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

  // Get dynamic styles for better dark mode support
  const getTabStyle = (index: number) => {
    const isActive = index === currentIndex;

    // Base styles
    const baseStyle = {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
    };

    // Size-based padding
    const sizeMap = {
      sm: { paddingHorizontal: isLandscape ? 12 : 8, paddingVertical: isLandscape ? 6 : 4 },
      md: { paddingHorizontal: isLandscape ? 16 : 12, paddingVertical: isLandscape ? 8 : 6 },
      lg: { paddingHorizontal: isLandscape ? 20 : 16, paddingVertical: isLandscape ? 10 : 8 },
    };

    const sizeStyle = sizeMap[size];

    // Variant-specific styles
    let variantStyle = {};
    switch (variant) {
      case 'default':
      case 'underlined':
        variantStyle = {
          borderBottomWidth: 2,
          borderBottomColor: isActive ? '#90D5FF' : 'transparent',
        };
        break;
      case 'pills':
        variantStyle = {
          backgroundColor: isActive ? '#90D5FF' : 'transparent',
          borderRadius: 20,
          marginHorizontal: 2,
        };
        break;
      case 'segmented':
        variantStyle = {
          backgroundColor: isActive ? '#90D5FF' : isDark ? '#374151' : '#F3F4F6',
          borderRadius: 6,
          marginHorizontal: 2,
        };
        break;
    }

    return { ...baseStyle, ...sizeStyle, ...variantStyle };
  };

  const getTextStyle = (index: number) => {
    const isActive = index === currentIndex;

    // Base text style
    const baseStyle = {
      fontWeight: isActive ? '600' : ('500' as const),
      fontSize: isLandscape ? (size === 'lg' ? 16 : size === 'md' ? 14 : 12) : size === 'lg' ? 14 : size === 'md' ? 12 : 10,
    };

    // Color based on variant and state
    let color;
    if (variant === 'pills' && isActive) {
      color = '#FFFFFF';
    } else if (variant === 'segmented' && isActive) {
      color = '#FFFFFF';
    } else if (isActive) {
      color = '#90D5FF';
    } else {
      color = isDark ? '#D1D5DB' : '#6B7280';
    }

    return { ...baseStyle, color };
  };

  // Container style
  const getContainerStyle = () => {
    const baseStyle = {
      flexDirection: 'row' as const,
      flex: 1,
    };

    let variantStyle = {};
    switch (variant) {
      case 'default':
      case 'underlined':
        variantStyle = {
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#374151' : '#E5E7EB',
        };
        break;
      case 'pills':
        variantStyle = {
          padding: 4,
        };
        break;
      case 'segmented':
        variantStyle = {
          backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
          padding: 4,
          borderRadius: 8,
        };
        break;
    }

    return { ...baseStyle, ...variantStyle };
  };

  return (
    <Box className={`flex-1 ${className}`}>
      {/* Tab Headers */}
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={getContainerStyle()}>
          {tabs.map((tab, index) => (
            <Pressable key={tab.key} style={getTabStyle(index)} onPress={() => handleTabPress(index)} className={tabClassName}>
              {tab.icon && <Box className={isLandscape ? 'mr-1.5' : 'mr-1'}>{tab.icon}</Box>}
              <Text style={getTextStyle(index)}>{typeof tab.title === 'string' ? t(tab.title) : tab.title}</Text>
              {tab.badge !== undefined && tab.badge > 0 && (
                <Box className={`${isLandscape ? 'ml-1.5' : 'ml-1'} min-w-[20px] items-center rounded-full bg-red-500 px-1.5 py-0.5`}>
                  <Text className="text-xs font-bold text-white">{tab.badge}</Text>
                </Box>
              )}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Box style={getContainerStyle()} className={tabsContainerClassName}>
          {tabs.map((tab, index) => (
            <Pressable key={tab.key} style={getTabStyle(index)} onPress={() => handleTabPress(index)} className={tabClassName}>
              {tab.icon && <Box className={isLandscape ? 'mr-1.5' : 'mr-1'}>{tab.icon}</Box>}
              <Text style={getTextStyle(index)}>{typeof tab.title === 'string' ? t(tab.title) : tab.title}</Text>
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
