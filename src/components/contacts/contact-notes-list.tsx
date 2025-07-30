import { AlertTriangleIcon, CalendarIcon, ClockIcon, EyeIcon, EyeOffIcon, ShieldAlertIcon, UserIcon } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { type ContactNoteResultData } from '@/models/v4/contacts/contactNoteResultData';
import { useContactsStore } from '@/stores/contacts/store';

import { Box } from '../ui/box';
import { Card } from '../ui/card';
import { HStack } from '../ui/hstack';
import { Spinner } from '../ui/spinner';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

interface ContactNotesListProps {
  contactId: string;
}

interface ContactNoteCardProps {
  note: ContactNoteResultData;
}

const ContactNoteCard: React.FC<ContactNoteCardProps> = ({ note }) => {
  const { t } = useTranslation();

  const isExpired = note.ExpiresOnUtc && new Date(note.ExpiresOnUtc) < new Date();
  const isInternal = note.Visibility === 0;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <Card className={`mb-3 p-4 ${isExpired ? 'opacity-60' : ''}`}>
      <VStack space="sm">
        {/* Header with type and indicators */}
        <HStack className="items-center justify-between">
          <HStack space="xs" className="items-center">
            {note.NoteType ? <Text className="rounded bg-primary-100 px-2 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900 dark:text-primary-200">{note.NoteType}</Text> : null}
            {note.ShouldAlert ? (
              <HStack space="xs" className="items-center">
                <ShieldAlertIcon size={14} color="#ef4444" />
                <Text className="text-xs text-red-600 dark:text-red-400">{t('contacts.noteAlert')}</Text>
              </HStack>
            ) : null}
          </HStack>

          <HStack space="xs" className="items-center">
            {isInternal ? (
              <HStack space="xs" className="items-center">
                <EyeOffIcon size={14} color="#6b7280" />
                <Text className="text-xs text-gray-500 dark:text-gray-400">{t('contacts.internal')}</Text>
              </HStack>
            ) : (
              <HStack space="xs" className="items-center">
                <EyeIcon size={14} color="#6b7280" />
                <Text className="text-xs text-gray-500 dark:text-gray-400">{t('contacts.public')}</Text>
              </HStack>
            )}
          </HStack>
        </HStack>

        {/* Note content */}
        <Text className="text-base leading-relaxed text-gray-900 dark:text-white">{note.Note}</Text>

        {/* Expiration warning */}
        {isExpired ? (
          <HStack space="xs" className="items-center rounded bg-red-50 p-2 dark:bg-red-900/20">
            <AlertTriangleIcon size={16} color="#ef4444" />
            <Text className="text-sm font-medium text-red-600 dark:text-red-400">{t('contacts.contactNotesExpired')}</Text>
          </HStack>
        ) : note.ExpiresOn ? (
          <HStack space="xs" className="items-center">
            <ClockIcon size={14} color="#6b7280" />
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {t('contacts.expires')}: {formatDate(note.ExpiresOn)}
            </Text>
          </HStack>
        ) : null}

        {/* Footer with author and date */}
        <HStack className="items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-700">
          <HStack space="xs" className="items-center">
            <UserIcon size={14} color="#6b7280" />
            <Text className="text-xs text-gray-500 dark:text-gray-400">{note.AddedByName}</Text>
          </HStack>

          <HStack space="xs" className="items-center">
            <CalendarIcon size={14} color="#6b7280" />
            <Text className="text-xs text-gray-500 dark:text-gray-400">{formatDate(note.AddedOn)}</Text>
          </HStack>
        </HStack>
      </VStack>
    </Card>
  );
};

export const ContactNotesList: React.FC<ContactNotesListProps> = ({ contactId }) => {
  const { t } = useTranslation();
  const { contactNotes, isNotesLoading, fetchContactNotes } = useContactsStore();

  React.useEffect(() => {
    if (contactId) {
      fetchContactNotes(contactId);
    }
  }, [contactId, fetchContactNotes]);

  const notes = contactNotes[contactId] || [];
  const hasNotes = notes.length > 0;

  if (isNotesLoading) {
    return (
      <Box className="flex-1 items-center justify-center py-8">
        <Spinner size="large" className="mb-4" />
        <Text className="text-center text-gray-500 dark:text-gray-400">{t('contacts.contactNotesLoading')}</Text>
      </Box>
    );
  }

  if (!hasNotes) {
    return (
      <Box className="flex-1 items-center justify-center py-8">
        <VStack space="md" className="items-center">
          <Box className="size-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <CalendarIcon size={32} color="#6b7280" />
          </Box>
          <VStack space="xs" className="items-center">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('contacts.contactNotesEmpty')}</Text>
            <Text className="text-center text-gray-500 dark:text-gray-400">{t('contacts.contactNotesEmptyDescription')}</Text>
          </VStack>
        </VStack>
      </Box>
    );
  }

  // Sort notes by date (newest first)
  const sortedNotes = [...notes].sort((a, b) => {
    const dateA = new Date(a.AddedOnUtc || a.AddedOn);
    const dateB = new Date(b.AddedOnUtc || b.AddedOn);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <VStack space="md" className="flex-1 p-4">
      {sortedNotes.map((note) => (
        <ContactNoteCard key={note.ContactNoteId} note={note} />
      ))}
    </VStack>
  );
};
