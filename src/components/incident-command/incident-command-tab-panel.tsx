import { format } from 'date-fns';
import { MailIcon, PhoneIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { logger } from '@/lib/logging';
import { IncidentNeedCategory, IncidentNeedStatus, TacticalObjectiveStatus, TacticalObjectiveType } from '@/models/v4/incidentCommand/incidentCommandEnums';
import { type IncidentAttachment, type IncidentContactInfo, type IncidentNeed, type IncidentNote, type TacticalObjective } from '@/models/v4/incidentCommand/resourceIncidentView';
import { useIncidentCommandStore } from '@/stores/calls/incident-command-store';

interface IncidentCommandTabPanelProps {
  callId: number;
}

const DEFAULT_LANE_COLOR = '#3b82f6';
const LINK_COLOR = '#3b82f6';

const clampPercent = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));

const formatTimestamp = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return '';
  }
  return format(date, 'MMM d, yyyy h:mm a');
};

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getObjectiveTypeKey = (type: number): string =>
  type === TacticalObjectiveType.Benchmark ? 'incident_command.objective_type_benchmark' : type === TacticalObjectiveType.Safety ? 'incident_command.objective_type_safety' : 'incident_command.objective_type_general';

const getObjectiveStatusKey = (status: number): string =>
  status === TacticalObjectiveStatus.Complete
    ? 'incident_command.objective_status_complete'
    : status === TacticalObjectiveStatus.InProgress
      ? 'incident_command.objective_status_in_progress'
      : 'incident_command.objective_status_pending';

const getObjectiveStatusClasses = (status: number): string => (status === TacticalObjectiveStatus.Complete ? 'bg-green-500' : status === TacticalObjectiveStatus.InProgress ? 'bg-blue-500' : 'bg-gray-500');

const getNeedCategoryKey = (category: number): string =>
  category === IncidentNeedCategory.Logistics
    ? 'incident_command.need_category_logistics'
    : category === IncidentNeedCategory.Medical
      ? 'incident_command.need_category_medical'
      : category === IncidentNeedCategory.Equipment
        ? 'incident_command.need_category_equipment'
        : category === IncidentNeedCategory.Staffing
          ? 'incident_command.need_category_staffing'
          : category === IncidentNeedCategory.Other
            ? 'incident_command.need_category_other'
            : 'incident_command.need_category_resource';

const getNeedStatusKey = (status: number): string =>
  status === IncidentNeedStatus.Met
    ? 'incident_command.need_status_met'
    : status === IncidentNeedStatus.PartiallyMet
      ? 'incident_command.need_status_partially_met'
      : status === IncidentNeedStatus.Cancelled
        ? 'incident_command.need_status_cancelled'
        : 'incident_command.need_status_open';

const getNeedStatusClasses = (status: number): string =>
  status === IncidentNeedStatus.Met ? 'bg-green-500' : status === IncidentNeedStatus.PartiallyMet ? 'bg-blue-500' : status === IncidentNeedStatus.Cancelled ? 'bg-gray-500' : 'bg-amber-500';

const openPhone = (phone: string) => {
  Linking.openURL(`tel:${phone}`).catch((error) => {
    logger.error({ message: 'Failed to open phone link', context: { error } });
  });
};

const openEmail = (email: string) => {
  Linking.openURL(`mailto:${email}`).catch((error) => {
    logger.error({ message: 'Failed to open email link', context: { error } });
  });
};

