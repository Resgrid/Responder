import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';
import { useCoreStore } from '@/stores/app/core-store';
import { useRolesStore } from '@/stores/roles/store';

import { RolesBottomSheet } from '../roles/roles-bottom-sheet';
import { Card } from '../ui/card';

export const SidebarRolesCard = () => {
  const { t } = useTranslation();
  const [isBottomSheetOpen, setIsBottomSheetOpen] = React.useState(false);
  const activeUnit = useCoreStore((state) => state.activeUnit);
  const unitRoleAssignments = useRolesStore((state) => state.unitRoleAssignments);

  const handlePress = React.useCallback(() => {
    setIsBottomSheetOpen(true);
  }, []);

  const handleClose = React.useCallback(() => {
    setIsBottomSheetOpen(false);
  }, []);

  const activeCount = React.useMemo(() => {
    if (!activeUnit || unitRoleAssignments.length === 0) return 0;
    return unitRoleAssignments.filter((assignment) => assignment.FullName && assignment.FullName !== '' && assignment.UnitId === activeUnit.UnitId).length;
  }, [unitRoleAssignments, activeUnit]);

  const totalCount = React.useMemo(() => {
    if (!activeUnit || unitRoleAssignments.length === 0) return 0;
    return unitRoleAssignments.filter((assignment) => assignment.UnitId === activeUnit.UnitId).length;
  }, [unitRoleAssignments, activeUnit]);

  const displayStatus = t('roles.status', {
    active: activeCount,
    total: totalCount,
  });

  return (
    <>
      <Pressable onPress={handlePress} testID="roles-sidebar-card">
        <Card className="flex-1 bg-background-50 p-4">
          <Text className="text-base font-medium" testID="roles-status-text">
            {displayStatus}
          </Text>
        </Card>
      </Pressable>

      <RolesBottomSheet isOpen={isBottomSheetOpen} onClose={handleClose} />
    </>
  );
};
