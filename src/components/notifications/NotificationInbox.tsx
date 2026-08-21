import { useNotifications } from '@novu/react-native';
import { FlashList } from '@shopify/flash-list';
import { CheckCircle, ChevronRight, Circle, ExternalLink, MoreVertical, Trash2, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Modal as RNModal, Platform, Pressable, RefreshControl, SafeAreaView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteMessage } from '@/api/novu/inbox';
import { NotificationDetail } from '@/components/notifications/NotificationDetail';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/lib/auth';
import { logger } from '@/lib/logging';
import { useCoreStore } from '@/stores/app/core-store';
import { useToastStore } from '@/stores/toast/store';
import { type NotificationPayload } from '@/types/notification';

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
      borderBottomColor: isDark ? '#333333' : '#eee',
    },
    selectionCount: {
      color: isDark ? '#ffffff' : '#000000',
    },
    confirmCard: {
      backgroundColor: isDark ? '#171717' : '#fff',
    },
    notificationItem: {
      borderBottomColor: isDark ? '#333333' : '#eee',
    },
    unreadNotificationItem: {
      backgroundColor: isDark ? '#262626' : '#f0f7ff',
    },
    selectedNotificationItem: {
      backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
    },
    unreadIndicator: {
      backgroundColor: isDark ? '#60a5fa' : '#3b82f6',
    },
    notificationBody: {
      color: isDark ? '#e5e5e5' : '#333333',
    },
    unreadNotificationText: {
      color: isDark ? '#ffffff' : '#000000',
    },
    timestamp: {
      color: isDark ? '#a3a3a3' : '#666',
    },
  });

const useThemedStyles = () => {
  const { colorScheme } = useColorScheme();
  return React.useMemo(() => createThemedStyles(colorScheme === 'dark'), [colorScheme]);
};

interface NotificationInboxProps {
  isOpen: boolean;
  onClose: () => void;
}

// Derived from the hook's own return type so we don't depend on @novu/js directly.
type NovuNotification = NonNullable<ReturnType<typeof useNotifications>['notifications']>[number];

const REFERENCE_TYPES = ['call', 'message', 'status', 'note', 'other'] as const;

const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const asReferenceType = (value: unknown): NotificationPayload['referenceType'] => REFERENCE_TYPES.find((candidate) => candidate === value);

// Novu v3 renamed these fields (title -> subject, read -> isRead, payload -> data). Reading the
// v2 names silently yielded undefined, which is why unread styling and the reference button never
// appeared. `data` is an untyped bag from the server, so every field is narrowed before use.
export const mapNovuNotification = (item: NovuNotification): NotificationPayload => {
  const data = item.data;

  return {
    id: item.id,
    title: item.subject,
    body: item.body,
    createdAt: item.createdAt,
    read: item.isRead,
    type: asString(data?.type),
    referenceId: asString(data?.referenceId),
    referenceType: asReferenceType(data?.referenceType),
    metadata: data,
  };
};

interface NotificationRowProps {
  item: NovuNotification;
  isSelectionMode: boolean;
  isSelected: boolean;
  onPress: (notification: NotificationPayload) => void;
  onLongPress: (notification: NotificationPayload) => void;
  onNavigateToReference: (referenceType: string, referenceId: string) => void;
}