const ContactCard: React.FC<{ label: string; contact: IncidentContactInfo; testID: string }> = ({ label, contact, testID }) => {
  const phone = contact.Phone;
  const email = contact.Email;

  return (
    <Box testID={testID} className="py-1">
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="font-medium">{contact.Name}</Text>
      {phone ? (
        <Pressable onPress={() => openPhone(phone)} testID={`${testID}-phone`}>
          <HStack className="mt-1 items-center">
            <PhoneIcon size={14} color={LINK_COLOR} />
            <Text className="ml-1 text-sm text-blue-500">{phone}</Text>
          </HStack>
        </Pressable>
      ) : null}
      {email ? (
        <Pressable onPress={() => openEmail(email)} testID={`${testID}-email`}>
          <HStack className="mt-1 items-center">
            <MailIcon size={14} color={LINK_COLOR} />
            <Text className="ml-1 text-sm text-blue-500">{email}</Text>
          </HStack>
        </Pressable>
      ) : null}
    </Box>
  );
};

const ProgressBar: React.FC<{ percent: number }> = ({ percent }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const clamped = clampPercent(percent);

  return (
    <HStack className="mt-2 items-center">
      <Box className={`h-2 flex-1 overflow-hidden rounded-full ${colorScheme === 'dark' ? 'bg-neutral-700' : 'bg-neutral-300'}`}>
        <Box className="h-2 rounded-full bg-blue-500" style={{ width: `${clamped}%` }} />
      </Box>
      <Text className="ml-2 text-xs text-gray-500">{t('incident_command.percent_complete', { percent: clamped })}</Text>
    </HStack>
  );
};

const StatusBadge: React.FC<{ label: string; className: string }> = ({ label, className }) => {
  return (
    <Box className={`rounded-full px-2 py-0.5 ${className}`}>
      <Text className="text-xs font-medium text-white">{label}</Text>
    </Box>
  );
};

const ObjectiveItem: React.FC<{ objective: TacticalObjective; compact?: boolean }> = ({ objective, compact }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();

  return (
    <Box testID={`objective-item-${objective.TacticalObjectiveId}`} className={compact ? 'py-1' : `rounded-lg p-3 ${colorScheme === 'dark' ? 'bg-neutral-800' : 'bg-white'}`}>
      <HStack className="items-center justify-between">
        <Text className="mr-2 flex-1 font-semibold">{objective.Name}</Text>
        <StatusBadge label={t(getObjectiveStatusKey(objective.Status))} className={getObjectiveStatusClasses(objective.Status)} />
      </HStack>
      <Text className="text-xs text-gray-500">{t(getObjectiveTypeKey(objective.ObjectiveType))}</Text>
      {objective.Description ? <Text className="mt-1 text-sm text-gray-500">{objective.Description}</Text> : null}
      <ProgressBar percent={objective.ProgressPercent} />
    </Box>
  );
};

const NeedItem: React.FC<{ need: IncidentNeed; compact?: boolean }> = ({ need, compact }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();

  return (
    <Box testID={`need-item-${need.IncidentNeedId}`} className={compact ? 'py-1' : `rounded-lg p-3 ${colorScheme === 'dark' ? 'bg-neutral-800' : 'bg-white'}`}>
      <HStack className="items-center justify-between">
        <Text className="mr-2 flex-1 font-semibold">{need.Name}</Text>
        <StatusBadge label={t(getNeedStatusKey(need.Status))} className={getNeedStatusClasses(need.Status)} />
      </HStack>
      <Text className="text-xs text-gray-500">{t(getNeedCategoryKey(need.Category))}</Text>
      {need.Description ? <Text className="mt-1 text-sm text-gray-500">{need.Description}</Text> : null}
      {need.QuantityRequested > 0 ? <Text className="mt-1 text-sm text-gray-500">{t('incident_command.quantity', { fulfilled: need.QuantityFulfilled, requested: need.QuantityRequested })}</Text> : null}
    </Box>
  );
};

const NoteItem: React.FC<{ note: IncidentNote }> = ({ note }) => {
  const { colorScheme } = useColorScheme();

  return (
    <Box testID={`note-item-${note.IncidentNoteId}`} className={`rounded-lg p-3 ${colorScheme === 'dark' ? 'bg-neutral-800' : 'bg-white'}`}>
      {note.Title ? <Text className="font-semibold">{note.Title}</Text> : null}
      <Text className="text-sm">{note.Body}</Text>
      <Text className="mt-1 text-xs text-gray-500">{formatTimestamp(note.CreatedOn)}</Text>
    </Box>
  );
};

