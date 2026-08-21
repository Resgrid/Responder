import { Link, Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('not_found.title') }} />
      <View className="flex-1 items-center justify-center p-4">
        <Text className="mb-4 text-2xl font-bold">{t('not_found.message')}</Text>

        <Link href="/" className="mt-4">
          <Text className="text-blue-500 underline">{t('not_found.go_home')}</Text>
        </Link>
      </View>
    </>
  );
}
