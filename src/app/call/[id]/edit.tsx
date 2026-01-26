import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
/* eslint-disable import/order */
import { SHA256 } from 'crypto-js';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronDownIcon, PlusIcon, SearchIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import * as z from 'zod';

import { DispatchSelectionModal } from '@/components/calls/dispatch-selection-modal';
import { Loading } from '@/components/common/loading';
import FullScreenLocationPicker from '@/components/maps/full-screen-location-picker';
import LocationPicker from '@/components/maps/location-picker';
import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormControl, FormControlError, FormControlLabel, FormControlLabelText } from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';
import { Select, SelectBackdrop, SelectContent, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useAnalytics } from '@/hooks/use-analytics';
import { useCoreStore } from '@/stores/app/core-store';
import { useCallDetailStore } from '@/stores/calls/detail-store';
import { useCallsStore } from '@/stores/calls/store';
import { type DispatchSelection } from '@/stores/dispatch/store';

// Form validation schema (same as New Call)
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nature: z.string().min(1, 'Nature is required'),
  note: z.string().optional(),
  address: z.string().optional(),
  coordinates: z.string().optional(),
  what3words: z.string().optional(),
  plusCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  contactName: z.string().optional(),
  contactInfo: z.string().optional(),
  dispatchSelection: z.object({
    everyone: z.boolean(),
    users: z.array(z.string()),
    groups: z.array(z.string()),
    roles: z.array(z.string()),
    units: z.array(z.string()),
  }),
});

type FormValues = z.infer<typeof formSchema>;

// Helper function to strip HTML tags from rich text content
const stripHtml = (html: string | undefined | null): string => {
  if (!html) return '';
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  // Trim whitespace
  return text.trim();
};

