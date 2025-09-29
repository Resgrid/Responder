import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { FileText, Search, X } from 'lucide-react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, View } from 'react-native';

import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { NoteCard } from '@/components/notes/note-card';
import { NoteDetailsSheet } from '@/components/notes/note-details-sheet';
import { FocusAwareStatusBar } from '@/components/ui';
import { Box } from '@/components/ui/box';
import { Input } from '@/components/ui/input';
import { InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { useAnalytics } from '@/hooks/use-analytics';
import { useNotesStore } from '@/stores/notes/store';

export default function Notes() {
  const { t } = useTranslation();
  const { notes, searchQuery, setSearchQuery, selectNote, isLoading, fetchNotes } = useNotesStore();
  const { trackEvent } = useAnalytics();
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Track analytics when view becomes visible
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('notes_viewed', {
        timestamp: new Date().toISOString(),
        notesCount: notes.length,
      });
    }, [trackEvent, notes.length])
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    trackEvent('notes_refreshed', {
      timestamp: new Date().toISOString(),
    });
    await fetchNotes();
    setRefreshing(false);
  }, [fetchNotes, trackEvent]);

  const filteredNotes = React.useMemo(() => {
    if (!searchQuery.trim()) return notes;

    const query = searchQuery.toLowerCase();
    return notes.filter((note) => note.Title.toLowerCase().includes(query) || note.Body.toLowerCase().includes(query) || note.Category?.toLowerCase().includes(query));
  }, [notes, searchQuery]);

  const handleSearchChange = React.useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim() && query !== searchQuery) {
        // Calculate results count for the new query
        const resultsCount = query.trim()
          ? notes.filter((note) => note.Title.toLowerCase().includes(query.toLowerCase()) || note.Body.toLowerCase().includes(query.toLowerCase()) || note.Category?.toLowerCase().includes(query.toLowerCase())).length
          : notes.length;

        trackEvent('notes_searched', {
          timestamp: new Date().toISOString(),
          searchQuery: query,
          resultsCount,
        });
      }
    },
    [setSearchQuery, trackEvent, searchQuery, notes]
  );

  const handleClearSearch = React.useCallback(() => {
    setSearchQuery('');
    trackEvent('notes_search_cleared', {
      timestamp: new Date().toISOString(),
    });
  }, [setSearchQuery, trackEvent]);

  const handleNoteSelect = React.useCallback(
    (noteId: string) => {
      selectNote(noteId);
      trackEvent('note_selected', {
        timestamp: new Date().toISOString(),
        noteId,
      });
    },
    [selectNote, trackEvent]
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FocusAwareStatusBar />
      <Box className="flex-1 px-4 pt-4">
        <Input className="mb-4 rounded-lg bg-white dark:bg-gray-800" size="md" variant="outline">
          <InputSlot className="pl-3">
            <InputIcon as={Search} />
          </InputSlot>
          <InputField placeholder={t('notes.search')} value={searchQuery} onChangeText={handleSearchChange} />
          {searchQuery ? (
            <InputSlot className="pr-3" onPress={handleClearSearch}>
              <InputIcon as={X} />
            </InputSlot>
          ) : null}
        </Input>

        {isLoading && !refreshing ? (
          <Loading />
        ) : filteredNotes.length > 0 ? (
          <FlashList
            data={filteredNotes}
            keyExtractor={(item) => item.NoteId}
            renderItem={({ item }) => <NoteCard note={item} onPress={handleNoteSelect} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          />
        ) : (
          <ZeroState icon={FileText} heading={t('notes.empty')} description={t('notes.emptyDescription')} />
        )}
      </Box>

      <NoteDetailsSheet />
    </View>
  );
}