const NotificationRow = React.memo(function NotificationRow({ item, isSelectionMode, isSelected, onPress, onLongPress, onNavigateToReference }: NotificationRowProps) {
  const themed = useThemedStyles();

  const notification: NotificationPayload = React.useMemo(() => mapNovuNotification(item), [item]);

  const createdAt = new Date(notification.createdAt);

  return (
    <Pressable
      onPress={() => onPress(notification)}
      onLongPress={() => onLongPress(notification)}
      style={[styles.notificationItem, themed.notificationItem, !notification.read ? themed.unreadNotificationItem : {}, isSelected ? themed.selectedNotificationItem : {}]}
    >
      {!notification.read ? <View style={[styles.unreadIndicator, themed.unreadIndicator]} /> : null}

      {isSelectionMode ? (
        <View style={styles.selectionIndicator}>
          {isSelected ? <CheckCircle size={24} className="text-primary-500 dark:text-primary-400" strokeWidth={2} /> : <Circle size={24} className="text-gray-400 dark:text-gray-500" strokeWidth={2} />}
        </View>
      ) : null}

      <View style={styles.notificationContent}>
        <Text style={[styles.notificationBody, themed.notificationBody, !notification.read ? [styles.unreadNotificationText, themed.unreadNotificationText] : {}]}>{notification.body}</Text>
        <Text style={[styles.timestamp, themed.timestamp]}>
          {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}
        </Text>
      </View>

      {!isSelectionMode ? (
        notification.referenceType && notification.referenceId ? (
          <View style={styles.actionButtons}>
            <Button onPress={() => onNavigateToReference(notification.referenceType!, notification.referenceId!)} variant="outline" className="size-8 p-0">
              <ExternalLink size={24} className="text-primary-500 dark:text-primary-400" strokeWidth={2} />
            </Button>
            <ChevronRight size={24} className="ml-2 text-gray-400" strokeWidth={2} />
          </View>
        ) : (
          <ChevronRight size={24} className="ml-2 text-gray-400" strokeWidth={2} />
        )
      ) : null}
    </Pressable>
  );
});

