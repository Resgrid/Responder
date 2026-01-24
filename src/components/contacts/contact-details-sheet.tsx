import {
  BuildingIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Edit2Icon,
  GlobeIcon,
  HomeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SettingsIcon,
  SmartphoneIcon,
  StarIcon,
  TrashIcon,
  UserIcon,
  X,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import WebView from 'react-native-webview';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '@/components/ui/actionsheet';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { useAnalytics } from '@/hooks/use-analytics';
import { formatDateForDisplay, parseDateISOString } from '@/lib/utils';
import { ContactType } from '@/models/v4/contacts/contactResultData';
import { useContactsStore } from '@/stores/contacts/store';
import { sanitizeHtmlContent } from '@/utils/webview-html';

import { Box } from '../ui/box';
import { Button, ButtonText } from '../ui/button';
import { HStack } from '../ui/hstack';
import { Pressable } from '../ui/pressable';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';
import { ContactNotesList } from './contact-notes-list';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, isCollapsible = true, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <VStack space="md" className="border-b border-gray-200 pb-4 dark:border-gray-700">
      <Pressable onPress={isCollapsible ? () => setIsExpanded(!isExpanded) : undefined} className="flex-row items-center justify-between" disabled={!isCollapsible}>
        <HStack space="sm" className="items-center">
          <View className="size-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">{icon}</View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">{title}</Text>
        </HStack>
        {isCollapsible ? isExpanded ? <ChevronDownIcon size={20} color="#6366F1" /> : <ChevronRightIcon size={20} color="#6366F1" /> : null}
      </Pressable>
      {isExpanded ? <Box className="ml-10">{children}</Box> : null}
    </VStack>
  );
};

interface ContactFieldProps {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  isLink?: boolean;
  linkPrefix?: string;
  actionType?: 'email' | 'phone' | 'address';
  addressData?: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
}

const ContactField: React.FC<ContactFieldProps> = ({ label, value, icon, isLink, linkPrefix, actionType, addressData }) => {
  const { t } = useTranslation();
  if (!value || value.toString().trim() === '') return null;

  const displayValue = isLink && linkPrefix ? `${linkPrefix}${value}` : value.toString();

  const handlePress = async () => {
    if (!actionType) return;

    try {
      let url = '';

      switch (actionType) {
        case 'email':
          url = `mailto:${value}`;
          break;
        case 'phone':
          url = `tel:${value}`;
          break;
        case 'address': {
          const addressParts = addressData ? [addressData.address, addressData.city, addressData.state, addressData.zip].filter(Boolean).join(', ') : value;
          const encodedAddress = encodeURIComponent(addressParts?.toString() || '');

          if (Platform.OS === 'ios') {
            url = `maps:?q=${encodedAddress}`;
          } else {
            url = `geo:0,0?q=${encodedAddress}`;
          }
          break;
        }
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('contacts.errorTitle'), t('contacts.openAppError', { action: actionType }));
      }
    } catch (error) {
      console.warn('Failed to open link for action:', actionType, error);
      Alert.alert(t('contacts.errorTitle'), t('contacts.openAppError', { action: actionType }));
    }
  };

  const isActionable = !!actionType;

  return (
    <Pressable onPress={isActionable ? handlePress : undefined} disabled={!isActionable}>
      <HStack space="md" className="items-start py-2">
        {icon ? <View className="size-6 items-center justify-center">{icon}</View> : null}
        <VStack space="xs" className="flex-1">
          <Text className="text-sm text-gray-500 dark:text-gray-400">{label}</Text>
          <Text className={`text-base ${isActionable ? 'text-primary-600 underline dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>{displayValue}</Text>
        </VStack>
      </HStack>
    </Pressable>
  );
};

interface HtmlContentFieldProps {
  label: string;
  value: string | null | undefined;
}

const HtmlContentField: React.FC<HtmlContentFieldProps> = ({ label, value }) => {
  const { colorScheme } = useColorScheme();

  if (!value || value.toString().trim() === '') return null;

  const textColor = colorScheme === 'dark' ? '#E5E7EB' : '#1F2937';
  const bgColor = colorScheme === 'dark' ? '#374151' : '#F9FAFB';

  return (
    <VStack space="xs" className="py-2">
      <Text className="text-sm text-gray-500 dark:text-gray-400">{label}</Text>
      <View className="min-h-[60px] overflow-hidden rounded-lg">
        <WebView
          style={[styles.htmlContent, { backgroundColor: bgColor }]}
          originWhitelist={['about:']}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          javaScriptEnabled={false}
          domStorageEnabled={false}
          source={{
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                  <style>
                    body {
                      color: ${textColor};
                      font-family: system-ui, -apple-system, sans-serif;
                      margin: 0;
                      padding: 8px;
                      font-size: 14px;
                      line-height: 1.5;
                      background-color: ${bgColor};
                    }
                    * {
                      max-width: 100%;
                    }
                  </style>
                </head>
                <body>${sanitizeHtmlContent(value)}</body>
              </html>
            `,
          }}
          androidLayerType="software"
        />
      </View>
    </VStack>
  );
};

