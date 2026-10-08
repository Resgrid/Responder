import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { router, Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as z from 'zod';

import { createCall } from '@/api/calls/calls';
import { getNewCallData } from '@/api/dispatch';
import { DispatchSelectionModal } from '@/components/calls/dispatch-selection-modal';
import { DateTimeField } from '@/components/common/date-time-field';
import { HeaderBackButton } from '@/components/common/header-back-button';
import { Loading } from '@/components/common/loading';
import FullScreenLocationPicker from '@/components/maps/full-screen-location-picker';
import LocationPicker from '@/components/maps/location-picker';
import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Box } from '@/components/ui/box';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormControl, FormControlError, FormControlLabel, FormControlLabelText } from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';
import { ChevronDownIcon, PlusIcon, SearchIcon } from '@/components/ui/lucide-icons';
import { Select, SelectBackdrop, SelectContent, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { useNewCallFieldPolicy } from '@/hooks/use-new-call-field-policy';
import { useToast } from '@/hooks/use-toast';
import {
  CALL_FORM_UNCOLLECTED_FIELD_KEYS,
  formatCallFieldLabels,
  formatCallGeolocation,
  getMissingCallFieldsFromError,
  isScheduledDispatchTooSoon,
  MIN_SCHEDULED_DISPATCH_LEAD_MINUTES,
  toDispatchOnUtc,
} from '@/lib/call-field-policy';
import { logger } from '@/lib/logging';
import { getDestinationPoiIdFromValue, getDestinationPoiSelectOptions, NO_DESTINATION_POI_VALUE } from '@/lib/poi';
import { NewCallFieldKeys } from '@/models/v4/calls/newCallFieldPolicyResultData';
import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { type PoiTypeResultData } from '@/models/v4/mapping/poiTypeResultData';
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
  destinationPoiId: z.string().optional(),
  contactName: z.string().optional(),
  contactInfo: z.string().optional(),
  externalId: z.string().optional(),
  incidentId: z.string().optional(),
  referenceId: z.string().optional(),
  // Scheduled dispatch time as an ISO 8601 UTC string; '' for "dispatch now" / "leave the schedule alone".
  dispatchOn: z.string().optional(),
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
  // Per-field selectors: subscribing to the whole store re-rendered this form on every unrelated
  // calls-store write (background list refreshes, SignalR updates) while it was being filled in.
  const callPriorities = useCallsStore((state) => state.callPriorities);
  const callTypes = useCallsStore((state) => state.callTypes);
  const isLoading = useCallsStore((state) => state.isLoading);
  const error = useCallsStore((state) => state.error);
  const fetchCallPriorities = useCallsStore((state) => state.fetchCallPriorities);
  const fetchCallTypes = useCallsStore((state) => state.fetchCallTypes);
  const config = useCoreStore((state) => state.config);
  const { trackEvent } = useAnalytics();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const insets = useSafeAreaInsets();
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showAddressSelection, setShowAddressSelection] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [isGeocodingPlusCode, setIsGeocodingPlusCode] = useState(false);
  const [isGeocodingCoordinates, setIsGeocodingCoordinates] = useState(false);
  const [isGeocodingWhat3Words, setIsGeocodingWhat3Words] = useState(false);
  const [isDestinationPoisLoading, setIsDestinationPoisLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Mirrors isSubmitting so a second tap is rejected synchronously, before React has re-rendered
  // the disabled button. Without it a double-tap creates and dispatches two identical calls.
  const isSubmittingRef = useRef(false);
  const [addressResults, setAddressResults] = useState<GeocodingResult[]>([]);
  const [destinationPois, setDestinationPois] = useState<PoiResultData[]>([]);
  const [destinationPoiTypes, setDestinationPoiTypes] = useState<PoiTypeResultData[]>([]);
  const [dispatchSelection, setDispatchSelection] = useState<DispatchSelection>({
    everyone: false,
    users: [],
    groups: [],
    roles: [],
    units: [],
  });

  // The department's new-call field policy: hides fields it does not use and blocks submission
  // until the ones it marked required have values. Unconfigured departments see the stock form.
  const fieldPolicy = useNewCallFieldPolicy();
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
      destinationPoiId: NO_DESTINATION_POI_VALUE,
      contactName: '',
      contactInfo: '',
      externalId: '',
      incidentId: '',
      referenceId: '',
      dispatchOn: '',
      dispatchSelection: {
        everyone: false,
        users: [],
        groups: [],
        roles: [],
        units: [],
      },
    },
  });

  const destinationPoiOptions = useMemo(() => getDestinationPoiSelectOptions(destinationPois, destinationPoiTypes), [destinationPois, destinationPoiTypes]);

  useEffect(() => {
    fetchCallPriorities();
    fetchCallTypes();
  }, [fetchCallPriorities, fetchCallTypes]);

  useEffect(() => {
    const abortController = new AbortController();

    const loadDestinationPois = async () => {
      setIsDestinationPoisLoading(true);

      try {
        const response = await getNewCallData(abortController.signal);

        if (abortController.signal.aborted) {
          return;
        }

        setDestinationPois(response.Data?.DestinationPois || []);
        setDestinationPoiTypes(response.Data?.PoiTypes || []);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        logger.error({ message: 'Error loading call destination POIs', context: { error } });
        toastRef.current.error(t('calls.destination_load_error'));
      } finally {
        if (!abortController.signal.aborted) {
          setIsDestinationPoisLoading(false);
        }
      }
    };

    void loadDestinationPois();

    return () => {
      abortController.abort();
    };
  }, [t]);

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
    // Creating a call dispatches it to the whole department, so a duplicate is not recoverable
    // by the dispatcher. Reject re-entry outright rather than relying on the disabled button.
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // The policy arrives asynchronously and reads as "nothing required" until it lands, so a
      // submit in that window would skip every field the department marked required. Hold the call
      // back instead. Fail-open only applies once the lookup has finished one way or the other.
      if (!fieldPolicy.isLoaded) {
        toast.error(t('calls.field_policy_loading'));
        return;
      }

      // Resolve the destination before validating it: the picker's "no destination" choice is the
      // non-empty sentinel string, so the raw form value would satisfy a required-destination rule
      // even though the call has no destination. Stringified because presence is the question here,
      // and a numeric id would collide with the "0 counts as empty" rule for numbers.
      const destinationPoiId = getDestinationPoiIdFromValue(data.destinationPoiId);

      // The department may require fields beyond the built-in mandatory four. Enforced here for a
      // clear message, and again on the server so an old build cannot slip an incomplete call past.
      // Only the fields this screen has an input for are checked (see
      // CALL_FORM_UNCOLLECTED_FIELD_KEYS). This app has no pending save, so a required dispatch time is
      // always enforced, as the server does.
      const missingFields = fieldPolicy
        .missingRequired({
          [NewCallFieldKeys.Address]: data.address,
          // The same rule the server applies: a single zero coordinate is a place, 0,0 is not.
          [NewCallFieldKeys.Geolocation]: formatCallGeolocation(data.latitude, data.longitude),
          [NewCallFieldKeys.What3Words]: data.what3words,
          [NewCallFieldKeys.PlusCode]: data.plusCode,
          [NewCallFieldKeys.Note]: data.note,
          [NewCallFieldKeys.ContactName]: data.contactName,
          [NewCallFieldKeys.ContactInfo]: data.contactInfo,
          [NewCallFieldKeys.ExternalId]: data.externalId,
          [NewCallFieldKeys.IncidentId]: data.incidentId,
          [NewCallFieldKeys.ReferenceId]: data.referenceId,
          [NewCallFieldKeys.DispatchOn]: data.dispatchOn,
          [NewCallFieldKeys.DestinationPoi]: destinationPoiId != null ? String(destinationPoiId) : '',
          [NewCallFieldKeys.DispatchList]:
            dispatchSelection.everyone || dispatchSelection.units.length > 0 || dispatchSelection.users.length > 0 || dispatchSelection.groups.length > 0 || dispatchSelection.roles.length > 0,
        })
        .filter((key) => !CALL_FORM_UNCOLLECTED_FIELD_KEYS.has(key));

      if (missingFields.length > 0) {
        toast.error(t('calls.required_fields_missing', { fields: formatCallFieldLabels(missingFields, t) }));
        return;
      }

      // A scheduled dispatch has to leave time to change the call before it goes out -- the web form's
      // rule. A hidden input sends nothing, so the call goes out now.
      const scheduleDispatch = fieldPolicy.isVisible(NewCallFieldKeys.DispatchOn) && !!data.dispatchOn;

      if (scheduleDispatch && isScheduledDispatchTooSoon(data.dispatchOn ?? '')) {
        toast.error(t('calls.dispatch_on_too_soon', { minutes: MIN_SCHEDULED_DISPATCH_LEAD_MINUTES }));
        return;
      }

      const dispatchOnUtc = scheduleDispatch ? toDispatchOnUtc(data.dispatchOn) : undefined;

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
        hasDestinationPoi: destinationPoiId != null,
        dispatchEveryone: data.dispatchSelection?.everyone || false,
        dispatchCount: (data.dispatchSelection?.users.length || 0) + (data.dispatchSelection?.groups.length || 0) + (data.dispatchSelection?.roles.length || 0) + (data.dispatchSelection?.units.length || 0),
      });

      // If we have latitude and longitude, add them to the data
      if (selectedLocation && Number.isFinite(selectedLocation.latitude) && Number.isFinite(selectedLocation.longitude)) {
        data.latitude = selectedLocation.latitude;
        data.longitude = selectedLocation.longitude;
      }

      const priority = callPriorities.find((p) => p.Name === data.priority);
      const type = callTypes.find((t) => t.Name === data.type);

      const response = await createCall({
        name: data.name,
        nature: data.nature,
        priority: priority?.Id || 0,
        // The API matches the call type by its text, not its id.
        type: type?.Name || '',
        note: data.note || '',
        address: data.address || '',
        destinationPoiId: destinationPoiId,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        what3words: data.what3words || '',
        plusCode: data.plusCode || '',
        // Collected on this form (and checked against the policy above) but previously never sent, so
        // a department requiring them saw every call refused by the server.
        contactName: data.contactName || '',
        contactInfo: data.contactInfo || '',
        externalId: data.externalId || '',
        incidentId: data.incidentId || '',
        referenceId: data.referenceId || '',
        ...(dispatchOnUtc ? { dispatchOnUtc } : {}),
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
        hasDestinationPoi: destinationPoiId != null,
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

      // The server enforces the department's field policy too, including fields this form has no
      // input for (the dispatch time). Name them rather than showing a generic failure.
      const rejectedFields = getMissingCallFieldsFromError(error);

      if (rejectedFields) {
        toast.error(t('calls.required_fields_missing', { fields: formatCallFieldLabels(rejectedFields, t) }));
      } else {
        toast.error(t('calls.create_error'));
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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

  // The calls store's isLoading/error are shared with the background call-list fetches that run on
  // app resume and active-call selection. Gate only on what this form actually needs, so a
  // background refetch (or a failure in one) can never replace a half-filled form.
  const isMissingFormData = callPriorities.length === 0;

  if (isLoading && isMissingFormData) {
    return <Loading />;
  }

  if (error && isMissingFormData) {
    return (
      <View className="size-full flex-1">
        <Box className="m-3 mt-5 min-h-[200px] w-full max-w-[600px] gap-5 self-center rounded-lg bg-background-50 p-5 lg:min-w-[700px]">
          <Text className="error text-center">{error}</Text>
        </Box>
      </View>
    );
  }

  // Every rule the department can set drives its own control. The location card groups four of them,
  // so it only disappears once the policy has hidden all four. The map fills in the geolocation, so it
  // follows that rule.
  const showAddress = fieldPolicy.isVisible(NewCallFieldKeys.Address);
  const showGeolocation = fieldPolicy.isVisible(NewCallFieldKeys.Geolocation);
  const showWhat3Words = fieldPolicy.isVisible(NewCallFieldKeys.What3Words);
  const showPlusCode = fieldPolicy.isVisible(NewCallFieldKeys.PlusCode);
  const showLocationCard = showAddress || showGeolocation || showWhat3Words || showPlusCode;

  return (
    <>
      <Stack.Screen
        options={{
          title: t('calls.new_call'),
          headerShown: true,
          headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
        }}
      />
      <View className="size-full flex-1">
        <Box className="size-full w-full flex-1 bg-gray-50 dark:bg-gray-900">
          <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 40) }} showsVerticalScrollIndicator={false}>
            <Text className="mb-6 text-2xl font-bold">{t('calls.create_new_call')}</Text>

            <Card className="mb-4 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
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
                {errors.name ? (
                  <FormControlError>
                    <Text className="text-red-500">{errors.name.message}</Text>
                  </FormControlError>
                ) : null}
              </FormControl>
            </Card>

            <Card className="mb-4 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
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
                {errors.nature ? (
                  <FormControlError>
                    <Text className="text-red-500">{errors.nature.message}</Text>
                  </FormControlError>
                ) : null}
              </FormControl>
            </Card>

            <Card className="mb-4 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
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
                        <SelectContent className="max-h-[60vh] pb-20">
                          {callPriorities.map((priority) => (
                            <SelectItem key={priority.Id} label={priority.Name} value={priority.Name} />
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  )}
                />
                {errors.priority ? (
                  <FormControlError>
                    <Text className="text-red-500">{errors.priority.message}</Text>
                  </FormControlError>
                ) : null}
              </FormControl>
            </Card>

            <Card className="mb-4 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
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
                        <SelectContent className="max-h-[60vh] pb-20">
                          {callTypes.map((type) => (
                            <SelectItem key={type.Id} label={type.Name} value={type.Name} />
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  )}
                />
                {errors.type ? (
                  <FormControlError>
                    <Text className="text-red-500">{errors.type.message}</Text>
                  </FormControlError>
                ) : null}
              </FormControl>
            </Card>

            {fieldPolicy.isVisible(NewCallFieldKeys.DestinationPoi) ? (
              <Card className="mb-4 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
                <FormControl testID="destination-field" isRequired={fieldPolicy.isRequired(NewCallFieldKeys.DestinationPoi)}>
                  <FormControlLabel>
                    <FormControlLabelText>{t('calls.destination')}</FormControlLabelText>
                  </FormControlLabel>
                  <Controller
                    control={control}
                    name="destinationPoiId"
                    render={({ field: { onChange, value } }) => {
                      const selectedDestinationLabel = value === NO_DESTINATION_POI_VALUE ? t('common.none') : destinationPoiOptions.find((option) => option.value === value)?.label;

                      return (
                        <Select isDisabled={isDestinationPoisLoading} onValueChange={onChange} selectedValue={value}>
                          <SelectTrigger>
                            <SelectInput placeholder={isDestinationPoisLoading ? t('common.loading') : t('calls.destination_placeholder')} value={selectedDestinationLabel} className="w-5/6" />
                            <SelectIcon as={ChevronDownIcon} className="mr-3" />
                          </SelectTrigger>
                          <SelectPortal>
                            <SelectBackdrop />
                            <SelectContent className="max-h-[60vh] pb-20">
                              <SelectItem label={t('common.none')} value={NO_DESTINATION_POI_VALUE} />
                              {destinationPoiOptions.map((option) => (
                                <SelectItem key={option.value} label={option.label} value={option.value} />
                              ))}
                            </SelectContent>
                          </SelectPortal>
                        </Select>
                      );
                    }}
                  />
                </FormControl>
              </Card>
            ) : null}

            {fieldPolicy.isVisible(NewCallFieldKeys.Note) ? (
              <Card className="mb-4 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
                <FormControl testID="note-field" isRequired={fieldPolicy.isRequired(NewCallFieldKeys.Note)}>
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
            ) : null}

            {showLocationCard ? (
              <Card className="mb-4 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
                <Text className="mb-4 text-lg font-semibold">{t('calls.call_location')}</Text>

                {/* Address Field */}
                {showAddress ? (
                  <FormControl className="mb-4" testID="address-field" isRequired={fieldPolicy.isRequired(NewCallFieldKeys.Address)}>
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
                          <Button
                            testID="address-search-button"
                            accessibilityRole="button"
                            accessibilityLabel={t('calls.search_address')}
                            size="sm"
                            variant="outline"
                            className="ml-2"
                            onPress={() => handleAddressSearch(value || '')}
                            disabled={isGeocodingAddress || !value?.trim()}
                          >
                            {isGeocodingAddress ? <Text>...</Text> : <SearchIcon size={16} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />}
                          </Button>
                        </Box>
                      )}
                    />
                  </FormControl>
                ) : null}

                {/* GPS Coordinates Field */}
                {showGeolocation ? (
                  <FormControl className="mb-4" testID="coordinates-field" isRequired={fieldPolicy.isRequired(NewCallFieldKeys.Geolocation)}>
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
                          <Button
                            testID="coordinates-search-button"
                            accessibilityRole="button"
                            accessibilityLabel={t('calls.search_coordinates')}
                            size="sm"
                            variant="outline"
                            className="ml-2"
                            onPress={() => handleCoordinatesSearch(value || '')}
                            disabled={isGeocodingCoordinates || !value?.trim()}
                          >
                            {isGeocodingCoordinates ? <Text>...</Text> : <SearchIcon size={16} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />}
                          </Button>
                        </Box>
                      )}
                    />
                  </FormControl>
                ) : null}

                {/* what3words Field */}
                {showWhat3Words ? (
                  <FormControl className="mb-4" testID="what3words-field" isRequired={fieldPolicy.isRequired(NewCallFieldKeys.What3Words)}>
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
                          <Button
                            testID="what3words-search-button"
                            accessibilityRole="button"
                            accessibilityLabel={t('calls.search_what3words')}
                            size="sm"
                            variant="outline"
                            className="ml-2"
                            onPress={() => handleWhat3WordsSearch(value || '')}
                            disabled={isGeocodingWhat3Words || !value?.trim()}
                          >
                            {isGeocodingWhat3Words ? <Text>...</Text> : <SearchIcon size={16} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />}
                          </Button>
                        </Box>
                      )}
                    />
                  </FormControl>
                ) : null}

                {/* Plus Code Field */}
                {showPlusCode ? (
                  <FormControl className="mb-4" testID="plus-code-field" isRequired={fieldPolicy.isRequired(NewCallFieldKeys.PlusCode)}>
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
                          <Button
                            testID="plus-code-search-button"
                            accessibilityRole="button"
                            accessibilityLabel={t('calls.search_plus_code')}
                            size="sm"
                            variant="outline"
                            className="ml-2"
                            onPress={() => handlePlusCodeSearch(value || '')}
                            disabled={isGeocodingPlusCode || !value?.trim()}
                          >
                            {isGeocodingPlusCode ? <Text>...</Text> : <SearchIcon size={16} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />}
                          </Button>
                        </Box>
                      )}
                    />
                  </FormControl>
                ) : null}

                {/* Map Preview: the map is how the geolocation gets filled in, so it follows that rule. */}
                {showGeolocation ? (
                  <Box className="mb-4">
                    {selectedLocation ? (
                      <LocationPicker initialLocation={selectedLocation} onLocationSelected={handleLocationSelected} height={200} />
                    ) : (
                      <Button testID="open-location-picker-button" onPress={() => setShowLocationPicker(true)} className="w-full">
                        <ButtonText>{t('calls.select_location')}</ButtonText>
                      </Button>
                    )}
                  </Box>
                ) : null}
              </Card>
            ) : null}

            {fieldPolicy.isVisible(NewCallFieldKeys.ContactName) ? (
              <Card className="mb-4 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
                <FormControl testID="contact-name-field" isRequired={fieldPolicy.isRequired(NewCallFieldKeys.ContactName)}>
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
            ) : null}

            {fieldPolicy.isVisible(NewCallFieldKeys.ContactInfo) ? (
              <Card className="mb-4 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
                <FormControl testID="contact-info-field" isRequired={fieldPolicy.isRequired(NewCallFieldKeys.ContactInfo)}>
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
            ) : null}

            {/* Call identifiers: one card for the three, shown while any of them is. */}
            {fieldPolicy.isVisible(NewCallFieldKeys.ExternalId) || fieldPolicy.isVisible(NewCallFieldKeys.IncidentId) || fieldPolicy.isVisible(NewCallFieldKeys.ReferenceId) ? (
              <Card testID="call-identifiers-card" className="mb-4 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
                {fieldPolicy.isVisible(NewCallFieldKeys.ExternalId) ? (
                  <FormControl className="mb-4" testID="external-id-field" isRequired={fieldPolicy.isRequired(NewCallFieldKeys.ExternalId)}>
                    <FormControlLabel>
                      <FormControlLabelText>{t('calls.external_id')}</FormControlLabelText>
                    </FormControlLabel>
                    <Controller
                      control={control}
                      name="externalId"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input>
                          <InputField testID="external-id-input" value={value} onChangeText={onChange} onBlur={onBlur} />
                        </Input>
                      )}
                    />
                  </FormControl>
                ) : null}
                {fieldPolicy.isVisible(NewCallFieldKeys.IncidentId) ? (
                  <FormControl className="mb-4" testID="incident-id-field" isRequired={fieldPolicy.isRequired(NewCallFieldKeys.IncidentId)}>
                    <FormControlLabel>
                      <FormControlLabelText>{t('calls.incident_id')}</FormControlLabelText>
                    </FormControlLabel>
                    <Controller
                      control={control}
                      name="incidentId"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input>
                          <InputField testID="incident-id-input" value={value} onChangeText={onChange} onBlur={onBlur} />
                        </Input>
                      )}
                    />
                  </FormControl>
                ) : null}
                {fieldPolicy.isVisible(NewCallFieldKeys.ReferenceId) ? (
                  <FormControl testID="reference-id-field" isRequired={fieldPolicy.isRequired(NewCallFieldKeys.ReferenceId)}>
                    <FormControlLabel>
                      <FormControlLabelText>{t('calls.reference_id')}</FormControlLabelText>
                    </FormControlLabel>
                    <Controller
                      control={control}
                      name="referenceId"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input>
                          <InputField testID="reference-id-input" value={value} onChangeText={onChange} onBlur={onBlur} />
                        </Input>
                      )}
                    />
                  </FormControl>
                ) : null}
              </Card>
            ) : null}

            {fieldPolicy.isVisible(NewCallFieldKeys.DispatchOn) ? (
              <Card className="mb-4 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
                <FormControl testID="dispatch-on-field" isRequired={fieldPolicy.isRequired(NewCallFieldKeys.DispatchOn)}>
                  <FormControlLabel>
                    <FormControlLabelText>{t('calls.dispatch_on')}</FormControlLabelText>
                  </FormControlLabel>
                  <Controller
                    control={control}
                    name="dispatchOn"
                    render={({ field: { onChange, value } }) => <DateTimeField mode="datetime" value={value ?? ''} onChange={onChange} label={t('calls.dispatch_on')} testID="dispatch-on-input" />}
                  />
                </FormControl>
              </Card>
            ) : null}

            {fieldPolicy.isVisible(NewCallFieldKeys.DispatchList) ? (
              <Card className="mb-4 rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
                <Text testID="dispatch-to-label" className="mb-4 text-lg font-semibold">
                  {t('calls.dispatch_to')}
                  {fieldPolicy.isRequired(NewCallFieldKeys.DispatchList) ? ' *' : null}
                </Text>
                <Button testID="open-dispatch-modal-button" onPress={() => setShowDispatchModal(true)} className="w-full">
                  <ButtonText>{getDispatchSummary()}</ButtonText>
                </Button>
              </Card>
            ) : null}

            <Box className="mb-6 flex-row space-x-4" style={{ marginBottom: Platform.OS === 'android' ? Math.max(insets.bottom + 20, 30) : 24 }}>
              <Button className="mr-10 flex-1" variant="outline" onPress={() => router.back()}>
                <ButtonText>{t('common.cancel')}</ButtonText>
              </Button>
              <Button testID="create-call-button" className="ml-10 flex-1" variant="solid" action="primary" isDisabled={!fieldPolicy.isLoaded || isSubmitting} onPress={handleSubmit(onSubmit)}>
                {isSubmitting ? <ButtonSpinner className="mr-2" /> : <PlusIcon size={18} className="mr-2" />}
                <ButtonText>{isSubmitting ? t('common.submitting') : t('calls.create')}</ButtonText>
              </Button>
            </Box>
          </ScrollView>
        </Box>
      </View>

      {/* Full-screen location picker overlay */}
      {showLocationPicker ? (
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
      ) : null}

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
