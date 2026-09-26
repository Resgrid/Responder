import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { type ShiftViewMode } from '@/stores/shifts/store';

export interface ShiftSegment {
  key: ShiftViewMode;
  label: string;
  /** Count shown next to the label (pending approvals), hidden at 0. */
  badge?: number;
}

interface ShiftSegmentBarProps {
  segments: ShiftSegment[];
  active: ShiftViewMode;
  onChange: (key: ShiftViewMode) => void;
}

interface SegmentButtonProps {
  segment: ShiftSegment;
  isActive: boolean;
  onChange: (key: ShiftViewMode) => void;
}

const SegmentButton: React.FC<SegmentButtonProps> = React.memo(({ segment, isActive, onChange }) => {
  const { t } = useTranslation();
  const handlePress = useCallback(() => onChange(segment.key), [onChange, segment.key]);
  const badge = segment.badge ?? 0;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={badge > 0 ? t('shifts.segments.with_count', { label: segment.label, count: badge }) : segment.label}
      accessibilityHint={t('shifts.segments.a11y_hint')}
      testID={`shifts-segment-${segment.key}`}
      className={`mr-2 min-h-[40px] flex-row items-center rounded-full border px-4 py-2 ${isActive ? 'border-primary-600 bg-primary-600' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`}
    >
      <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{segment.label}</Text>
      {badge > 0 ? (
        <Box className={`ml-2 min-w-[20px] items-center rounded-full px-1.5 ${isActive ? 'bg-white' : 'bg-red-600'}`} testID={`shifts-segment-badge-${segment.key}`}>
          <Text className={`text-xs font-bold ${isActive ? 'text-primary-700' : 'text-white'}`}>{badge}</Text>
        </Box>
      ) : null}
    </Pressable>
  );
});

SegmentButton.displayName = 'SegmentButton';

/** Horizontally scrollable pill tabs: all fit on a tablet, and scroll rather than squash on a phone. */
export const ShiftSegmentBar: React.FC<ShiftSegmentBarProps> = ({ segments, active, onChange }) => (
  <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content} accessibilityRole="tablist" testID="shifts-segment-bar">
    {segments.map((segment) => (
      <SegmentButton key={segment.key} segment={segment} isActive={segment.key === active} onChange={onChange} />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
});
