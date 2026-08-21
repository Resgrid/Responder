import { ArrowLeft, Calendar, ExternalLink, Trash2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, SafeAreaView, type StyleProp, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Constants
const SIDEBAR_WIDTH_RATIO = 0.85;
const SIDEBAR_MAX_WIDTH = 400;

// Color-dependent rules live here instead of the module-level StyleSheet so they follow the
// app theme (nativewind) rather than the system theme captured once at app launch.
const createThemedStyles = (isDark: boolean) =>
  StyleSheet.create({
    sidebarContainer: {
      backgroundColor: isDark ? '#171717' : '#fff',
      shadowColor: isDark ? '#262626' : '#e5e5e5',
    },
    header: {
      borderBottomColor: isDark ? '#333333' : '#e5e5e5',
    },
    headerTitle: {
      color: isDark ? '#f3f4f6' : '#111827',
    },
    dateText: {
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    timeText: {
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    typeTagDefault: {
      backgroundColor: isDark ? '#374151' : '#e5e7eb',
    },
    typeTagInfo: {
      backgroundColor: isDark ? '#1e40af' : '#dbeafe',
    },
    typeTagSuccess: {
      backgroundColor: isDark ? '#065f46' : '#d1fae5',
    },
    typeTagWarning: {
      backgroundColor: isDark ? '#92400e' : '#fef3c7',
    },
    typeTagAlert: {
      backgroundColor: isDark ? '#991b1b' : '#fee2e2',
    },
    title: {
      color: isDark ? '#f3f4f6' : '#111827',
    },
    bodyContainer: {
      backgroundColor: isDark ? '#262626' : '#f9fafb',
    },
    body: {
      color: isDark ? '#e5e5e5' : '#374151',
    },
    metadataDetailsContainer: {
      backgroundColor: isDark ? '#262626' : '#f9fafb',
    },
    metadataTitle: {
      color: isDark ? '#f3f4f6' : '#111827',
    },
    metadataKey: {
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    metadataValue: {
      color: isDark ? '#e5e5e5' : '#111827',
    },
    buttonText: {
      color: isDark ? '#3b82f6' : '#2563eb',
    },
    referenceButton: {
      backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
      borderColor: isDark ? '#3b82f6' : '#60a5fa',
    },
    referenceButtonIcon: {
      marginRight: 8,
      color: isDark ? '#3b82f6' : '#2563eb',
    },
  });

type ThemedStyles = ReturnType<typeof createThemedStyles>;

const useThemedStyles = () => {
  const { colorScheme } = useColorScheme();
  return React.useMemo(() => createThemedStyles(colorScheme === 'dark'), [colorScheme]);
};

// Define the interface directly in this file
interface NotificationPayload {
  id: string;
  title?: string;
  body: string;
  createdAt: string;
  read?: boolean;
  type?: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationDetailProps {
  notification: NotificationPayload;
  onClose: () => void;
  onDelete: (id: string) => void;
  onNavigateToReference: (referenceType: string, referenceId: string) => void;
}

export const NotificationDetail = ({ notification, onClose, onDelete, onNavigateToReference }: NotificationDetailProps) => {
  const { t } = useTranslation();
  const themed = useThemedStyles();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Sidebar geometry — recomputed on rotation / split view rather than captured at module load
  const sidebarWidth = Math.min(width * SIDEBAR_WIDTH_RATIO, SIDEBAR_MAX_WIDTH);
  const sidebarSizeStyle = React.useMemo(() => ({ width: sidebarWidth }), [sidebarWidth]);
  // RN's SafeAreaView only insets on iOS, so Android still needs the status bar padding applied
  // manually — from live safe-area insets instead of a hardcoded height.
  const headerInsetStyle = React.useMemo(() => ({ paddingTop: Platform.OS === 'android' ? insets.top + 16 : 16 }), [insets.top]);

  const slideAnim = React.useRef(new Animated.Value(sidebarWidth)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: sidebarWidth,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleDelete = () => {
    onDelete(notification.id);
    handleClose();
  };

  const handleNavigateToReference = () => {
    if (notification.referenceType && notification.referenceId) {
      onNavigateToReference(notification.referenceType, notification.referenceId);
      handleClose();
    }
  };

  // Format the date for display
  const formattedDate = new Date(notification.createdAt).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(notification.createdAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdropPressable} onPress={handleClose} />
      </Animated.View>

      <Animated.View style={[styles.sidebarContainer, themed.sidebarContainer, sidebarSizeStyle, { transform: [{ translateX: slideAnim }] }]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, themed.header, headerInsetStyle]}>
            <Pressable onPress={handleClose} style={styles.backButton}>
              <ArrowLeft size={24} className="text-primary-500 dark:text-primary-400" strokeWidth={2} />
            </Pressable>
            <Text style={[styles.headerTitle, themed.headerTitle]}>{t('notifications.notification')}</Text>
            <Pressable onPress={handleDelete} style={styles.deleteButton}>
              <Trash2 size={24} className="text-red-500 dark:text-red-400" strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={styles.metadataContainer}>
              <View style={styles.dateContainer}>
                <Calendar size={16} className="text-gray-500 dark:text-gray-400" strokeWidth={2} />
                <Text style={[styles.dateText, themed.dateText]}>{formattedDate}</Text>
              </View>
              <Text style={[styles.timeText, themed.timeText]}>{formattedTime}</Text>
            </View>

            {notification.type ? (
              <View style={[styles.typeTag, getTypeTagStyle(notification.type, themed)]}>
                <Text style={styles.typeTagText}>{notification.type}</Text>
              </View>
            ) : null}

            {notification.title ? <Text style={[styles.title, themed.title]}>{notification.title}</Text> : null}

            <View style={[styles.bodyContainer, themed.bodyContainer]}>
              <Text style={[styles.body, themed.body]}>{notification.body}</Text>
            </View>

            {notification.metadata && Object.keys(notification.metadata).length > 0 ? (
              <View style={[styles.metadataDetailsContainer, themed.metadataDetailsContainer]}>
                <Text style={[styles.metadataTitle, themed.metadataTitle]}>{t('notifications.additionalInformation')}</Text>
                {Object.entries(notification.metadata).map(([key, value]) => (
                  <View key={key} style={styles.metadataItem}>
                    <Text style={[styles.metadataKey, themed.metadataKey]}>{formatKey(key)}:</Text>
                    <Text style={[styles.metadataValue, themed.metadataValue]}>{formatValue(value, t('notifications.notAvailable'))}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {notification.referenceType && notification.referenceId ? (
              <Pressable onPress={handleNavigateToReference} style={[styles.referenceButton, themed.referenceButton]}>
                <ExternalLink size={18} style={themed.referenceButtonIcon} />
                <Text style={[styles.buttonText, themed.buttonText]}>{t('notifications.viewReference', { referenceType: notification.referenceType })}</Text>
              </Pressable>
            ) : null}
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

// Helper function to format metadata keys for display
const formatKey = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1') // Insert a space before all capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize the first letter
    .trim();
};

// Helper function to format metadata values for display. `fallback` is passed in already
// translated because this helper lives outside the component and has no access to `t`.
const formatValue = (value: unknown, fallback: string): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// Helper function to get tag style based on notification type. The themed styles are passed in
// because the tag colors follow the app theme and can no longer live on the static StyleSheet.
const getTypeTagStyle = (type: string, themed: ThemedStyles): StyleProp<ViewStyle> => {
  const lowerType = type.toLowerCase();

  if (lowerType.includes('alert') || lowerType.includes('emergency')) {
    return themed.typeTagAlert;
  } else if (lowerType.includes('warning')) {
    return themed.typeTagWarning;
  } else if (lowerType.includes('info')) {
    return themed.typeTagInfo;
  } else if (lowerType.includes('success')) {
    return themed.typeTagSuccess;
  } else {
    return themed.typeTagDefault;
  }
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
  },
  backdropPressable: {
    width: '100%',
    height: '100%',
  },
  sidebarContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10000,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  metadataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    marginLeft: 6,
  },
  timeText: {
    fontSize: 14,
  },
  typeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 16,
  },
  typeTagText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bodyContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  metadataDetailsContainer: {
    marginTop: 10,
    padding: 16,
    borderRadius: 8,
  },
  metadataTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  metadataItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  metadataKey: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  metadataValue: {
    fontSize: 14,
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  referenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});
