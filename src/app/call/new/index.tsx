import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import { ChevronDownIcon, PlusIcon, SearchIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as z from 'zod';

import { createCall } from '@/api/calls/calls';
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
import { useAnalytics } from '@/hooks/use-analytics';
import { useToast } from '@/hooks/use-toast';
import { useCoreStore } from '@/stores/app/core-store';
import { useCallsStore } from '@/stores/calls/store';
import { type DispatchSelection } from '@/stores/dispatch/store';

// Utility to sanitize error messages for analytics
const sanitizeErrorString = (error: unknown): string => {
  if (error instanceof Error) {
    let str = `${error.name}: ${error.message}`;
    // Remove control characters and newlines
    str = str.replace(/[\x00-\x1F\x7F]+/g, ' ').replace(/[\r\n]+/g, ' ');
    // Collapse whitespace
    str = str.replace(/\s+/g, ' ').trim();
    // Truncate to 200 characters
    return str.length > 200 ? str.slice(0, 200) : str;
  }
  return 'Unknown error';
};

// Define the form schema using zod
const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  nature: z.string().min(1, { message: 'Nature is required' }),
  note: z.string().optional(),
  address: z.string().optional(),
  coordinates: z.string().optional(),
  what3words: z.string().optional(),
  plusCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  priority: z.string().min(1, { message: 'Priority is required' }),
  type: z.string().min(1, { message: 'Type is required' }),
  contactName: z.string().optional(),
  contactInfo: z.string().optional(),
  dispatchSelection: z
    .object({
      everyone: z.boolean(),
      users: z.array(z.string()),
      groups: z.array(z.string()),
      roles: z.array(z.string()),
      units: z.array(z.string()),
    })
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Google Maps Geocoding API response types
interface GeocodingResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
}

interface GeocodingResponse {
  results: GeocodingResult[];
  status: string;
}

// what3words API response types
interface What3WordsResponse {
  country: string;
  square: {
    southwest: {
      lng: number;
      lat: number;
    };
    northeast: {
      lng: number;
      lat: number;
    };
  };
  nearestPlace: string;
  coordinates: {
    lng: number;
    lat: number;
  };
  words: string;
  language: string;
  map: string;
}