export const NotificationInbox = ({ isOpen, onClose }: NotificationInboxProps) => {
  const { t } = useTranslation();
  const themed = useThemedStyles();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const config = useCoreStore((state) => state.config);
  const userId = useAuthStore((state) => state.userId);
  const { notifications, isLoading, fetchMore, hasMore, refetch } = useNotifications();
  const showToast = useToastStore((state) => state.showToast);
  const [selectedNotification, setSelectedNotification] = useState<NotificationPayload | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  // Sidebar geometry — recomputed on rotation / split view rather than captured at module load
  const sidebarWidth = Math.min(width * SIDEBAR_WIDTH_RATIO, SIDEBAR_MAX_WIDTH);
  const sidebarSizeStyle = React.useMemo(() => ({ width: sidebarWidth }), [sidebarWidth]);
  // RN's SafeAreaView only insets on iOS, so Android still needs the status bar padding applied
  // manually — from live safe-area insets instead of a hardcoded height.
  const headerInsetStyle = React.useMemo(() => ({ paddingTop: Platform.OS === 'android' ? insets.top + 16 : 16 }), [insets.top]);

  // Animation values
  const slideAnim = useRef(new Animated.Value(sidebarWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
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
    } else {
      // Animate out and reset state
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
      ]).start();

      // Reset selection state when closing
      setIsSelectionMode(false);
      setSelectedNotificationIds(new Set());
      setSelectedNotification(null);
      setShowDeleteConfirmModal(false);
    }
  }, [isOpen, slideAnim, fadeAnim, sidebarWidth]);

  const toggleNotificationSelection = React.useCallback((notificationId: string) => {
    setSelectedNotificationIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  }, []);

  const handleNotificationPress = React.useCallback(
    (notification: NotificationPayload) => {
      if (isSelectionMode) {
        toggleNotificationSelection(notification.id);
      } else {
        setSelectedNotification(notification);
      }
    },
    [isSelectionMode, toggleNotificationSelection]
  );

  const enterSelectionMode = React.useCallback(() => {
    setIsSelectionMode(true);
    setSelectedNotificationIds(new Set());
  }, []);

  const handleNotificationLongPress = React.useCallback(
    (notification: NotificationPayload) => {
      if (!isSelectionMode) {
        enterSelectionMode();
        toggleNotificationSelection(notification.id);
      }
    },
    [isSelectionMode, enterSelectionMode, toggleNotificationSelection]
  );

  const exitSelectionMode = React.useCallback(() => {
    setIsSelectionMode(false);
    setSelectedNotificationIds(new Set());
  }, []);

  const selectAllNotifications = () => {
    const allIds = notifications?.map((item: NovuNotification) => item.id) || [];
    setSelectedNotificationIds(new Set(allIds));
  };

  const deselectAllNotifications = () => {
    setSelectedNotificationIds(new Set());
  };

  const allNotificationsSelected = !!notifications?.length && selectedNotificationIds.size === notifications.length;

  const handleBulkDelete = () => {
    if (selectedNotificationIds.size > 0) {
      setShowDeleteConfirmModal(true);
    }
  };

  const handleCloseConfirmModal = React.useCallback(() => {
    setShowDeleteConfirmModal(false);
  }, []);

  const confirmBulkDelete = React.useCallback(async () => {
    setIsDeletingSelected(true);
    setShowDeleteConfirmModal(false);

    try {
      const deletePromises = Array.from(selectedNotificationIds).map((id) => deleteMessage(id));
      await Promise.all(deletePromises);

      showToast('success', t('notifications.bulkDeleteSuccess', { count: selectedNotificationIds.size }));
      exitSelectionMode();
      refetch();
    } catch (error) {
      showToast('error', t('notifications.bulkDeleteError'));
    } finally {
      setIsDeletingSelected(false);
    }
  }, [selectedNotificationIds, showToast, exitSelectionMode, refetch, t]);

  const handleDeleteNotification = React.useCallback(
    async (_id: string) => {
      try {
        await deleteMessage(_id);
        showToast('success', t('notifications.deleteSuccess'));
        refetch();
      } catch (error) {
        showToast('error', t('notifications.deleteError'));
      }
    },
    [showToast, refetch, t]
  );

  const handleNavigateToReference = React.useCallback(
    (referenceType: string, referenceId: string) => {
      // TODO: Implement navigation based on reference type
      logger.debug({
        message: 'Notification reference navigation requested',
        context: { referenceType, referenceId },
      });
      onClose();
    },
    [onClose]
  );

  const renderItem = React.useCallback(
    ({ item }: { item: NovuNotification }) => (
      <NotificationRow
        item={item}
        isSelectionMode={isSelectionMode}
        isSelected={selectedNotificationIds.has(item.id)}
        onPress={handleNotificationPress}
        onLongPress={handleNotificationLongPress}
        onNavigateToReference={handleNavigateToReference}
      />
    ),
    [isSelectionMode, selectedNotificationIds, handleNotificationPress, handleNotificationLongPress, handleNavigateToReference]
  );

  const listExtraData = React.useMemo(() => ({ isSelectionMode, selectedNotificationIds }), [isSelectionMode, selectedNotificationIds]);

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text>{t('notifications.empty')}</Text>
    </View>
  );

  if (!isOpen) {
    return null;
  }

  // Additional safety check to prevent rendering overlay without proper config
  if (!userId || !config || !config.NovuApplicationId || !config.NovuBackendApiUrl || !config.NovuSocketUrl) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Backdrop for tapping outside to close */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
      </Animated.View>

      {/* Sidebar container */}
      <Animated.View style={[styles.sidebarContainer, themed.sidebarContainer, sidebarSizeStyle, { transform: [{ translateX: slideAnim }] }]}>
        <SafeAreaView style={styles.safeArea}>
          <>
            <View style={[styles.header, themed.header, headerInsetStyle]}>
              {isSelectionMode ? (
                <>
                  <View style={styles.selectionHeader}>
                    <Text style={[styles.selectionCount, themed.selectionCount]} numberOfLines={1}>
                      {t('notifications.selectedCount', { count: selectedNotificationIds.size })}
                    </Text>
                    <View style={styles.selectionActions}>
                      <Pressable
                        onPress={allNotificationsSelected ? deselectAllNotifications : selectAllNotifications}
                        style={styles.actionButton}
                        accessibilityRole="button"
                        accessibilityLabel={allNotificationsSelected ? t('notifications.deselectAll') : t('notifications.selectAll')}
                      >
                        {allNotificationsSelected ? (
                          <CheckCircle size={24} className="text-primary-500 dark:text-primary-400" strokeWidth={2} />
                        ) : (
                          <Circle size={24} className="text-primary-500 dark:text-primary-400" strokeWidth={2} />
                        )}
                      </Pressable>
                      <Pressable
                        onPress={handleBulkDelete}
                        disabled={selectedNotificationIds.size === 0 || isDeletingSelected}
                        style={[styles.actionButton, selectedNotificationIds.size === 0 || isDeletingSelected ? styles.actionButtonDisabled : null]}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.delete')}
                      >
                        {isDeletingSelected ? <ActivityIndicator size="small" color="#ef4444" /> : <Trash2 size={24} className="text-red-500" strokeWidth={2} />}
                      </Pressable>
                      <Pressable onPress={exitSelectionMode} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
                        <X size={24} className="text-primary-500 dark:text-primary-400" strokeWidth={2} />
                      </Pressable>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
                  <View style={styles.headerActions}>
                    <Pressable onPress={enterSelectionMode} style={styles.actionButton}>
                      <MoreVertical size={24} className="text-primary-500 dark:text-primary-400" strokeWidth={2} />
                    </Pressable>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                      <X size={24} className="text-primary-500 dark:text-primary-400" strokeWidth={2} />
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            {isLoading && !notifications ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
              </View>
            ) : !userId || !config ? (
              <View style={styles.loadingContainer}>
                <Text>{t('notifications.loadError')}</Text>
              </View>
            ) : (
              <FlashList
                data={notifications}
                renderItem={renderItem}
                extraData={listExtraData}
                keyExtractor={(item: NovuNotification) => item.id}
                onEndReached={fetchMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#2196F3']} />}
              />
            )}
          </>
        </SafeAreaView>
      </Animated.View>

      {/* Notification detail overlay — rendered as a full-screen sibling so its own backdrop and
          slide-in panel lay out over the whole screen. Nesting it inside the sidebar clipped its
          absolute-fill backdrop over the panel and produced a black screen. */}
      {selectedNotification ? (
        <NotificationDetail notification={selectedNotification} onClose={() => setSelectedNotification(null)} onDelete={handleDeleteNotification} onNavigateToReference={handleNavigateToReference} />
      ) : null}

      {/* Delete Confirmation Modal — RN core Modal, conditionally mounted. The gluestack
          Modal renders inline inside this overlay and could sit invisible over the whole
          screen, eating touches (dead delete/cancel/close, double-tap on items). */}
      {showDeleteConfirmModal ? (
        <RNModal transparent visible animationType="fade" onRequestClose={handleCloseConfirmModal}>
          <View style={styles.confirmBackdrop}>
            <View style={[styles.confirmCard, themed.confirmCard]}>
              <Text className="text-lg font-semibold">{t('notifications.confirmDelete.title')}</Text>
              <Text className="mt-2">{t('notifications.confirmDelete.message', { count: selectedNotificationIds.size })}</Text>
              <View style={styles.confirmActions}>
                <Button variant="outline" onPress={handleCloseConfirmModal} className="mr-2">
                  <Text>{t('common.cancel')}</Text>
                </Button>
                <Button variant="solid" onPress={confirmBulkDelete} className="bg-red-500">
                  <Text className="text-white">{t('common.delete')}</Text>
                </Button>
              </View>
            </View>
          </View>
        </RNModal>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
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
    zIndex: 1000,
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
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
  },
  selectionHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 16,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    position: 'relative',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4,
    height: '100%',
  },
  selectionIndicator: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationBody: {
    fontSize: 16,
    marginBottom: 4,
  },
  unreadNotificationText: {
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  footerLoader: {
    padding: 16,
    alignItems: 'center',
  },
});
