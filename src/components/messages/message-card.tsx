import { Clock, Mail, MailOpen, User } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { formatDateForDisplay, parseDateISOString } from '@/lib/utils';
import { type MessageResultData } from '@/models/v4/messages/messageResultData';

import { Badge } from '../ui/badge';
import { Box } from '../ui/box';
import { Checkbox } from '../ui/checkbox';
import { HStack } from '../ui/hstack';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

interface MessageCardProps {
  message: MessageResultData;
  onPress: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  showCheckbox?: boolean;
}

export const MessageCard: React.FC<MessageCardProps> = ({ message, onPress, onLongPress, isSelected = false, showCheckbox = false }) => {
  const { t } = useTranslation();

  const formatMessageDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = parseDateISOString(dateString);
      return formatDateForDisplay(date);
    } catch {
      return dateString;
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const getMessageTypeLabel = (type: number) => {
    switch (type) {
      case 0:
        return t('messages.types.message');
      case 1:
        return t('messages.types.poll');
      case 2:
        return t('messages.types.alert');
      default:
        return t('messages.types.message');
    }
  };

  const getMessageTypeBadgeColor = (type: number) => {
    switch (type) {
      case 0:
        return 'bg-blue-500';
      case 1:
        return 'bg-green-500';
      case 2:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const isExpired = message.ExpiredOn && new Date(message.ExpiredOn) < new Date();
  const isRead = message.Responded;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      role="button"
      testID="message-card"
      className={`
        mx-4 mb-2 rounded-lg border p-4 
        ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}
        ${isExpired ? 'opacity-60' : ''}
        bg-white dark:bg-gray-800
      `}
    >
      <VStack space="sm">
        {/* Header Row */}
        <HStack space="sm" className="items-center justify-between">
          <HStack space="sm" className="flex-1 items-center">
            {showCheckbox && (
              <Checkbox
                value={isSelected}
                onChange={() => {}} // Handled by parent
                aria-label={t('messages.select_message')}
              />
            )}

            {/* Message Status Icon */}
            <Box className="p-1">{isRead ? <MailOpen size={16} color="#6366F1" /> : <Mail size={16} color="#6366F1" />}</Box>

            {/* Sender Info */}
            <VStack className="flex-1">
              <Text className={`font-medium ${!isRead ? 'font-bold' : ''}`}>{message.SendingName || t('common.unknown_user')}</Text>
              <HStack space="xs" className="items-center">
                <Clock size={12} color="#6B7280" />
                <Text className="text-xs text-gray-500">{formatMessageDate(message.SentOnUtc || message.SentOn)}</Text>
              </HStack>
            </VStack>
          </HStack>

          {/* Message Type Badge */}
          <Badge variant="solid" className={getMessageTypeBadgeColor(message.Type)}>
            <Text className="text-xs text-white">{getMessageTypeLabel(message.Type)}</Text>
          </Badge>
        </HStack>

        {/* Subject */}
        <Text className={`font-semibold ${!isRead ? 'font-bold' : ''}`} numberOfLines={1}>
          {message.Subject || t('messages.no_subject')}
        </Text>

        {/* Message Body Preview */}
        <Text className="text-gray-600 dark:text-gray-300" numberOfLines={2}>
          {truncateText(message.Body)}
        </Text>

        {/* Footer Row */}
        <HStack space="sm" className="items-center justify-between">
          {/* Response Status */}
          {message.Responded && (
            <Badge variant="outline" className="border-green-500">
              <Text className="text-xs text-green-600">{t('messages.responded')}</Text>
            </Badge>
          )}

          {/* Expiration Warning */}
          {isExpired && (
            <Badge variant="outline" className="border-red-500">
              <Text className="text-xs text-red-600">{t('messages.expired')}</Text>
            </Badge>
          )}

          {/* Recipients Count */}
          {message.Recipients && message.Recipients.length > 0 && (
            <HStack space="xs" className="items-center">
              <User size={12} color="#6B7280" />
              <Text className="text-xs text-gray-500">{t('messages.recipients_count', { count: message.Recipients.length })}</Text>
            </HStack>
          )}
        </HStack>
      </VStack>
    </Pressable>
  );
};