export default function NewCall() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { callPriorities, callTypes, isLoading, error, fetchCallPriorities, fetchCallTypes } = useCallsStore();
  const { config } = useCoreStore();
  const { trackEvent } = useAnalytics();
  const toast = useToast();
  const insets = useSafeAreaInsets();
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
  }, [fetchCallPriorities, fetchCallTypes]);

  // Analytics: Track when the new call page is viewed
  useFocusEffect(
    useCallback(() => {
      trackEvent('call_new_viewed', {
        timestamp: new Date().toISOString(),
        priorityCount: callPriorities.length,
        typeCount: callTypes.length,
        hasGoogleMapsKey: !!config?.GoogleMapsKey,
        hasWhat3WordsKey: !!config?.W3WKey,
      });
    }, [trackEvent, callPriorities.length, callTypes.length, config?.GoogleMapsKey, config?.W3WKey])
  );

  const onSubmit = async (data: FormValues) => {
    try {
      // Analytics: Track call creation attempt
      trackEvent('call_create_attempted', {
        timestamp: new Date().toISOString(),
        priority: data.priority,
        type: data.type,
        hasNote: !!data.note,
        hasAddress: !!data.address,
        hasCoordinates: selectedLocation != null && Number.isFinite(selectedLocation.latitude) && Number.isFinite(selectedLocation.longitude),
        hasWhat3Words: !!data.what3words,
        hasPlusCode: !!data.plusCode,
        hasContactName: !!data.contactName,
        hasContactInfo: !!data.contactInfo,
        dispatchEveryone: data.dispatchSelection?.everyone || false,
        dispatchCount: (data.dispatchSelection?.users.length || 0) + (data.dispatchSelection?.groups.length || 0) + (data.dispatchSelection?.roles.length || 0) + (data.dispatchSelection?.units.length || 0),
      });

      // If we have latitude and longitude, add them to the data
      if (selectedLocation && Number.isFinite(selectedLocation.latitude) && Number.isFinite(selectedLocation.longitude)) {
        data.latitude = selectedLocation.latitude;
        data.longitude = selectedLocation.longitude;
      }

      // TODO: Implement the API call to create a new call
      console.log('Creating new call with data:', data);

      const priority = callPriorities.find((p) => p.Name === data.priority);
      const type = callTypes.find((t) => t.Name === data.type);

      const response = await createCall({
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
        dispatchUsers: data.dispatchSelection?.users || [],
        dispatchGroups: data.dispatchSelection?.groups || [],
        dispatchRoles: data.dispatchSelection?.roles || [],
        dispatchUnits: data.dispatchSelection?.units || [],
        dispatchEveryone: data.dispatchSelection?.everyone || false,
      });

      // Analytics: Track successful call creation
      trackEvent('call_create_success', {
        timestamp: new Date().toISOString(),
        callId: response?.Id || 'unknown',
        priority: data.priority,
        type: data.type,
        hasLocation: Number.isFinite(data.latitude) && Number.isFinite(data.longitude),
        dispatchMethod: data.dispatchSelection?.everyone ? 'everyone' : 'selective',
      });

      // Show success toast
      toast.success(t('calls.create_success'));

      // Navigate back to calls list
      router.push('/home/calls');
    } catch (error) {
      console.error('Error creating call:', error);

      // Analytics: Track call creation failure
      trackEvent('call_create_failed', {
        timestamp: new Date().toISOString(),
        priority: data.priority,
        type: data.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Show error toast
      toast.error(t('calls.create_error'));
    }
  };

  // Handle location selection from the full-screen picker
  const handleLocationSelected = (location: { latitude: number; longitude: number; address?: string }) => {
    // Analytics: Track location selection
    trackEvent('call_location_selected', {
      timestamp: new Date().toISOString(),
      hasAddress: !!location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    });

    setSelectedLocation(location);
    setShowLocationPicker(false);

    // Update form values
    setValue('latitude', location.latitude);
    setValue('longitude', location.longitude);

    if (location.address) {
      setValue('address', location.address);
    }

    // Format coordinates as string
    setValue('coordinates', `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
  };

  // Handle dispatch selection
  const handleDispatchSelection = (selection: DispatchSelection) => {
    // Analytics: Track dispatch selection
    trackEvent('call_dispatch_selection_updated', {
      timestamp: new Date().toISOString(),
      everyone: selection.everyone,
      userCount: selection.users.length,
      groupCount: selection.groups.length,
      roleCount: selection.roles.length,
      unitCount: selection.units.length,
      totalSelected: selection.users.length + selection.groups.length + selection.roles.length + selection.units.length,
    });

    setDispatchSelection(selection);
    setValue('dispatchSelection', selection);
  };

  // Get dispatch selection summary
  const getDispatchSummary = () => {
    if (dispatchSelection.everyone) {
      return t('calls.everyone');
    }

    const count = dispatchSelection.users.length + dispatchSelection.groups.length + dispatchSelection.roles.length + dispatchSelection.units.length;

    if (count === 0) {
      return t('calls.select_recipients');
    }

    return `${count} ${t('calls.selected')}`;
  };

  const handleAddressSearch = async (address: string) => {
    if (!address.trim()) {
      toast.warning(t('calls.address_required'));
      return;
    }

    // Analytics: Track address search attempt
    trackEvent('call_address_search_attempted', {
      timestamp: new Date().toISOString(),
      hasGoogleMapsKey: !!config?.GoogleMapsKey,
    });

    setIsGeocodingAddress(true);
    try {
      // Get Google Maps API key from CoreStore config
      const apiKey = config?.GoogleMapsKey;

      if (!apiKey) {
        // Analytics: Track configuration error
        trackEvent('call_address_search_failed', {
          timestamp: new Date().toISOString(),
          reason: 'missing_api_key',
        });

        throw new Error('Google Maps API key not configured');
      }

      // Make request to Google Maps Geocoding API
      const response = await axios.get<GeocodingResponse>(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`);

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const results = response.data.results;

        // Analytics: Track successful address search
        trackEvent('call_address_search_success', {
          timestamp: new Date().toISOString(),
          resultCount: results.length,
          hasMultipleResults: results.length > 1,
        });

        if (results.length === 1) {
          // Single result - use it directly
          const result = results[0];
          if (result) {
            const newLocation = {
              latitude: result.geometry.location.lat,
              longitude: result.geometry.location.lng,
              address: result.formatted_address,
            };

            // Update the selected location and form values
            handleLocationSelected(newLocation);

            // Show success toast
            toast.success(t('calls.address_found'));
          }
        } else {
          // Multiple results - show selection bottom sheet
          setAddressResults(results);
          setShowAddressSelection(true);
        }
      } else {
        // Analytics: Track no results found
        trackEvent('call_address_search_failed', {
          timestamp: new Date().toISOString(),
          reason: 'no_results',
          status: response.data.status,
        });

        // Show error toast for no results
        toast.error(t('calls.address_not_found'));
      }
    } catch (error) {
      console.error('Error geocoding address:', error);

      // Analytics: Track search error
      trackEvent('call_address_search_failed', {
        timestamp: new Date().toISOString(),
        reason: 'network_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Show error toast
      toast.error(t('calls.geocoding_error'));
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  // Handle address selection from bottom sheet
  const handleAddressSelected = (result: GeocodingResult) => {
    // Analytics: Track address selection from multiple results
    const roundedLat = Number(result.geometry.location.lat.toFixed(3));
    const roundedLng = Number(result.geometry.location.lng.toFixed(3));
    trackEvent('call_address_selected_from_results', {
      timestamp: new Date().toISOString(),
      hasAddress: !!result.formatted_address,
      addressLength: result.formatted_address.length,
      latitude: roundedLat,
      longitude: roundedLng,
    });

    const newLocation = {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      address: result.formatted_address,
    };

    // Update the selected location and form values
    handleLocationSelected(newLocation);
    setShowAddressSelection(false);

    // Show success toast
    toast.success(t('calls.address_found'));
  };

  const handleWhat3WordsSearch = async (what3words: string) => {
    if (!what3words.trim()) {
      toast.warning(t('calls.what3words_required'));
      return;
    }

    // Validate what3words format - should be 3 words separated by dots
    const w3wRegex = /^[a-z]+\.[a-z]+\.[a-z]+$/;
    if (!w3wRegex.test(what3words.trim().toLowerCase())) {
      // Analytics: Track format validation error
      trackEvent('call_what3words_search_failed', {
        timestamp: new Date().toISOString(),
        reason: 'invalid_format',
      });

      toast.warning(t('calls.what3words_invalid_format'));
      return;
    }

    // Analytics: Track what3words search attempt
    trackEvent('call_what3words_search_attempted', {
      timestamp: new Date().toISOString(),
      hasWhat3WordsKey: !!config?.W3WKey,
    });

    setIsGeocodingWhat3Words(true);
    try {
      // Get what3words API key from CoreStore config
      const apiKey = config?.W3WKey;

      if (!apiKey) {
        // Analytics: Track configuration error
        trackEvent('call_what3words_search_failed', {
          timestamp: new Date().toISOString(),
          reason: 'missing_api_key',
        });

        throw new Error('what3words API key not configured');
      }

      // Make request to what3words API
      const response = await axios.get<What3WordsResponse>(`https://api.what3words.com/v3/convert-to-coordinates?words=${encodeURIComponent(what3words)}&key=${apiKey}`);

      if (response.data.coordinates) {
        // Analytics: Track successful what3words search
        trackEvent('call_what3words_search_success', {
          timestamp: new Date().toISOString(),
        });

        const newLocation = {
          latitude: response.data.coordinates.lat,
          longitude: response.data.coordinates.lng,
          address: response.data.nearestPlace,
        };

        // Update the selected location and form values
        handleLocationSelected(newLocation);

        // Show success toast
        toast.success(t('calls.what3words_found'));
      } else {
        // Analytics: Track no results found
        trackEvent('call_what3words_search_failed', {
          timestamp: new Date().toISOString(),
          reason: 'no_results',
        });

        // Show error toast for no results
        toast.error(t('calls.what3words_not_found'));
      }
    } catch (error) {
      console.error('Error geocoding what3words:', error);

      // Analytics: Track search error
      trackEvent('call_what3words_search_failed', {
        timestamp: new Date().toISOString(),
        reason: 'network_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Show error toast
      toast.error(t('calls.what3words_geocoding_error'));
    } finally {
      setIsGeocodingWhat3Words(false);
    }
  };

  const handlePlusCodeSearch = async (plusCode: string) => {
    if (!plusCode.trim()) {
      toast.warning(t('calls.plus_code_required'));
      return;
    }

    // Analytics: Track plus code search attempt
    trackEvent('call_plus_code_search_attempted', {
      timestamp: new Date().toISOString(),
      hasGoogleMapsKey: !!config?.GoogleMapsKey,
    });

    setIsGeocodingPlusCode(true);
    try {
      // Get Google Maps API key from CoreStore config
      const apiKey = config?.GoogleMapsKey;

      if (!apiKey) {
        // Analytics: Track configuration error
        trackEvent('call_plus_code_search_failed', {
          timestamp: new Date().toISOString(),
          reason: 'missing_api_key',
        });

        throw new Error('Google Maps API key not configured');
      }

      // Make request to Google Maps Geocoding API with plus code
      const response = await axios.get<GeocodingResponse>(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(plusCode)}&key=${apiKey}`);

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        // Analytics: Track successful plus code search
        trackEvent('call_plus_code_search_success', {
          timestamp: new Date().toISOString(),
        });

        const result = response.data.results[0];
        if (result) {
          const newLocation = {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            address: result.formatted_address,
          };

          // Update the selected location and form values
          handleLocationSelected(newLocation);

          // Show success toast
          toast.success(t('calls.plus_code_found'));
        }
      } else {
        // Analytics: Track no results found
        trackEvent('call_plus_code_search_failed', {
          timestamp: new Date().toISOString(),
          reason: 'no_results',
          status: response.data.status,
        });

        // Show error toast for no results
        toast.error(t('calls.plus_code_not_found'));
      }
    } catch (error) {
      console.error('Error geocoding plus code:', error);

      // Analytics: Track search error
      trackEvent('call_plus_code_search_failed', {
        timestamp: new Date().toISOString(),
        reason: 'network_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Show error toast
      toast.error(t('calls.plus_code_geocoding_error'));
    } finally {
      setIsGeocodingPlusCode(false);
    }
  };

  const handleCoordinatesSearch = async (coordinates: string) => {
    if (!coordinates.trim()) {
      toast.warning(t('calls.coordinates_required'));
      return;
    }

    // Parse coordinates - expect format like "40.7128, -74.0060" or "40.7128,-74.0060"
    const coordRegex = /^(-?\d+\.?\d*),?\s*(-?\d+\.?\d*)$/;
    const match = coordinates.trim().match(coordRegex);

    if (!match) {
      // Analytics: Track format validation error
      trackEvent('call_coordinates_search_failed', {
        timestamp: new Date().toISOString(),
        reason: 'invalid_format',
      });

      toast.warning(t('calls.coordinates_invalid_format'));
      return;
    }

    const latitude = parseFloat(match[1] || '0');
    const longitude = parseFloat(match[2] || '0');

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      // Analytics: Track range validation error
      trackEvent('call_coordinates_search_failed', {
        timestamp: new Date().toISOString(),
        reason: 'out_of_range',
        latitude,
        longitude,
      });

      toast.warning(t('calls.coordinates_out_of_range'));
      return;
    }

    // Analytics: Track coordinates search attempt
    trackEvent('call_coordinates_search_attempted', {
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      hasGoogleMapsKey: !!config?.GoogleMapsKey,
    });

    setIsGeocodingCoordinates(true);
    try {
      // Get Google Maps API key from CoreStore config
      const apiKey = config?.GoogleMapsKey;

      if (!apiKey) {
        // Analytics: Track configuration error
        trackEvent('call_coordinates_search_failed', {
          timestamp: new Date().toISOString(),
          reason: 'missing_api_key',
          latitude,
          longitude,
        });

        throw new Error('Google Maps API key not configured');
      }

      // Make request to Google Maps Reverse Geocoding API
      const response = await axios.get<GeocodingResponse>(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        // Analytics: Track successful coordinates search with address
        trackEvent('call_coordinates_search_success', {
          timestamp: new Date().toISOString(),
          latitude,
          longitude,
          hasAddress: true,
        });

        const result = response.data.results[0];
        if (result) {
          const newLocation = {
            latitude,
            longitude,
            address: result.formatted_address,
          };

          // Update the selected location and form values
          handleLocationSelected(newLocation);
        }

        // Show success toast
        toast.success(t('calls.coordinates_found'));
      } else {
        // Analytics: Track coordinates set without address
        trackEvent('call_coordinates_search_success', {
          timestamp: new Date().toISOString(),
          latitude,
          longitude,
          hasAddress: false,
        });

        // Even if no address found, still set the location on the map
        const newLocation = {
          latitude,
          longitude,
        };

        handleLocationSelected(newLocation);

        // Show info toast
        toast.info(t('calls.coordinates_no_address'));
      }
    } catch (error) {
      console.error('Error reverse geocoding coordinates:', error);

      // Analytics: Track search error but still set location
      trackEvent('call_coordinates_search_failed', {
        timestamp: new Date().toISOString(),
        reason: 'network_error',
        latitude,
        longitude,
        error: sanitizeErrorString(error),
        locationStillSet: true,
      });

      // Even if geocoding fails, still set the location on the map
      const newLocation = {
        latitude,
        longitude,
      };

      handleLocationSelected(newLocation);

      // Show warning toast
      toast.warning(t('calls.coordinates_geocoding_error'));
    } finally {
      setIsGeocodingCoordinates(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <View className="size-full flex-1">
        <Box className="m-3 mt-5 min-h-[200px] w-full max-w-[600px] gap-5 self-center rounded-lg bg-background-50 p-5 lg:min-w-[700px]">
          <Text className="error text-center">{error}</Text>
        </Box>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('calls.new_call'),
          headerShown: true,
        }}
      />
      <View className="size-full flex-1">
        <Box className={`size-full w-full flex-1 ${colorScheme === 'dark' ? 'bg-neutral-950' : 'bg-neutral-50'}`}>
          <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 40) }} showsVerticalScrollIndicator={false}>
            <Text className="mb-6 text-2xl font-bold">{t('calls.create_new_call')}</Text>

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
                      <InputField testID="name-input" placeholder={t('calls.name_placeholder')} value={value} onChangeText={onChange} onBlur={onBlur} />
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
                      <TextareaInput testID="nature-input" value={value} onChangeText={onChange} onBlur={onBlur} numberOfLines={4} placeholder={t('calls.nature_placeholder')} />
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
              <FormControl isInvalid={!!errors.priority}>
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.priority')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field: { onChange, value } }) => (
                    <Select onValueChange={onChange} selectedValue={value}>
                      <SelectTrigger>
                        <SelectInput placeholder={t('calls.select_priority')} className="w-5/6" />
                        <SelectIcon as={ChevronDownIcon} className="mr-3" />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                          {callPriorities.map((priority) => (
                            <SelectItem key={priority.Id} label={priority.Name} value={priority.Name} />
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  )}
                />
                {errors.priority && (
                  <FormControlError>
                    <Text className="text-red-500">{errors.priority.message}</Text>
                  </FormControlError>
                )}
              </FormControl>
            </Card>

            <Card className={`mb-8 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
              <FormControl isInvalid={!!errors.type}>
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.type')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="type"
                  render={({ field: { onChange, value } }) => (
                    <Select onValueChange={onChange} selectedValue={value}>
                      <SelectTrigger>
                        <SelectInput placeholder={t('calls.select_type')} className="w-5/6" />
                        <SelectIcon as={ChevronDownIcon} className="mr-3" />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                          {callTypes.map((type) => (
                            <SelectItem key={type.Id} label={type.Name} value={type.Name} />
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  )}
                />
                {errors.type && (
                  <FormControlError>
                    <Text className="text-red-500">{errors.type.message}</Text>
                  </FormControlError>
                )}
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

              {/* GPS Coordinates Field */}
              <FormControl className="mb-4">
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.coordinates')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="coordinates"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Box className="flex-row items-center space-x-2">
                      <Box className="flex-1">
                        <Input>
                          <InputField testID="coordinates-input" placeholder={t('calls.coordinates_placeholder')} value={value} onChangeText={onChange} onBlur={onBlur} />
                        </Input>
                      </Box>
                      <Button testID="coordinates-search-button" size="sm" variant="outline" className="ml-2" onPress={() => handleCoordinatesSearch(value || '')} disabled={isGeocodingCoordinates || !value?.trim()}>
                        {isGeocodingCoordinates ? <Text>...</Text> : <SearchIcon size={16} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />}
                      </Button>
                    </Box>
                  )}
                />
              </FormControl>

              {/* what3words Field */}
              <FormControl className="mb-4">
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.what3words')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="what3words"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Box className="flex-row items-center space-x-2">
                      <Box className="flex-1">
                        <Input>
                          <InputField testID="what3words-input" placeholder={t('calls.what3words_placeholder')} value={value} onChangeText={onChange} onBlur={onBlur} />
                        </Input>
                      </Box>
                      <Button testID="what3words-search-button" size="sm" variant="outline" className="ml-2" onPress={() => handleWhat3WordsSearch(value || '')} disabled={isGeocodingWhat3Words || !value?.trim()}>
                        {isGeocodingWhat3Words ? <Text>...</Text> : <SearchIcon size={16} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />}
                      </Button>
                    </Box>
                  )}
                />
              </FormControl>

              {/* Plus Code Field */}
              <FormControl className="mb-4">
                <FormControlLabel>
                  <FormControlLabelText>{t('calls.plus_code')}</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="plusCode"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Box className="flex-row items-center space-x-2">
                      <Box className="flex-1">
                        <Input>
                          <InputField testID="plus-code-input" placeholder={t('calls.plus_code_placeholder')} value={value} onChangeText={onChange} onBlur={onBlur} />
                        </Input>
                      </Box>
                      <Button testID="plus-code-search-button" size="sm" variant="outline" className="ml-2" onPress={() => handlePlusCodeSearch(value || '')} disabled={isGeocodingPlusCode || !value?.trim()}>
                        {isGeocodingPlusCode ? <Text>...</Text> : <SearchIcon size={16} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />}
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
                  <Button testID="open-location-picker-button" onPress={() => setShowLocationPicker(true)} className="w-full">
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
              <Button testID="open-dispatch-modal-button" onPress={() => setShowDispatchModal(true)} className="w-full">
                <ButtonText>{getDispatchSummary()}</ButtonText>
              </Button>
            </Card>

            <Box className="mb-6 flex-row space-x-4" style={{ marginBottom: Platform.OS === 'android' ? Math.max(insets.bottom + 20, 30) : 24 }}>
              <Button className="mr-10 flex-1" variant="outline" onPress={() => router.back()}>
                <ButtonText>{t('common.cancel')}</ButtonText>
              </Button>
              <Button testID="create-call-button" className="ml-10 flex-1" variant="solid" action="primary" onPress={handleSubmit(onSubmit)}>
                <PlusIcon size={18} className="mr-2" />
                <ButtonText>{t('calls.create')}</ButtonText>
              </Button>
            </Box>
          </ScrollView>
        </Box>
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
            paddingBottom: Platform.OS === 'android' ? insets.bottom : 0,
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
