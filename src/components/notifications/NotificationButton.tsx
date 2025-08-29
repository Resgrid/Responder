import { useCounts } from '@novu/react-native';
import { BellIcon } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ActivityIndicator, Pressable, View } from '@/components/ui';
import { Text } from '@/components/ui/text';
interface NotificationButtonProps {
  onPress: () => void;
}

export const NotificationButton = ({ onPress }: NotificationButtonProps) => {
  const { t } = useTranslation();
  const { counts, isLoading } = useCounts({
    filters: [
      {
        read: false,
      },
    ],
  });

  if (isLoading) return <ActivityIndicator />;

  const notificationCount = counts?.[0]?.count || 0;
  const hasNotifications = notificationCount > 0;
  const displayCount = notificationCount > 99 ? t('settings.notifications_badge_overflow') : notificationCount.toString();

  return (
    <Pressable
      onPress={onPress}
      className="mr-2 p-2"
      testID="notification-button"
      accessibilityRole="button"
      accessibilityLabel={hasNotifications ? `${t('settings.notifications_button')}, ${notificationCount} unread` : t('settings.notifications_button')}
    >
      <View className="relative">
        <BellIcon size={24} className="text-gray-700 dark:text-gray-300" strokeWidth={2} />

        {hasNotifications ? (
          <View className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-red-500" testID="notification-badge">
            <Text className="text-xs font-bold text-white">{displayCount}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};