interface GeocodingResult {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface GeocodingResponse {
  results: GeocodingResult[];
  status: string;
}

export default function EditCall() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { id } = useLocalSearchParams();
  const callId = Array.isArray(id) ? id[0] : id;
  const { callPriorities, callTypes, isLoading: callDataLoading, error: callDataError, fetchCallPriorities, fetchCallTypes } = useCallsStore();
  const { call, callExtraData, isLoading: callDetailLoading, error: callDetailError, fetchCallDetail } = useCallDetailStore();
  const { config } = useCoreStore();
  const { trackEvent } = useAnalytics();
  // Safe wrapper for analytics that catches errors and promise rejections
  const safeTrack = React.useCallback(
    (eventName: string, properties?: Record<string, string | number | boolean>) => {
      try {
        const res = trackEvent(eventName, properties);
        // Handle promise rejections if trackEvent returns a promise
        Promise.resolve(res).catch((error) => {
          console.error(`[Analytics] Error tracking event ${eventName}`, error);
        });
      } catch (error) {
        console.error(`[Analytics] Error tracking event ${eventName}`, error);
      }
    },
    [trackEvent]
  );
  const toast = useToast();
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showAddressSelection, setShowAddressSelection] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [isGeocodingPlusCode, setIsGeocodingPlusCode] = useState(false);
  const [isGeocodingCoordinates, setIsGeocodingCoordinates] = useState(false);
  const [isGeocodingWhat3Words, setIsGeocodingWhat3Words] = useState(false);
  const [addressResults, setAddressResults] = useState<GeocodingResult[]>([]);
  const [dispatchSelection, setDispatchSelection] = useState<DispatchSelection>({
    everyone: false,
    users: [],
    groups: [],
    roles: [],
    units: [],
  });
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      nature: '',
      note: '',
      address: '',
      coordinates: '',
      what3words: '',
      plusCode: '',
      latitude: undefined,
      longitude: undefined,
      priority: '',
      type: '',
      contactName: '',
      contactInfo: '',
      dispatchSelection: {
        everyone: false,
        users: [],
        groups: [],
        roles: [],
        units: [],
      },
    },
  });

  useEffect(() => {
    fetchCallPriorities();
    fetchCallTypes();
    if (callId) {
      fetchCallDetail(callId);
    }
  }, [fetchCallPriorities, fetchCallTypes, fetchCallDetail, callId]);

  // Analytics: Track when edit call page is viewed
  useFocusEffect(
    useCallback(() => {
      if (!callDataLoading && !callDetailLoading && call && callPriorities.length > 0 && callTypes.length > 0) {
        safeTrack('call_edit_viewed', {
          timestamp: new Date().toISOString(),
          callId: callId || '',
          priority: callPriorities.find((p) => p.Id === call.Priority)?.Name || 'Unknown',
          type: callTypes.find((t) => t.Id === call.Type)?.Name || 'Unknown',
          priorityCount: callPriorities.length,
          typeCount: callTypes.length,
          hasGoogleMapsKey: !!config?.GoogleMapsKey,
          hasWhat3WordsKey: !!config?.W3WKey,
          hasAddress: !!call.Address,
          hasCoordinates: !!(call.Latitude && call.Longitude),
          hasContactInfo: !!(call.ContactName || call.ContactInfo),
        });
      }
    }, [safeTrack, callDataLoading, callDetailLoading, call, callPriorities, callTypes, callId, config?.GoogleMapsKey, config?.W3WKey])
  );

  // Pre-populate form when call data is loaded
  useEffect(() => {
    if (call) {
      console.log('Raw call data:', JSON.stringify(call, null, 2));
      console.log('Loading call data:', { Priority: call.Priority, Type: call.Type });
      console.log('Available call types:', callTypes);
      console.log('Available call priorities:', callPriorities);

      const priority = callPriorities.find((p) => p.Id === call.Priority);
      const type = callTypes.find((t) => t.Id === call.Type);

      console.log('Found priority:', priority);
      console.log('Found type:', type);

      // Parse dispatched items from callExtraData
      const dispatchedUsers: string[] = [];
      const dispatchedGroups: string[] = [];
      const dispatchedRoles: string[] = [];
      const dispatchedUnits: string[] = [];

      if (callExtraData?.Dispatches) {
        callExtraData.Dispatches.forEach((dispatch) => {
          // Type indicates what kind of entity was dispatched
          // Common types: "User", "Unit", "Group", "Role"
          const dispatchType = dispatch.Type?.toLowerCase() || '';
          const dispatchId = dispatch.Id;

          if (dispatchId) {
            if (dispatchType === 'user' || dispatchType === 'personnel') {
              dispatchedUsers.push(dispatchId);
            } else if (dispatchType === 'unit') {
              dispatchedUnits.push(dispatchId);
            } else if (dispatchType === 'group' || dispatchType === 'station') {
              dispatchedGroups.push(dispatchId);
            } else if (dispatchType === 'role') {
              dispatchedRoles.push(dispatchId);
            }
          }
        });
      }

      const initialDispatchSelection: DispatchSelection = {
        everyone: false,
        users: dispatchedUsers,
        groups: dispatchedGroups,
        roles: dispatchedRoles,
        units: dispatchedUnits,
      };

      // Update local state for dispatch selection
      setDispatchSelection(initialDispatchSelection);

      reset({
        name: call.Name || '',
        nature: stripHtml(call.Nature),
        note: stripHtml(call.Note),
        address: call.Address || '',
        coordinates: call.Geolocation || '',
        what3words: '',
        plusCode: '',
        latitude: call.Latitude ? parseFloat(call.Latitude) : undefined,
        longitude: call.Longitude ? parseFloat(call.Longitude) : undefined,
        priority: priority?.Name || '',
        type: type?.Name || '',
        contactName: call.ContactName || '',
        contactInfo: call.ContactInfo || '',
        dispatchSelection: initialDispatchSelection,
      });

      // Set selected location if coordinates exist
      if (call.Latitude !== undefined && call.Longitude !== undefined) {
        const latitude = parseFloat(call.Latitude);
        const longitude = parseFloat(call.Longitude);

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setSelectedLocation({
            latitude,
            longitude,
            ...(call.Address && { address: call.Address }),
          });
        }
      }
    }
  }, [call, callExtraData, callPriorities, callTypes, reset]);

  const onSubmit = async (data: FormValues) => {
    console.log('onSubmit called!');
    console.log('Form data:', JSON.stringify(data, null, 2));
    try {
      // If we have latitude and longitude, add them to the data
      if (selectedLocation?.latitude && selectedLocation?.longitude) {
        data.latitude = selectedLocation.latitude;
        data.longitude = selectedLocation.longitude;
      }

      console.log('Updating call with data:', data);
      console.log(
        'Available priorities:',
        callPriorities.map((p) => p.Name)
      );
      console.log(
        'Available types:',
        callTypes.map((t) => t.Name)
      );

      const priority = data.priority ? callPriorities.find((p) => p.Name === data.priority) : null;
      const type = data.type ? callTypes.find((t) => t.Name === data.type) : null;

      console.log('Found priority:', priority);
      console.log('Found type:', type);

      if (data.priority && !priority) {
        throw new Error(`Priority "${data.priority}" not found in available priorities`);
      }

      if (data.type && !type) {
        throw new Error(`Type "${data.type}" not found in available types`);
      }

      // Analytics: Track call update attempt
      safeTrack('call_update_attempted', {
        timestamp: new Date().toISOString(),
        callId: callId || '',
        priority: data.priority,
        type: data.type,
        hasNote: !!data.note,
        hasAddress: !!data.address,
        hasCoordinates: !!(data.latitude && data.longitude),
        hasWhat3Words: !!data.what3words,
        hasPlusCode: !!data.plusCode,
        hasContactName: !!data.contactName,
        hasContactInfo: !!data.contactInfo,
        dispatchEveryone: data.dispatchSelection?.everyone || false,
        dispatchCount: (data.dispatchSelection?.users.length || 0) + (data.dispatchSelection?.groups.length || 0) + (data.dispatchSelection?.roles.length || 0) + (data.dispatchSelection?.units.length || 0),
      });

      // Update the call using the store
      const updatePayload = {
        callId: callId!,
        name: data.name,
        nature: data.nature,
        priority: priority?.Id || 0,
        type: type?.Id || '',
        note: data.note || '',
        address: data.address || '',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        what3words: data.what3words || '',
        plusCode: data.plusCode || '',
        contactName: data.contactName || '',
        contactInfo: data.contactInfo || '',
        dispatchUsers: data.dispatchSelection?.users || [],
        dispatchGroups: data.dispatchSelection?.groups || [],
        dispatchRoles: data.dispatchSelection?.roles || [],
        dispatchUnits: data.dispatchSelection?.units || [],
        dispatchEveryone: data.dispatchSelection?.everyone || false,
      };

      console.log('Update payload:', JSON.stringify(updatePayload, null, 2));

      await useCallDetailStore.getState().updateCall(updatePayload);

      // Analytics: Track successful call update
      safeTrack('call_update_success', {
        timestamp: new Date().toISOString(),
        callId: callId || '',
        priority: data.priority,
        type: data.type,
        hasLocation: !!(data.latitude && data.longitude),
        dispatchMethod: data.dispatchSelection?.everyone ? 'everyone' : 'selective',
      });

      // Show success toast
      toast.show({
        placement: 'top',
        render: () => {
          return (
            <Box className="rounded-lg bg-green-500 p-4 shadow-lg">
              <Text className="text-white">{t('call_detail.update_call_success')}</Text>
            </Box>
          );
        },
      });

      // Navigate back to call detail
      router.back();
    } catch (error) {
      console.error('Error updating call:', error);

      // Analytics: Track failed call update
      safeTrack('call_update_failed', {
        timestamp: new Date().toISOString(),
        callId: callId || '',
        priority: data.priority,
        type: data.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Show error toast
      toast.show({
        placement: 'top',
        render: () => {
          return (
            <Box className="rounded-lg bg-red-500 p-4 shadow-lg">
              <Text className="text-white">{t('call_detail.update_call_error')}</Text>
            </Box>
          );
        },
      });
    }
  };

  const handleLocationSelected = (location: { latitude: number; longitude: number; address?: string }) => {
    setSelectedLocation(location);
    setValue('latitude', location.latitude);
    setValue('longitude', location.longitude);
    if (location.address) {
      setValue('address', location.address);
    }

    // Analytics: Track location selection
    safeTrack('call_edit_location_selected', {
      timestamp: new Date().toISOString(),
      callId: callId || '',
      hasAddress: !!location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    });

    setShowLocationPicker(false);
  };

  const handleDispatchSelection = (selection: DispatchSelection) => {
    setDispatchSelection(selection);
    setValue('dispatchSelection', selection);

    // Analytics: Track dispatch selection
    safeTrack('call_edit_dispatch_selection_updated', {
      timestamp: new Date().toISOString(),
      callId: callId || '',
      everyone: selection.everyone,
      userCount: selection.users.length,
      groupCount: selection.groups.length,
      roleCount: selection.roles.length,
      unitCount: selection.units.length,
      totalSelected: selection.users.length + selection.groups.length + selection.roles.length + selection.units.length,
    });

    setShowDispatchModal(false);
  };

  const getDispatchSummary = () => {
    if (dispatchSelection.everyone) {
      return t('calls.everyone');
    }

    const totalSelected = dispatchSelection.users.length + dispatchSelection.groups.length + dispatchSelection.roles.length + dispatchSelection.units.length;

    if (totalSelected === 0) {
      return t('calls.select_recipients');
    }

    return `${totalSelected} ${t('calls.selected')}`;
  };

  // Address search functionality (same as New Call)
  const handleAddressSearch = async (address: string) => {
    if (!address.trim()) {
      toast.show({
        placement: 'top',
        render: () => {
          return (
            <Box className="rounded-lg bg-orange-500 p-4 shadow-lg">
              <Text className="text-white">{t('calls.address_required')}</Text>
            </Box>
          );
        },
      });
      return;
    }

    // Analytics: Track address search attempt
    safeTrack('call_edit_address_search_attempted', {
      timestamp: new Date().toISOString(),
      callId: callId || '',
      hasGoogleMapsKey: !!config?.GoogleMapsKey,
    });

    setIsGeocodingAddress(true);
    try {
      const apiKey = config?.GoogleMapsKey;

      if (!apiKey) {
        // Analytics: Track missing API key
        safeTrack('call_edit_address_search_failed', {
          timestamp: new Date().toISOString(),
          callId: callId || '',
          reason: 'missing_api_key',
        });
        throw new Error('Google Maps API key not configured');
      }

      const response = await axios.get<GeocodingResponse>(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`);

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const results = response.data.results;

        // Analytics: Track successful address search
        safeTrack('call_edit_address_search_success', {
          timestamp: new Date().toISOString(),
          callId: callId || '',
          resultCount: results.length,
          hasMultipleResults: results.length > 1,
        });

        if (results.length === 1) {
          const result = results[0];
          if (result) {
            const newLocation = {
              latitude: result.geometry.location.lat,
              longitude: result.geometry.location.lng,
              address: result.formatted_address,
            };

            handleLocationSelected(newLocation);
          }

          toast.show({
            placement: 'top',
            render: () => {
              return (
                <Box className="rounded-lg bg-green-500 p-4 shadow-lg">
                  <Text className="text-white">{t('calls.address_found')}</Text>
                </Box>
              );
            },
          });
        } else {
          setAddressResults(results);
          setShowAddressSelection(true);
        }
      } else {
        // Analytics: Track failed address search
        safeTrack('call_edit_address_search_failed', {
          timestamp: new Date().toISOString(),
          callId: callId || '',
          reason: 'no_results',
          status: response.data.status,
        });

        toast.show({
          placement: 'top',
          render: () => {
            return (
              <Box className="rounded-lg bg-red-500 p-4 shadow-lg">
                <Text className="text-white">{t('calls.address_not_found')}</Text>
              </Box>
            );
          },
        });
      }
    } catch (error) {
      console.error('Error geocoding address:', error);

      // Analytics: Track geocoding error (if not already tracked above)
      if (!(error instanceof Error && error.message.includes('Google Maps API key'))) {
        safeTrack('call_edit_address_search_failed', {
          timestamp: new Date().toISOString(),
          callId: callId || '',
          reason: 'network_error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      toast.show({
        placement: 'top',
        render: () => {
          return (
            <Box className="rounded-lg bg-red-500 p-4 shadow-lg">
              <Text className="text-white">{t('calls.geocoding_error')}</Text>
            </Box>
          );
        },
      });
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  const handleAddressSelected = (result: GeocodingResult) => {
    const newLocation = {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      address: result.formatted_address,
    };

    handleLocationSelected(newLocation);
    setShowAddressSelection(false);

    // Analytics: Track address selection from multiple results privately
    const hashedAddress = SHA256(result.formatted_address).toString();
    safeTrack('call_edit_address_selected', {
      timestamp: new Date().toISOString(),
      callId: callId || '',
      place_id: result.place_id,
      hashedAddress,
    });

    toast.show({
      placement: 'top',
      render: () => {
        return (
          <Box className="rounded-lg bg-green-500 p-4 shadow-lg">
            <Text className="text-white">{t('calls.address_found')}</Text>
          </Box>
        );
      },
    });
  };

  if (callDetailLoading || callDataLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('calls.edit_call'),
            headerShown: true,
          }}
        />
        <Loading />
      </>
    );
  }

  if (callDetailError || callDataError || !call) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('calls.edit_call'),
            headerShown: true,
          }}
        />
        <View className="size-full flex-1">
          <Box className="m-3 mt-5 min-h-[200px] w-full max-w-[600px] gap-5 self-center rounded-lg bg-background-50 p-5 lg:min-w-[700px]">
            <Text className="error text-center">{callDetailError || callDataError || 'Call not found'}</Text>
          </Box>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('calls.edit_call'),
          headerShown: true,
        }}
      />
      <View className="size-full flex-1">
        <Box className={`size-full w-full flex-1 ${colorScheme === 'dark' ? 'bg-neutral-950' : 'bg-neutral-50'}`}>
          <ScrollView className="flex-1 px-4 py-6">
            <Text className="mb-6 text-2xl font-bold">{t('calls.edit_call_description')}</Text>

            <Card className={`mb-8 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
              <FormControl isInvalid={!!errors.name}>
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.name')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input>
                      <InputField placeholder={t('calls.name_placeholder')} value={value} onChangeText={onChange} onBlur={onBlur} />
                    </Input>
                  )}
                />
                {errors.name && (
                  <FormControlError>
                    <Text className="text-red-500">{errors.name.message}</Text>
                  </FormControlError>
                )}
              </FormControl>
            </Card>

            <Card className={`mb-8 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
              <FormControl isInvalid={!!errors.nature}>
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.nature')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="nature"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Textarea>
                      <TextareaInput value={value} onChangeText={onChange} onBlur={onBlur} numberOfLines={4} placeholder={t('calls.nature_placeholder')} />
                    </Textarea>
                  )}
                />
                {errors.nature && (
                  <FormControlError>
                    <Text className="text-red-500">{errors.nature.message}</Text>
                  </FormControlError>
                )}
              </FormControl>
            </Card>

            <Card className={`mb-8 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.priority')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field: { onChange, value } }) => (
                    <Select selectedValue={value} onValueChange={onChange}>
                      <SelectTrigger>
                        <SelectInput placeholder={t('calls.priority_placeholder')} />
                        <SelectIcon as={ChevronDownIcon} />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent className="max-h-[60vh] pb-20">
                          {callPriorities.map((priority) => (
                            <SelectItem key={priority.Id} label={priority.Name} value={priority.Name} />
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  )}
                />
              </FormControl>
            </Card>

            <Card className={`mb-8 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.type')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="type"
                  render={({ field: { onChange, value } }) => (
                    <Select selectedValue={value} onValueChange={onChange}>
                      <SelectTrigger>
                        <SelectInput placeholder={t('calls.select_type')} />
                        <SelectIcon as={ChevronDownIcon} />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent className="max-h-[60vh] pb-20">
                          {callTypes.map((type) => (
                            <SelectItem key={type.Id} label={type.Name} value={type.Name} />
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  )}
                />
              </FormControl>
            </Card>

            <Card className={`mb-8 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.note')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="note"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Textarea>
                      <TextareaInput value={value} onChangeText={onChange} onBlur={onBlur} numberOfLines={4} placeholder={t('calls.note_placeholder')} />
                    </Textarea>
                  )}
                />
              </FormControl>
            </Card>

            <Card className={`mb-8 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
              <Text className="mb-4 text-lg font-semibold">{t('calls.call_location')}</Text>

              {/* Address Field */}
              <FormControl className="mb-4">
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.address')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="address"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Box className="flex-row items-center space-x-2">
                      <Box className="flex-1">
                        <Input>
                          <InputField testID="address-input" placeholder={t('calls.address_placeholder')} value={value} onChangeText={onChange} onBlur={onBlur} />
                        </Input>
                      </Box>
                      <Button testID="address-search-button" size="sm" variant="outline" className="ml-2" onPress={() => handleAddressSearch(value || '')} disabled={isGeocodingAddress || !value?.trim()}>
                        {isGeocodingAddress ? <Text>...</Text> : <SearchIcon size={16} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />}
                      </Button>
                    </Box>
                  )}
                />
              </FormControl>

              {/* Map Preview */}
              <Box className="mb-4">
                {selectedLocation ? (
                  <LocationPicker initialLocation={selectedLocation} onLocationSelected={handleLocationSelected} height={200} />
                ) : (
                  <Button onPress={() => setShowLocationPicker(true)} className="w-full">
                    <ButtonText>{t('calls.select_location')}</ButtonText>
                  </Button>
                )}
              </Box>
            </Card>

            <Card className={`mb-8 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.contact_name')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="contactName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input>
                      <InputField placeholder={t('calls.contact_name_placeholder')} value={value} onChangeText={onChange} onBlur={onBlur} />
                    </Input>
                  )}
                />
              </FormControl>
            </Card>

            <Card className={`mb-8 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.contact_info')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="contactInfo"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input>
                      <InputField placeholder={t('calls.contact_info_placeholder')} value={value} onChangeText={onChange} onBlur={onBlur} />
                    </Input>
                  )}
                />
              </FormControl>
            </Card>

            <Card className={`mb-8 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
              <Text className="mb-4 text-lg font-semibold">{t('calls.dispatch_to')}</Text>
              <Button onPress={() => setShowDispatchModal(true)} className="w-full">
                <ButtonText>{getDispatchSummary()}</ButtonText>
              </Button>
            </Card>

            <Box className="mb-6 flex-row space-x-4">
              <Button className="mr-10 flex-1" variant="outline" onPress={() => router.back()}>
                <ButtonText>{t('common.cancel')}</ButtonText>
              </Button>
              <Button
                className="ml-10 flex-1"
                variant="solid"
                action="primary"
                onPress={async () => {
                  console.log('Save button pressed');
                  console.log('Form errors:', errors);
                  console.log('Current form values:', getValues());
                  try {
                    console.log('Calling handleSubmit...');
                    await handleSubmit(
                      (data) => {
                        console.log('Validation passed, calling onSubmit');
                        onSubmit(data);
                      },
                      (errors) => {
                        console.log('Validation failed with errors:', errors);
                      }
                    )();
                    console.log('handleSubmit completed');
                  } catch (error) {
                    console.error('Error in handleSubmit:', error);
                  }
                }}
              >
                <ButtonText>{t('common.save')}</ButtonText>
              </Button>
            </Box>
          </ScrollView>
        </Box>
        <Box className="h-8" />
      </View>

      {/* Full-screen location picker overlay */}
      {showLocationPicker && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }}
        >
          <FullScreenLocationPicker
            key={showLocationPicker ? 'location-picker-open' : 'location-picker-closed'}
            initialLocation={selectedLocation ?? undefined}
            onLocationSelected={handleLocationSelected}
            onClose={() => setShowLocationPicker(false)}
          />
        </View>
      )}

      {/* Dispatch selection modal */}
      <DispatchSelectionModal isVisible={showDispatchModal} onClose={() => setShowDispatchModal(false)} onConfirm={handleDispatchSelection} initialSelection={dispatchSelection} />

      {/* Address selection bottom sheet */}
      <CustomBottomSheet isOpen={showAddressSelection} onClose={() => setShowAddressSelection(false)} isLoading={false}>
        <Box className="p-4">
          <Text className="mb-4 text-center text-lg font-semibold">{t('calls.select_address')}</Text>
          <ScrollView className="max-h-96">
            {addressResults.map((result, index) => (
              <Button key={result.place_id || index} variant="outline" className="mb-2 w-full" onPress={() => handleAddressSelected(result)}>
                <ButtonText className="flex-1 text-left" numberOfLines={2}>
                  {result.formatted_address}
                </ButtonText>
              </Button>
            ))}
          </ScrollView>
        </Box>
      </CustomBottomSheet>
    </>
  );
}
