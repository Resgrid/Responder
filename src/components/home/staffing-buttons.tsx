import React from 'react';
import { useTranslation } from 'react-i18next';

import { savePersonnelStaffing } from '@/api/personnel/personnelStaffing';
import { Loading } from '@/components/common/loading';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAuthStore } from '@/lib/auth';
import { invertColor } from '@/lib/utils';
import { SavePersonStaffingInput } from '@/models/v4/personnelStaffing/savePersonStaffingInput';
import { useCoreStore } from '@/stores/app/core-store';
import { useHomeStore } from '@/stores/home/home-store';
import { useToastStore } from '@/stores/toast/store';

export const StaffingButtons: React.FC = () => {
	const { t } = useTranslation();
	const { isLoadingOptions, fetchCurrentUserInfo } = useHomeStore();
	const { activeStaffing } = useCoreStore();
	const showToast = useToastStore((state) => state.showToast);
	const { userId } = useAuthStore();
	const [isLoading, setIsLoading] = React.useState(false);

	const handleStaffingPress = async (staffingType: string) => {
		if (!userId) {
			showToast('error', t('home.error.no_user_id'));
			return;
		}

		setIsLoading(true);
		try {
			const staffing = new SavePersonStaffingInput();
			const date = new Date();

			staffing.UserId = userId;
			staffing.Type = staffingType;
			staffing.Timestamp = date.toISOString();
			staffing.TimestampUtc = date.toUTCString().replace('UTC', 'GMT');
			staffing.Note = '';
			staffing.EventId = '';

			await savePersonnelStaffing(staffing);

			// Refresh user info to show updated staffing
			await fetchCurrentUserInfo();

			showToast('success', t('home.staffing.updated_successfully'));
		} catch (error) {
			showToast('error', t('home.staffing.update_failed'));
		} finally {
			setIsLoading(false);
		}
	};

	if (isLoadingOptions) {
		return <Loading />;
	}

	if (activeStaffing?.length === 0) {
		return (
			<VStack className="p-4">
				<Text className="text-center text-gray-500">{t('home.staffing.no_options_available')}</Text>
			</VStack>
		);
	}

	return (
		<VStack space="sm" className="p-4" testID="staffing-buttons">
			{activeStaffing?.map((staffing) => (
				<Button
					key={staffing.Id}
					variant="solid"
					className="w-full justify-center px-3 py-2"
					action="primary"
					size="lg"
					style={{
						backgroundColor: staffing.BColor,
					}}
					onPress={() => handleStaffingPress(staffing.Id.toString())}
					isDisabled={isLoading}
					testID={`staffing-button-${staffing.Id}`}
				>
					<ButtonText style={{ color: invertColor(staffing.BColor, true) }}>{staffing.Text}</ButtonText>
				</Button>
			))}
		</VStack>
	);
};