const styles = StyleSheet.create({
  htmlContent: {
    flex: 1,
    minHeight: 60,
  },
});

export const ContactDetailsSheet: React.FC = () => {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { trackEvent } = useAnalytics();
  const { contacts, selectedContactId, isDetailsOpen, closeDetails } = useContactsStore();
  const [activeTab, setActiveTab] = useState<'details' | 'notes'>('details');

  const selectedContact = React.useMemo(() => {
    if (!selectedContactId) return null;
    return contacts.find((contact) => contact.ContactId === selectedContactId);
  }, [contacts, selectedContactId]);

  // Track analytics when sheet becomes visible
  const trackViewAnalytics = useCallback(() => {
    if (!selectedContact) return;

    try {
      const hasContactInfo =
        selectedContact.Email ||
        selectedContact.Phone ||
        selectedContact.Mobile ||
        selectedContact.HomePhoneNumber ||
        selectedContact.CellPhoneNumber ||
        selectedContact.OfficePhoneNumber ||
        selectedContact.FaxPhoneNumber;

      const hasLocationInfo =
        selectedContact.Address ||
        selectedContact.City ||
        selectedContact.State ||
        selectedContact.Zip ||
        selectedContact.LocationGpsCoordinates ||
        selectedContact.EntranceGpsCoordinates ||
        selectedContact.ExitGpsCoordinates;

      const hasSocialMedia =
        selectedContact.Website ||
        selectedContact.Twitter ||
        selectedContact.Facebook ||
        selectedContact.LinkedIn ||
        selectedContact.Instagram ||
        selectedContact.Threads ||
        selectedContact.Bluesky ||
        selectedContact.Mastodon;

      trackEvent('contact_details_sheet_viewed', {
        timestamp: new Date().toISOString(),
        contactId: selectedContact.ContactId,
        contactType: selectedContact.ContactType === ContactType.Person ? 'person' : 'company',
        hasContactInfo: !!hasContactInfo,
        hasLocationInfo: !!hasLocationInfo,
        hasSocialMedia: !!hasSocialMedia,
        hasDescription: !!(selectedContact.Description || selectedContact.Notes || selectedContact.OtherInfo),
        isImportant: !!selectedContact.IsImportant,
        activeTab,
      });
    } catch (error) {
      // Analytics errors should not break the component
      console.warn('Failed to track contact details sheet view analytics:', error);
    }
  }, [trackEvent, selectedContact, activeTab]);

  // Track analytics when sheet becomes visible
  useEffect(() => {
    if (isDetailsOpen && selectedContact) {
      trackViewAnalytics();
    }
  }, [isDetailsOpen, selectedContact, trackViewAnalytics]);

  // Handle tab changes with analytics
  const handleTabChange = useCallback(
    (newTab: 'details' | 'notes') => {
      const fromTab = activeTab;
      setActiveTab(newTab);

      try {
        trackEvent('contact_details_tab_changed', {
          timestamp: new Date().toISOString(),
          contactId: selectedContact?.ContactId || '',
          fromTab,
          toTab: newTab,
        });
      } catch (error) {
        console.warn('Failed to track contact details tab change analytics:', error);
      }
    },
    [activeTab, selectedContact?.ContactId, trackEvent]
  );

  const handleDelete = async () => {
    if (selectedContactId) {
      //await removeContact(selectedContactId);
      closeDetails();
    }
  };

  if (!selectedContact) return null;

  const getDisplayName = () => {
    if (selectedContact.ContactType === ContactType.Person) {
      const firstName = selectedContact.FirstName?.trim() || '';
      const middleName = selectedContact.MiddleName?.trim() || '';
      const lastName = selectedContact.LastName?.trim() || '';
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
      return fullName || selectedContact.Name || 'Unknown Person';
    } else {
      return selectedContact.CompanyName?.trim() || selectedContact.Name || 'Unknown Company';
    }
  };

  const displayName = getDisplayName();

  const hasContactInfo =
    selectedContact.Email || selectedContact.Phone || selectedContact.Mobile || selectedContact.HomePhoneNumber || selectedContact.CellPhoneNumber || selectedContact.OfficePhoneNumber || selectedContact.FaxPhoneNumber;

  const hasLocationInfo =
    selectedContact.Address ||
    selectedContact.City ||
    selectedContact.State ||
    selectedContact.Zip ||
    selectedContact.LocationGpsCoordinates ||
    selectedContact.EntranceGpsCoordinates ||
    selectedContact.ExitGpsCoordinates;

  const hasSocialMedia =
    selectedContact.Website ||
    selectedContact.Twitter ||
    selectedContact.Facebook ||
    selectedContact.LinkedIn ||
    selectedContact.Instagram ||
    selectedContact.Threads ||
    selectedContact.Bluesky ||
    selectedContact.Mastodon;

  const hasIdentification = selectedContact.CountryIssuedIdNumber || selectedContact.StateIdNumber;

  const hasAdditionalInfo = selectedContact.Description || selectedContact.Notes || selectedContact.OtherInfo;

  const hasSystemInfo = selectedContact.AddedOn || selectedContact.AddedByUserName || selectedContact.EditedOn || selectedContact.EditedByUserName;

  return (
    <Actionsheet isOpen={isDetailsOpen} onClose={closeDetails} snapPoints={[85]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="w-full rounded-t-xl bg-white dark:bg-gray-800">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <Box className="w-full flex-1 p-4">
          <HStack className="mb-4 items-center justify-between">
            <Text className="text-xl font-semibold text-gray-900 dark:text-white">{t('contacts.details')}</Text>
            <Button variant="link" onPress={closeDetails} className="p-1">
              <X size={24} className="text-gray-600 dark:text-gray-400" />
            </Button>
          </HStack>

          {/* Contact Header */}
          <VStack space="md" className="items-center pb-4">
            <Avatar size="xl" className="mb-2">
              {selectedContact.ImageUrl ? (
                <AvatarImage source={{ uri: selectedContact.ImageUrl }} alt={displayName} />
              ) : (
                <View className="size-full items-center justify-center bg-primary-500">
                  {selectedContact.ContactType === ContactType.Person ? <UserIcon size={48} color="#000" /> : <BuildingIcon size={48} color="#000" />}
                </View>
              )}
            </Avatar>

            <VStack space="xs" className="items-center">
              <HStack space="xs" className="items-center">
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">{displayName}</Text>
                {selectedContact.IsImportant ? <StarIcon size={20} color="#FFD700" /> : null}
              </HStack>
              <Text className="text-sm text-gray-500 dark:text-gray-400">{selectedContact.ContactType === ContactType.Person ? t('contacts.person') : t('contacts.company')}</Text>
              {selectedContact.OtherName ? <Text className="text-sm text-gray-600 dark:text-gray-300">({selectedContact.OtherName})</Text> : null}
              {selectedContact.Category?.Name ? <Text className="text-sm text-primary-600 dark:text-primary-400">{selectedContact.Category.Name}</Text> : null}
            </VStack>
          </VStack>

          {/* Tab Navigation */}
          <HStack className="mb-4 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <Pressable onPress={() => handleTabChange('details')} className={`flex-1 rounded-md ${isLandscape ? 'px-4 py-2' : 'px-3 py-1.5'} ${activeTab === 'details' ? 'bg-white shadow-sm dark:bg-gray-700' : ''}`}>
              <Text className={`text-center font-medium ${isLandscape ? 'text-sm' : 'text-xs'} ${activeTab === 'details' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {t('contacts.tabs.details')}
              </Text>
            </Pressable>
            <Pressable onPress={() => handleTabChange('notes')} className={`flex-1 rounded-md ${isLandscape ? 'px-4 py-2' : 'px-3 py-1.5'} ${activeTab === 'notes' ? 'bg-white shadow-sm dark:bg-gray-700' : ''}`}>
              <Text className={`text-center font-medium ${isLandscape ? 'text-sm' : 'text-xs'} ${activeTab === 'notes' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {t('contacts.tabs.notes')}
              </Text>
            </Pressable>
          </HStack>

          {/* Tab Content */}
          {activeTab === 'details' ? (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <VStack space="lg" className="flex-1">
                {/* Contact Information Section */}
                {hasContactInfo ? (
                  <Section title={t('contacts.contactInformation')} icon={<PhoneIcon size={16} color="#6366F1" />}>
                    <VStack space="xs">
                      <ContactField label={t('contacts.email')} value={selectedContact.Email} icon={<MailIcon size={16} color="#6366F1" />} actionType="email" />
                      <ContactField label={t('contacts.phone')} value={selectedContact.Phone} icon={<PhoneIcon size={16} color="#6366F1" />} actionType="phone" />
                      <ContactField label={t('contacts.mobile')} value={selectedContact.Mobile} icon={<SmartphoneIcon size={16} color="#6366F1" />} actionType="phone" />
                      <ContactField label={t('contacts.homePhone')} value={selectedContact.HomePhoneNumber} icon={<HomeIcon size={16} color="#6366F1" />} actionType="phone" />
                      <ContactField label={t('contacts.cellPhone')} value={selectedContact.CellPhoneNumber} icon={<SmartphoneIcon size={16} color="#6366F1" />} actionType="phone" />
                      <ContactField label={t('contacts.officePhone')} value={selectedContact.OfficePhoneNumber} icon={<PhoneIcon size={16} color="#6366F1" />} actionType="phone" />
                      <ContactField label={t('contacts.faxPhone')} value={selectedContact.FaxPhoneNumber} icon={<PhoneIcon size={16} color="#6366F1" />} actionType="phone" />
                    </VStack>
                  </Section>
                ) : null}

                {/* Location Information Section */}
                {hasLocationInfo ? (
                  <Section title={t('contacts.locationInformation')} icon={<MapPinIcon size={16} color="#6366F1" />}>
                    <VStack space="xs">
                      <ContactField
                        label={t('contacts.address')}
                        value={selectedContact.Address}
                        icon={<HomeIcon size={16} color="#6366F1" />}
                        actionType="address"
                        addressData={{
                          address: selectedContact.Address,
                          city: selectedContact.City,
                          state: selectedContact.State,
                          zip: selectedContact.Zip,
                        }}
                      />
                      {selectedContact.City || selectedContact.State || selectedContact.Zip ? (
                        <ContactField
                          label={t('contacts.cityStateZip')}
                          value={[selectedContact.City, selectedContact.State, selectedContact.Zip].filter(Boolean).join(', ')}
                          icon={<MapPinIcon size={16} color="#6366F1" />}
                          actionType="address"
                          addressData={{
                            address: selectedContact.Address,
                            city: selectedContact.City,
                            state: selectedContact.State,
                            zip: selectedContact.Zip,
                          }}
                        />
                      ) : null}
                      <ContactField label={t('contacts.locationCoordinates')} value={selectedContact.LocationGpsCoordinates} icon={<MapPinIcon size={16} color="#6366F1" />} actionType="address" />
                      <ContactField label={t('contacts.entranceCoordinates')} value={selectedContact.EntranceGpsCoordinates} icon={<MapPinIcon size={16} color="#6366F1" />} actionType="address" />
                      <ContactField label={t('contacts.exitCoordinates')} value={selectedContact.ExitGpsCoordinates} icon={<MapPinIcon size={16} color="#6366F1" />} actionType="address" />
                    </VStack>
                  </Section>
                ) : null}

                {/* Social Media & Web Section */}
                {hasSocialMedia ? (
                  <Section title={t('contacts.socialMediaWeb')} icon={<GlobeIcon size={16} color="#6366F1" />} defaultExpanded={false}>
                    <VStack space="xs">
                      <ContactField label={t('contacts.website')} value={selectedContact.Website} icon={<GlobeIcon size={16} color="#6366F1" />} isLink />
                      <ContactField label={t('contacts.twitter')} value={selectedContact.Twitter} isLink linkPrefix="@" />
                      <ContactField label={t('contacts.facebook')} value={selectedContact.Facebook} />
                      <ContactField label={t('contacts.linkedin')} value={selectedContact.LinkedIn} />
                      <ContactField label={t('contacts.instagram')} value={selectedContact.Instagram} isLink linkPrefix="@" />
                      <ContactField label={t('contacts.threads')} value={selectedContact.Threads} isLink linkPrefix="@" />
                      <ContactField label={t('contacts.bluesky')} value={selectedContact.Bluesky} isLink linkPrefix="@" />
                      <ContactField label={t('contacts.mastodon')} value={selectedContact.Mastodon} isLink linkPrefix="@" />
                    </VStack>
                  </Section>
                ) : null}

                {/* Identification Section */}
                {hasIdentification ? (
                  <Section title={t('contacts.identification')} icon={<SettingsIcon size={16} color="#6366F1" />} defaultExpanded={false}>
                    <VStack space="xs">
                      <ContactField label={selectedContact.CountryIdName || t('contacts.countryId')} value={selectedContact.CountryIssuedIdNumber} />
                      <ContactField
                        label={`${selectedContact.StateIdName || t('contacts.stateId')} ${selectedContact.StateIdCountryName ? `(${selectedContact.StateIdCountryName})` : ''}`}
                        value={selectedContact.StateIdNumber}
                      />
                    </VStack>
                  </Section>
                ) : null}

                {/* Additional Information Section */}
                {hasAdditionalInfo ? (
                  <Section title={t('contacts.additionalInformation')} icon={<SettingsIcon size={16} color="#6366F1" />} defaultExpanded={false}>
                    <VStack space="xs">
                      <HtmlContentField label={t('contacts.descriptionLabel')} value={selectedContact.Description} />
                      <HtmlContentField label={t('contacts.notes')} value={selectedContact.Notes} />
                      <HtmlContentField label={t('contacts.otherInfo')} value={selectedContact.OtherInfo} />
                    </VStack>
                  </Section>
                ) : null}

                {/* System Information Section */}
                {hasSystemInfo ? (
                  <Section title={t('contacts.systemInformation')} icon={<CalendarIcon size={16} color="#6366F1" />} defaultExpanded={false}>
                    <VStack space="xs">
                      <ContactField
                        label={t('contacts.addedOn')}
                        value={selectedContact.AddedOn ? formatDateForDisplay(parseDateISOString(selectedContact.AddedOn), 'yyyy-MM-dd HH:mm') : undefined}
                        icon={<CalendarIcon size={16} color="#6366F1" />}
                      />
                      <ContactField label={t('contacts.addedBy')} value={selectedContact.AddedByUserName} icon={<UserIcon size={16} color="#6366F1" />} />
                      <ContactField
                        label={t('contacts.editedOn')}
                        value={selectedContact.EditedOn ? formatDateForDisplay(parseDateISOString(selectedContact.EditedOn), 'yyyy-MM-dd HH:mm') : undefined}
                        icon={<CalendarIcon size={16} color="#6366F1" />}
                      />
                      <ContactField label={t('contacts.editedBy')} value={selectedContact.EditedByUserName} icon={<UserIcon size={16} color="#6366F1" />} />
                    </VStack>
                  </Section>
                ) : null}
              </VStack>
            </ScrollView>
          ) : (
            <ContactNotesList contactId={selectedContact.ContactId} />
          )}
        </Box>
      </ActionsheetContent>
    </Actionsheet>
  );
};
