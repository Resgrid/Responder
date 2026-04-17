import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { PlusIcon, RefreshCcwDotIcon, Search, User, UserCheck, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { CallCard } from '@/components/calls/call-card';
import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { Box } from '@/components/ui/box';
import { Fab, FabIcon } from '@/components/ui/fab';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { RefreshControl } from '@/components/ui/refresh-control';
import { useAnalytics } from '@/hooks/use-analytics';
import { buildCallAssignmentContext, isCurrentUserOnCall } from '@/lib/call-dispatch';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { useCoreStore } from '@/stores/app/core-store';
import { useCallsStore } from '@/stores/calls/store';
import { useHomeStore } from '@/stores/home/home-store';
import { useRolesStore } from '@/stores/roles/store';
import { useSecurityStore } from '@/stores/security/store';

export default function Calls() {
  const { calls, isLoading, error, fetchCalls, fetchCallPriorities, callPriorities, callExtrasById } = useCallsStore();
  const { canUserCreateCalls } = useSecurityStore();
  const { trackEvent } = useAnalytics();
  const { t } = useTranslation();
  const currentUser = useHomeStore((state) => state.currentUser);
  const roles = useRolesStore((state) => state.roles);
  const activeUnitId = useCoreStore((state) => state.activeUnitId);
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyCallsImOn, setOnlyCallsImOn] = useState(filter === 'mine');

  useEffect(() => {
    setOnlyCallsImOn(filter === 'mine');
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      trackEvent('calls_viewed', {
        timestamp: new Date().toISOString(),
      });

      void fetchCallPriorities();
      void fetchCalls();
    }, [fetchCallPriorities, fetchCalls, trackEvent])
  );

  const handleRefresh = () => {
    void fetchCalls();
    void fetchCallPriorities();
  };

  const handleNewCall = () => {
    router.push('/call/new/');
  };

  const assignmentContext = useMemo(() => buildCallAssignmentContext(currentUser, roles, activeUnitId), [activeUnitId, currentUser, roles]);

  const filteredCalls = useMemo(() => {
    const normalizedSearchQuery = searchQuery.toLowerCase();

    return calls.filter((call) => {
      const matchesSearch =
        call.CallId.toLowerCase().includes(normalizedSearchQuery) ||
        (call.Nature?.toLowerCase() || '').includes(normalizedSearchQuery) ||
        (call.Name?.toLowerCase() || '').includes(normalizedSearchQuery) ||
        (call.Address?.toLowerCase() || '').includes(normalizedSearchQuery);

      if (!matchesSearch) {
        return false;
      }

      return onlyCallsImOn ? isCurrentUserOnCall(callExtrasById[call.CallId], assignmentContext) : true;
    });
  }, [assignmentContext, callExtrasById, calls, onlyCallsImOn, searchQuery]);

  const renderContent = () => {
    if (isLoading) {
      return <Loading text={t('calls.loading')} />;
    }

    if (error) {
      return <ZeroState heading={t('common.errorOccurred')} description={error} isError={true} />;
    }

    return (
      <FlatList<CallResultData>
        data={filteredCalls}
        renderItem={({ item }: { item: CallResultData }) => (
          <Pressable onPress={() => router.push(`/call/${item.CallId}`)}>
            <CallCard call={item} priority={callPriorities.find((p: { Id: number }) => p.Id === item.Priority)} callExtraData={callExtrasById[item.CallId]} />
          </Pressable>
        )}
        keyExtractor={(item: CallResultData) => item.CallId}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
        ListEmptyComponent={<ZeroState heading={t('calls.no_calls')} description={t('calls.no_calls_description')} icon={RefreshCcwDotIcon} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    );
  };

  return (
    <View className="size-full flex-1 bg-gray-50 dark:bg-gray-900">
      <Box className="flex-1 px-4 pt-4">
        <HStack className="mb-4 items-center gap-2">
          <Input className="flex-1 rounded-lg bg-white dark:bg-gray-800" size="md" variant="outline">
            <InputSlot className="pl-3">
              <InputIcon as={Search} />
            </InputSlot>
            <InputField placeholder={t('calls.search')} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery ? (
              <InputSlot className="pr-3" onPress={() => setSearchQuery('')}>
                <InputIcon as={X} />
              </InputSlot>
            ) : null}
          </Input>
          <Pressable
            testID="only-calls-im-on-toggle"
            onPress={() => setOnlyCallsImOn((currentValue) => !currentValue)}
            className={`items-center justify-center rounded-lg p-2 ${onlyCallsImOn ? 'bg-blue-100 dark:bg-blue-900' : 'bg-white dark:bg-gray-800'}`}
            aria-label={t('calls.only_calls_im_on')}
          >
            {onlyCallsImOn ? <UserCheck size={20} color="#2563EB" /> : <User size={20} color="#6B7280" />}
          </Pressable>
        </HStack>

        <Box className="flex-1">{renderContent()}</Box>

        {canUserCreateCalls ? (
          <Fab placement="bottom right" size="lg" onPress={handleNewCall} testID="new-call-fab">
            <FabIcon as={PlusIcon} size="lg" />
          </Fab>
        ) : null}
      </Box>
    </View>
  );
}
