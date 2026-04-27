import { useColorScheme } from 'nativewind';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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
  titleFontSize?: 'text-2xs' | 'text-xs' | 'text-sm' | 'text-base' | 'text-lg' | 'text-xl';
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
  titleFontSize,
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

  // Track which tabs have ever been activated so we can keep them mounted
  const [mountedTabs, setMountedTabs] = useState<Set<number>>(() => new Set([initialIndex]));

  // Use local state if no external state management is needed
  const currentIndex = onChange ? activeIndex : localActiveIndex;

  const handleTabPress = useCallback(
    (index: number) => {
      // Ensure this tab's content is kept mounted from now on
      setMountedTabs((prev) => {
        if (prev.has(index)) return prev;
        const next = new Set(prev);
        next.add(index);
        return next;
      });
      if (onChange) {
        setActiveIndex(index);
        onChange(index);
      } else {
        setLocalActiveIndex(index);
      }
    },
    [onChange, setActiveIndex]
  );

  // Get font size for title text
  const getTitleFontSize = () => {
    if (titleFontSize) {
      return titleFontSize;
    }

    // Default font sizes based on size and orientation
    const defaultSizes = {
      sm: isLandscape ? 'text-xs' : 'text-2xs',
      md: isLandscape ? 'text-sm' : 'text-xs',
      lg: isLandscape ? 'text-base' : 'text-sm',
    }[size];

    return defaultSizes;
  };

  // Determine tab styles based on variant and size
  const getTabStyles = (index: number) => {
    const isActive = index === currentIndex;

    const baseStyles = 'flex items-center justify-center';
    const sizeStyles = {
      sm: variant === 'segmented' ? (isLandscape ? 'px-3 py-1.5' : 'px-3 py-1') : isLandscape ? 'px-3 py-1.5' : 'px-2 py-1',
      md: variant === 'segmented' ? (isLandscape ? 'px-4 py-2.5' : 'px-4 py-2') : isLandscape ? 'px-4 py-2' : 'px-3 py-1.5',
      lg: variant === 'segmented' ? (isLandscape ? 'px-5 py-3' : 'px-4 py-2.5') : isLandscape ? 'px-5 py-2.5' : 'px-4 py-2',
    }[size];

    const variantStyles = {
      default: isActive ? 'border-b-2 border-primary-500 text-primary-500' : `border-b-2 border-transparent ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`,
      pills: isActive ? 'bg-primary-500 text-white rounded-full' : `bg-transparent ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`,
      underlined: isActive ? 'border-b-2 border-primary-500 text-primary-500' : `border-b-2 border-transparent ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`,
      segmented: isActive ? 'bg-primary-600 shadow-sm dark:bg-primary-500' : 'bg-transparent',
    }[variant];

    return `${baseStyles} ${sizeStyles} ${variantStyles} ${tabClassName}`;
  };

  const getTitleClassName = (index: number) => {
    const isActive = index === currentIndex;
    const baseStyles = isActive ? 'font-semibold' : 'font-medium';

    if (variant === 'segmented' || variant === 'pills') {
      return `${baseStyles} ${isActive ? 'text-white' : colorScheme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'}`;
    }

    return `${baseStyles} ${isActive ? (colorScheme === 'dark' ? 'text-primary-400' : 'text-primary-600') : colorScheme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`;
  };

  // Container styles based on variant
  const getContainerStyles = () => {
    const baseStyles = 'flex flex-row';

    const variantStyles = {
      default: colorScheme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200',
      pills: 'space-x-2 p-1',
      underlined: colorScheme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200',
      segmented: colorScheme === 'dark' ? 'rounded-2xl border border-neutral-800 bg-neutral-900 p-1.5' : 'rounded-2xl border border-neutral-200 bg-neutral-100 p-1.5',
    }[variant];

    return `${baseStyles} ${variantStyles} ${tabsContainerClassName}`;
  };

  // Convert Tailwind classes to style object
  const getContainerStyle = () => {
    const borderColor = colorScheme === 'dark' ? '#374151' : '#e5e7eb';
    const backgroundColor = colorScheme === 'dark' ? '#171717' : '#f5f5f5';

    const styles = StyleSheet.create({
      container: {
        flexDirection: 'row',
        ...(variant === 'default' && { borderBottomWidth: 1, borderBottomColor: borderColor }),
        ...(variant === 'pills' && { gap: 8, padding: 4 }),
        ...(variant === 'underlined' && { borderBottomWidth: 1, borderBottomColor: borderColor }),
        ...(variant === 'segmented' && { backgroundColor, padding: 6, borderRadius: 16, borderWidth: 1, borderColor }),
      },
    });
    return styles.container;
  };

  return (
    <Box className={`flex-1 ${className}`}>
      {/* Tab Headers */}
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={getContainerStyle()}>
          {tabs.map((tab, index) => (
            <Pressable key={tab.key} className={getTabStyles(index)} onPress={() => handleTabPress(index)}>
              {tab.icon && <Box className={isLandscape ? 'mr-1.5' : 'mr-1'}>{tab.icon}</Box>}
              {typeof tab.title === 'string' ? (
                <Text className={`${getTitleFontSize()} ${getTitleClassName(index)}`}>{t(tab.title)}</Text>
              ) : (
                <Text className={`${getTitleFontSize()} ${getTitleClassName(index)}`}>{tab.title}</Text>
              )}
              {tab.badge !== undefined && tab.badge > 0 && (
                <Box className={`${isLandscape ? 'ml-1.5' : 'ml-1'} min-w-[20px] items-center rounded-full bg-red-500 px-1.5 py-0.5`}>
                  <Text className="text-xs font-bold text-white">{tab.badge}</Text>
                </Box>
              )}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Box className={getContainerStyles()}>
          {tabs.map((tab, index) => (
            <Pressable key={tab.key} className={`flex-1 ${getTabStyles(index)}`} onPress={() => handleTabPress(index)}>
              {tab.icon && <Box className={isLandscape ? 'mr-1.5' : 'mr-1'}>{tab.icon}</Box>}
              {typeof tab.title === 'string' ? (
                <Text className={`${getTitleFontSize()} ${getTitleClassName(index)}`}>{t(tab.title)}</Text>
              ) : (
                <Text className={`${getTitleFontSize()} ${getTitleClassName(index)}`}>{tab.title}</Text>
              )}
              {tab.badge !== undefined && tab.badge > 0 && (
                <Box className={`${isLandscape ? 'ml-1.5' : 'ml-1'} min-w-[20px] items-center rounded-full bg-red-500 px-1.5 py-0.5`}>
                  <Text className="text-xs font-bold text-white">{tab.badge}</Text>
                </Box>
              )}
            </Pressable>
          ))}
        </Box>
      )}

      {/* Tab Content — each visited tab stays mounted; inactive tabs are hidden
          via display:none so NativeWind never has to re-upgrade them on revisit. */}
      <Box className={`flex-1 ${contentClassName}`}>
        {tabs.map((tab, index) => {
          if (!mountedTabs.has(index)) {
            return null;
          }
          return (
            <View key={tab.key} style={index === currentIndex ? tabContentStyles.active : tabContentStyles.hidden}>
              {tab.content}
            </View>
          );
        })}
      </Box>
    </Box>
  );
};

const tabContentStyles = StyleSheet.create({
  active: { flex: 1 },
  // display:'none' hides the view and removes it from layout without unmounting
  hidden: { display: 'none' },
});
