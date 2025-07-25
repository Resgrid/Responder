import { useRouter } from 'expo-router';
import { Calendar, CalendarCheck, Contact, Headphones, Home, ListTree, LogOut, type LucideIcon, Mail, Map, Megaphone, Mic, Notebook, Settings, User } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Divider } from '@/components/ui/divider';
import { HStack } from '@/components/ui/hstack';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAuthStore } from '@/lib/auth';
import { useAudioStreamStore } from '@/stores/app/audio-stream-store';
import { useLiveKitStore } from '@/stores/app/livekit-store';

import { AudioStreamBottomSheet } from '../audio-stream/audio-stream-bottom-sheet';

interface MenuItem {
  id: string;
  title: string;
  icon: LucideIcon;
  route: string;
  testID: string;
}

interface SideMenuProps {
  onNavigate?: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const { profile, logout } = useAuthStore();
  const { isConnected, setIsBottomSheetVisible, toggleMicrophone } = useLiveKitStore();
  const { currentStream, isPlaying, setIsBottomSheetVisible: setAudioStreamBottomSheetVisible } = useAudioStreamStore();

  const menuItems: MenuItem[] = [
    {
      id: 'home',
      title: t('tabs.home'),
      icon: Home,
      route: '/(app)/',
      testID: 'side-menu-home',
    },
    {
      id: 'messages',
      title: t('tabs.messages'),
      icon: Mail,
      route: '/(app)/messages',
      testID: 'side-menu-messages',
    },
    {
      id: 'contacts',
      title: t('tabs.contacts'),
      icon: Contact,
      route: '/(app)/contacts',
      testID: 'side-menu-contacts',
    },
    {
      id: 'map',
      title: t('tabs.map'),
      icon: Map,
      route: '/(app)/map',
      testID: 'side-menu-map',
    },
    {
      id: 'notes',
      title: t('tabs.notes'),
      icon: Notebook,
      route: '/(app)/notes',
      testID: 'side-menu-notes',
    },
    {
      id: 'protocols',
      title: t('tabs.protocols'),
      icon: ListTree,
      route: '/(app)/protocols',
      testID: 'side-menu-protocols',
    },
    {
      id: 'calendar',
      title: t('tabs.calendar'),
      icon: Calendar,
      route: '/calendar',
      testID: 'side-menu-calendar',
    },
    {
      id: 'shifts',
      title: t('tabs.shifts'),
      icon: CalendarCheck,
      route: '/(app)/shifts',
      testID: 'side-menu-shifts',
    },
    {
      id: 'settings',
      title: t('tabs.settings'),
      icon: Settings,
      route: '/(app)/settings',
      testID: 'side-menu-settings',
    },
  ];

  const handleNavigation = (route: string) => {
    router.push(route as any);
    onNavigate?.();
  };

  const handleLogout = async () => {
    await logout();
    onNavigate?.();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const isDark = colorScheme === 'dark';

  return (
    <Box className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`} testID="side-menu-container">
      <ScrollView className="flex-1">
        <VStack space="md" className="flex-1 p-4">
          {/* Profile Section */}
          <Box className={`rounded-xl p-3 ${isDark ? 'border border-gray-700 bg-gray-800' : 'border border-gray-200 bg-gray-50'}`} testID="side-menu-profile">
            <HStack space="md" className="items-center">
              <Avatar size="lg" className="border-2 border-primary-500">
                <AvatarFallbackText className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{getInitials(profile?.name)}</AvatarFallbackText>
                {/* AvatarImage can be added here when profile image URL is available */}
              </Avatar>

              <VStack space="xs" className="flex-1">
                <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`} testID="side-menu-profile-name" numberOfLines={1}>
                  {profile?.name || t('common.unknown_user')}
                </Text>
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`} testID="side-menu-profile-id">
                  ID: {profile?.sub?.slice(-8) || '--------'}
                </Text>
              </VStack>
            </HStack>
          </Box>

          <Divider className={isDark ? 'bg-gray-700' : 'bg-gray-200'} />

          {/* Audio Controls */}
          <HStack space="md" className="px-2">
            {/* PTT Button */}
            <Pressable
              onPress={() => {
                if (isConnected) {
                  // If connected, either toggle microphone or re-open bottom sheet
                  // For better UX, let's re-open the bottom sheet to show connection status
                  setIsBottomSheetVisible(true);
                } else {
                  // Open LiveKit bottom sheet if not connected
                  setIsBottomSheetVisible(true);
                }
              }}
              className={`flex-1 rounded-lg border px-3 py-2 ${isConnected
                ? isDark
                  ? 'border-green-600 bg-green-600 hover:bg-green-700 active:bg-green-800'
                  : 'border-green-600 bg-green-600 hover:bg-green-700 active:bg-green-800'
                : isDark
                  ? 'border-green-600 bg-transparent hover:bg-green-900/20 active:bg-green-900/30'
                  : 'border-green-600 bg-transparent hover:bg-green-50 active:bg-green-100'
                }`}
              testID="side-menu-ptt-button"
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <HStack space="sm" className="items-center justify-center">
                <Mic size={18} color={isConnected ? '#fff' : isDark ? '#22c55e' : '#16a34a'} />
                <Text className={`text-sm font-medium ${isConnected ? 'text-white' : isDark ? 'text-green-400' : 'text-green-700'}`}>{t('sidebar.ptt')}</Text>
              </HStack>
            </Pressable>

            {/* Audio Stream Button */}
            <Pressable
              onPress={() => {
                // Always open the audio stream bottom sheet
                // If currently playing, it will show the current stream and allow control
                // If not playing, it will show available streams
                setAudioStreamBottomSheetVisible(true);
              }}
              className={`flex-1 rounded-lg border px-3 py-2 ${currentStream && isPlaying
                ? isDark
                  ? 'border-blue-600 bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                  : 'border-blue-600 bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                : isDark
                  ? 'border-blue-600 bg-transparent hover:bg-blue-900/20 active:bg-blue-900/30'
                  : 'border-blue-600 bg-transparent hover:bg-blue-50 active:bg-blue-100'
                }`}
              testID="side-menu-audio-button"
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <HStack space="sm" className="items-center justify-center">
                <Headphones size={18} color={currentStream && isPlaying ? '#fff' : isDark ? '#3b82f6' : '#2563eb'} />
                <Text className={`text-sm font-medium ${currentStream && isPlaying ? 'text-white' : isDark ? 'text-blue-400' : 'text-blue-700'}`}>{t('sidebar.audio')}</Text>
              </HStack>
            </Pressable>
          </HStack>

          {/* Navigation Menu */}
          <VStack space="xs" className="flex-1">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleNavigation(item.route)}
                  className={`rounded-lg p-3 ${isDark ? 'hover:bg-gray-800 active:bg-gray-700' : 'hover:bg-gray-50 active:bg-gray-100'}`}
                  testID={item.testID}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <HStack space="md" className="items-center">
                    <Box className={`rounded-lg p-2 ${isDark ? 'bg-primary-900' : 'bg-primary-50'}`}>
                      <IconComponent size={20} color={isDark ? '#60a5fa' : '#3b82f6'} />
                    </Box>
                    <Text className={`flex-1 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</Text>
                  </HStack>
                </Pressable>
              );
            })}
          </VStack>
        </VStack>
      </ScrollView>

      {/* Audio Stream Bottom Sheet */}
      <AudioStreamBottomSheet />
    </Box>
  );
};

export default SideMenu;
