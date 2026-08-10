import { router } from 'expo-router';
import { MessageCircle, MessagesSquare, ShieldCheck, Users } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useDirectMessage } from '@/hooks/use-direct-message';
import { type IncidentContactInfo, type ResourceIncidentView } from '@/models/v4/incidentCommand/resourceIncidentView';

import { getIncidentRoleName } from './incident-role-names';

interface IncidentChatSectionProps {
  view: ResourceIncidentView;
  testID?: string;
}

/** One tappable channel row. Rendered only when the server handed us an id we are allowed to open. */
const ChannelRow: React.FC<{ label: string; hint?: string | null; icon: React.ElementType; channelId?: string | null; testID: string }> = ({ label, hint, icon: IconComponent, channelId, testID }) => {
  const onPress = useCallback(() => {
    if (channelId) {
      router.push(`/chat/${channelId}`);
    }
  }, [channelId]);

  if (!channelId) {
    return null;
  }

  return (
    <Pressable onPress={onPress} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700" testID={testID}>
      <HStack className="items-center" space="sm">
        <IconComponent size={18} color="#3b82f6" />
        <VStack className="min-w-0 flex-1">
          <Text className="font-medium">{label}</Text>
          {hint ? <Text className="text-xs text-gray-500">{hint}</Text> : null}
        </VStack>
      </HStack>
    </Pressable>
  );
};

/** A person on the incident with a button to open a 1:1 with them. */
const ContactRow: React.FC<{ label: string; contact?: IncidentContactInfo | null; onMessage: (userId?: string | null) => void; testID: string }> = ({ label, contact, onMessage, testID }) => {
  const { t } = useTranslation();
  const handlePress = useCallback(() => onMessage(contact?.UserId), [onMessage, contact]);

  if (!contact) {
    return null;
  }

  return (
    <HStack className="items-center justify-between py-1" testID={testID}>
      <VStack className="min-w-0 flex-1">
        <Text className="text-xs text-gray-500">{label}</Text>
        <Text className="font-medium">{contact.Name}</Text>
      </VStack>
      {/* External contacts have a name and phone but no Resgrid account, so no 1:1 to open. */}
      {contact.UserId ? (
        <Pressable onPress={handlePress} className="p-3" hitSlop={8} accessibilityLabel={t('incident_command.message_person', { name: contact.Name })} testID={`${testID}-message`}>
          <MessageCircle size={20} color="#3b82f6" />
        </Pressable>
      ) : null}
    </HStack>
  );
};

/**
 * Incident chat on the Command tab: the channels this responder can open, and the people on the
 * incident they can reach 1:1.
 *
 * Access is decided entirely by the server — a channel id only appears in the payload when the
 * caller is actually allowed in, and it disappears again when they are (for example) taken off the
 * lane. Nothing here infers access on its own.
 */
export const IncidentChatSection: React.FC<IncidentChatSectionProps> = ({ view, testID = 'incident-command-chat' }) => {
  const { t } = useTranslation();
  const { openDirectMessage } = useDirectMessage();

  const chat = view.Chat;
  const assignment = view.MyAssignment;
  const roles = view.Roles ?? [];

  const handleMessage = useCallback((userId?: string | null) => void openDirectMessage(userId), [openDirectMessage]);

  const hasChannels = !!(chat?.IncidentChannelId || chat?.LaneChannelId || chat?.CommandChannelId || chat?.LeadsChannelId);
  // Only ICS role holders live here — the commander and this resource's lane leads already have
  // contact cards higher up the panel, and listing them twice just made the screen noisy.
  const hasContacts = roles.length > 0;

  if (!hasChannels && !hasContacts) {
    return null;
  }

  return (
    <Box testID={testID}>
      <Heading size="sm" className="mb-2">
        {t('incident_command.chat')}
      </Heading>

      {chat?.IsFrozen ? (
        <Box className="mb-2 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800" testID={`${testID}-frozen`}>
          <Text className="text-xs text-gray-600 dark:text-gray-300">{t('incident_command.chat_frozen')}</Text>
        </Box>
      ) : null}

      {hasChannels ? (
        <VStack space="sm">
          <ChannelRow label={t('incident_command.incident_channel')} icon={MessagesSquare} channelId={chat?.IncidentChannelId} testID={`${testID}-incident`} />
          <ChannelRow label={t('incident_command.lane_channel')} hint={assignment?.LaneName} icon={MessagesSquare} channelId={chat?.LaneChannelId} testID={`${testID}-lane`} />
          <ChannelRow label={t('incident_command.command_channel')} hint={t('incident_command.command_channel_hint')} icon={ShieldCheck} channelId={chat?.CommandChannelId} testID={`${testID}-command`} />
          <ChannelRow label={t('incident_command.leads_channel')} hint={t('incident_command.leads_channel_hint')} icon={Users} channelId={chat?.LeadsChannelId} testID={`${testID}-leads`} />
        </VStack>
      ) : null}

      {hasContacts ? (
        <Box className="mt-3">
          <Text className="mb-1 text-xs font-semibold uppercase text-gray-500">{t('incident_command.ics_positions')}</Text>
          {roles.map((role) => (
            <ContactRow
              key={`${role.RoleType}-${role.Contact?.UserId ?? ''}`}
              label={getIncidentRoleName(t, role.RoleType)}
              contact={role.Contact}
              onMessage={handleMessage}
              testID={`${testID}-contact-role-${role.RoleType}`}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
};

export default IncidentChatSection;
