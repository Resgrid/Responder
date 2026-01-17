import { SearchIcon, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAnalytics } from '@/hooks/use-analytics';
import { useAuthStore } from '@/lib/auth';
import type { CallNoteResultData } from '@/models/v4/callNotes/callNoteResultData';
import { useCallDetailStore } from '@/stores/calls/detail-store';

import { Loading } from '../common/loading';
import ZeroState from '../common/zero-state';
import { Box } from '../ui/box';
import { Button, ButtonText } from '../ui/button';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { Input, InputField, InputSlot } from '../ui/input';
import { Text } from '../ui/text';
import { Textarea, TextareaInput } from '../ui/textarea';
import { VStack } from '../ui/vstack';

interface CallNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
}

const CallNotesModal = ({ isOpen, onClose, callId }: CallNotesModalProps) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const [searchQuery, setSearchQuery] = useState('');
  const [newNote, setNewNote] = useState('');
  const { callNotes, addNote, searchNotes, isNotesLoading, fetchCallNotes } = useCallDetailStore();
  const { profile } = useAuthStore();

  // Track if modal was actually opened to avoid false close events
  const wasModalOpenRef = useRef(false);

  // Track analytics when modal becomes visible
  useEffect(() => {
    if (isOpen) {
      wasModalOpenRef.current = true;
      try {
        trackEvent('call_notes_modal_viewed', {
          timestamp: new Date().toISOString(),
          callId,
          noteCount: callNotes?.length || 0,
          hasNotes: Boolean(callNotes?.length),
          isLoading: isNotesLoading,
          hasSearchQuery: searchQuery.trim().length > 0,
        });
      } catch (error) {
        console.warn('Failed to track call notes modal analytics:', error);
      }
    }
  }, [isOpen, trackEvent, callId, callNotes?.length, isNotesLoading, searchQuery]);

  // Fetch call notes when modal opens
  useEffect(() => {
    if (isOpen && callId) {
      fetchCallNotes(callId);
    }
  }, [isOpen, callId, fetchCallNotes]);

  const filteredNotes = React.useMemo(() => {
    return searchNotes(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchNotes, callNotes]);

  // Get current user from profile
  const currentUser = profile?.sub || '';

  const handleAddNote = React.useCallback(async () => {
    if (newNote.trim()) {
      const noteLen = newNote.trim().length;
      // Track note addition analytics immediately
      try {
        trackEvent('call_note_added', {
          timestamp: new Date().toISOString(),
          callId,
          noteLength: noteLen,
          userId: currentUser,
        });
      } catch (error) {
        console.warn('Failed to track note addition analytics:', error);
      }
      try {
        await addNote(callId, newNote, currentUser, null, null);
        setNewNote('');
      } catch (error) {
        console.error('Failed to add note:', error);
      }
    }
  }, [newNote, callId, currentUser, addNote, trackEvent]);

  // Handle close with analytics tracking
  const handleClose = useCallback(() => {
    // Only track close analytics if modal was actually opened
    if (wasModalOpenRef.current) {
      try {
        trackEvent('call_notes_modal_closed', {
          timestamp: new Date().toISOString(),
          callId,
          wasManualClose: true,
          noteCount: callNotes?.length || 0,
          hadSearchQuery: searchQuery.trim().length > 0,
        });
      } catch (error) {
        console.warn('Failed to track call notes modal close analytics:', error);
      }
      wasModalOpenRef.current = false;
    }
    onClose();
  }, [onClose, trackEvent, callId, callNotes?.length, searchQuery]);

  // Handle search query change with analytics tracking
  const handleSearchQueryChange = useCallback(
    (query: string) => {
      setSearchQuery(query);

      // Track search analytics when user actually types something
      if (query.trim().length > 0 && query.trim().length % 3 === 0) {
        try {
          trackEvent('call_notes_search', {
            timestamp: new Date().toISOString(),
            callId,
            searchQuery: query.trim(),
            resultCount: searchNotes(query.trim()).length,
          });
        } catch (error) {
          console.warn('Failed to track call notes search analytics:', error);
        }
      }
    },
    [setSearchQuery, trackEvent, callId, searchNotes]
  );

  // Render note item for FlatList
  const renderNoteItem = useCallback(
    ({ item: note }: { item: CallNoteResultData }) => (
      <Box className="mb-3 w-full rounded-lg bg-gray-50 p-4 shadow-sm dark:bg-gray-700">
        <Text className="mb-2 text-gray-800 dark:text-gray-200">{note.Note}</Text>
        <HStack className="w-full justify-between">
          <Text className="text-xs text-gray-500 dark:text-gray-400">{note.FullName}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">{note.TimestampFormatted}</Text>
        </HStack>
      </Box>
    ),
    []
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: CallNoteResultData) => item.CallNoteId.toString(), []);

  // Empty list component
  const ListEmptyComponent = useCallback(() => <ZeroState heading="No notes found" />, []);

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <Box className="w-full flex-row items-center justify-between px-4 pb-4 pt-2">
            <Heading size="lg">{t('callNotes.title')}</Heading>
            <Button variant="link" onPress={handleClose} className="p-1" testID="close-button">
              <X size={24} />
            </Button>
          </Box>

          {/* Search Bar - Fixed */}
          <Box className="px-4 pb-4">
            <Input className="w-full rounded-lg bg-gray-100 dark:bg-gray-700">
              <InputSlot>
                <SearchIcon size={20} className="text-gray-500" />
              </InputSlot>
              <InputField placeholder={t('callNotes.searchPlaceholder')} value={searchQuery} onChangeText={handleSearchQueryChange} />
            </Input>
          </Box>
        </View>

        {/* Scrollable Notes List */}
        <View style={styles.listContainer}>
          {isNotesLoading ? (
            <Loading />
          ) : (
            <FlatList
              data={filteredNotes}
              renderItem={renderNoteItem}
              keyExtractor={keyExtractor}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={ListEmptyComponent}
              showsVerticalScrollIndicator={true}
            />
          )}
        </View>

        {/* Footer with KeyboardStickyView */}
        <KeyboardStickyView offset={{ opened: 0, closed: 0 }}>
          <View style={styles.footer}>
            <VStack space="md" className="w-full">
              <Textarea className="w-full rounded-lg bg-white dark:bg-gray-700">
                <TextareaInput placeholder={t('callNotes.addNotePlaceholder')} value={newNote} onChangeText={setNewNote} autoCorrect={false} className="min-h-[80px] w-full" />
              </Textarea>
              <HStack className="w-full justify-end">
                <Button onPress={handleAddNote} className="bg-blue-600 dark:bg-blue-500" isDisabled={!newNote.trim() || isNotesLoading}>
                  <HStack space="xs" className="text-center">
                    <ButtonText>{t('callNotes.addNote')}</ButtonText>
                  </HStack>
                </Button>
              </HStack>
            </VStack>
          </View>
        </KeyboardStickyView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
});

export default CallNotesModal;
