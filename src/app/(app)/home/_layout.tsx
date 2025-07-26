import { Tabs } from 'expo-router';
import { Car, Flag, Home, Map, PersonStanding, PersonStandingIcon, Phone, User } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions } from 'react-native';

import { Icon } from '@/components/ui/icon';

export default function HomeLayout() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Hide header since parent layout handles it
        tabBarShowLabel: true,
        tabBarIconStyle: {
          width: 24,
          height: 24,
        },
        tabBarLabelStyle: {
          fontSize: isLandscape ? 12 : 10,
          fontWeight: '500',
        },
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: isLandscape ? 65 : 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <Icon as={Home} stroke={color} className="text-primary-500 dark:text-primary-400" />,
          tabBarButtonTestID: 'home-status-tab',
        }}
      />

      <Tabs.Screen
        name="personnel"
        options={{
          title: t('tabs.personnel'),
          tabBarIcon: ({ color }) => <Icon as={User} stroke={color} className="text-primary-500 dark:text-primary-400" />,
          tabBarButtonTestID: 'home-people-tab',
        }}
      />

      <Tabs.Screen
        name="units"
        options={{
          title: t('units.title'),
          tabBarIcon: ({ color }) => <Icon as={Car} stroke={color} className="text-primary-500 dark:text-primary-400" />,
          tabBarButtonTestID: 'home-units-tab',
        }}
      />

      <Tabs.Screen
        name="calls"
        options={{
          title: t('tabs.calls'),
          tabBarIcon: ({ color }) => <Icon as={Phone} stroke={color} className="text-primary-500 dark:text-primary-400" />,
          tabBarButtonTestID: 'home-calls-tab',
        }}
      />
    </Tabs>
  );
}