const AttachmentItem: React.FC<{ attachment: IncidentAttachment }> = ({ attachment }) => {
  const { colorScheme } = useColorScheme();

  return (
    <Box testID={`attachment-item-${attachment.IncidentAttachmentId}`} className={`rounded-lg p-3 ${colorScheme === 'dark' ? 'bg-neutral-800' : 'bg-white'}`}>
      <HStack className="items-center justify-between">
        <Text className="mr-2 flex-1 font-medium">{attachment.FileName}</Text>
        <Text className="text-xs text-gray-500">{formatFileSize(attachment.ContentLength)}</Text>
      </HStack>
      {attachment.Description ? <Text className="mt-1 text-sm text-gray-500">{attachment.Description}</Text> : null}
    </Box>
  );
};

export const IncidentCommandTabPanel: React.FC<IncidentCommandTabPanelProps> = ({ callId }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { view, isLoading, error, fetchIncidentView } = useIncidentCommandStore();

  useEffect(() => {
    fetchIncidentView(callId);
  }, [callId, fetchIncidentView]);

  if (isLoading) {
    return (
      <Box className="items-center py-8" testID="incident-command-loading">
        <Spinner size="large" />
        <Text className="mt-2 text-sm text-gray-500">{t('common.loading')}</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="items-center p-6" testID="incident-command-error">
        <Text className="text-center text-gray-500">{t('incident_command.error_loading')}</Text>
        <Text className="mt-1 text-center text-xs text-gray-500">{error}</Text>
      </Box>
    );
  }

  if (!view) {
    return (
      <Box className="items-center p-6" testID="incident-command-empty">
        <Text className="text-center text-gray-500">{t('incident_command.empty_state')}</Text>
      </Box>
    );
  }

  const assignment = view.MyAssignment;
  const cardClasses = `rounded-lg p-3 ${colorScheme === 'dark' ? 'bg-neutral-800' : 'bg-white'}`;

  return (
    <VStack space="md" className="p-4" testID="incident-command-tab-panel">
      {/* My Assignment */}
      {assignment ? (
        <Box className={cardClasses} testID="incident-command-my-assignment">
          <Heading size="sm">{t('incident_command.my_assignment')}</Heading>
          <HStack className="mt-2 items-center">
            <Box className="mr-2 size-3 rounded-full" style={{ backgroundColor: assignment.Color || DEFAULT_LANE_COLOR }} testID="incident-command-lane-color" />
            <Text className="font-semibold">{assignment.LaneName}</Text>
          </HStack>
          <Text className="mt-1 text-xs text-gray-500">
            {t('incident_command.assigned_since')}: {formatTimestamp(assignment.AssignedOn)}
          </Text>
          {assignment.PrimaryLead ? <ContactCard label={t('incident_command.primary_lead')} contact={assignment.PrimaryLead} testID="incident-command-primary-lead" /> : null}
          {assignment.SecondaryLead ? <ContactCard label={t('incident_command.secondary_lead')} contact={assignment.SecondaryLead} testID="incident-command-secondary-lead" /> : null}
          {assignment.PrimaryObjective ? (
            <Box className="mt-2">
              <Text className="text-xs text-gray-500">{t('incident_command.primary_objective')}</Text>
              <ObjectiveItem objective={assignment.PrimaryObjective} compact={true} />
            </Box>
          ) : null}
          {assignment.SecondaryObjective ? (
            <Box className="mt-2">
              <Text className="text-xs text-gray-500">{t('incident_command.secondary_objective')}</Text>
              <ObjectiveItem objective={assignment.SecondaryObjective} compact={true} />
            </Box>
          ) : null}
          {assignment.LinkedNeed ? (
            <Box className="mt-2">
              <Text className="text-xs text-gray-500">{t('incident_command.linked_need')}</Text>
              <NeedItem need={assignment.LinkedNeed} compact={true} />
            </Box>
          ) : null}
        </Box>
      ) : null}

      {/* Incident Info */}
      <Box className={cardClasses} testID="incident-command-info">
        <Heading size="sm">{t('incident_command.incident_info')}</Heading>
        {view.Commander ? <ContactCard label={t('incident_command.commander')} contact={view.Commander} testID="incident-command-commander" /> : null}
        <Box className="mt-2">
          <Text className="text-xs text-gray-500">{t('incident_command.established')}</Text>
          <Text className="font-medium">{formatTimestamp(view.EstablishedOn)}</Text>
        </Box>
        {view.EstimatedEndOn ? (
          <Box className="mt-2">
            <Text className="text-xs text-gray-500">{t('incident_command.estimated_end')}</Text>
            <Text className="font-medium">{formatTimestamp(view.EstimatedEndOn)}</Text>
          </Box>
        ) : null}
        {view.ImportantInformation ? (
          <Box className={`mt-2 rounded-lg border-l-4 border-amber-500 p-3 ${colorScheme === 'dark' ? 'bg-amber-950' : 'bg-amber-50'}`} testID="incident-command-important-information">
            <Text className="text-xs font-semibold text-amber-500">{t('incident_command.important_information')}</Text>
            <Text className="mt-1 text-sm">{view.ImportantInformation}</Text>
          </Box>
        ) : null}
        {view.IncidentActionPlan ? (
          <Box className="mt-2" testID="incident-command-action-plan">
            <Text className="text-xs text-gray-500">{t('incident_command.action_plan')}</Text>
            <Text className="text-sm">{view.IncidentActionPlan}</Text>
          </Box>
        ) : null}
      </Box>

      {/* Objectives */}
      <Box testID="incident-command-objectives">
        <Heading size="sm" className="mb-2">
          {t('incident_command.objectives')}
        </Heading>
        {view.Objectives.length > 0 ? (
          <VStack space="sm">
            {view.Objectives.map((objective) => (
              <ObjectiveItem key={objective.TacticalObjectiveId} objective={objective} />
            ))}
          </VStack>
        ) : (
          <Text className="text-sm text-gray-500">{t('incident_command.no_objectives')}</Text>
        )}
      </Box>

      {/* Needs */}
      <Box testID="incident-command-needs">
        <Heading size="sm" className="mb-2">
          {t('incident_command.needs')}
        </Heading>
        {view.Needs.length > 0 ? (
          <VStack space="sm">
            {view.Needs.map((need) => (
              <NeedItem key={need.IncidentNeedId} need={need} />
            ))}
          </VStack>
        ) : (
          <Text className="text-sm text-gray-500">{t('incident_command.no_needs')}</Text>
        )}
      </Box>

      {/* Notes */}
      <Box testID="incident-command-notes">
        <Heading size="sm" className="mb-2">
          {t('incident_command.notes')}
        </Heading>
        {view.Notes.length > 0 ? (
          <VStack space="sm">
            {view.Notes.map((note) => (
              <NoteItem key={note.IncidentNoteId} note={note} />
            ))}
          </VStack>
        ) : (
          <Text className="text-sm text-gray-500">{t('incident_command.no_notes')}</Text>
        )}
      </Box>

      {/* Attachments */}
      <Box testID="incident-command-attachments">
        <Heading size="sm" className="mb-2">
          {t('incident_command.attachments')}
        </Heading>
        {view.Attachments.length > 0 ? (
          <VStack space="sm">
            {view.Attachments.map((attachment) => (
              <AttachmentItem key={attachment.IncidentAttachmentId} attachment={attachment} />
            ))}
          </VStack>
        ) : (
          <Text className="text-sm text-gray-500">{t('incident_command.no_attachments')}</Text>
        )}
      </Box>
    </VStack>
  );
};
