import { CircleIcon } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";

import { useCoreStore } from "@/stores/app/core-store";
import { useCallsStore } from "@/stores/calls/store";
import { useStatusBottomSheetStore, useStatusesStore } from "@/stores/status/store";

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from "../ui/actionsheet";
import { Button, ButtonText } from "../ui/button";
import { Heading } from "../ui/heading";
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from "../ui/radio";
import { Text } from "../ui/text";
import { Textarea, TextareaInput } from "../ui/textarea";
import { VStack } from "../ui/vstack";

export const StatusBottomSheet = () => {
	const { t } = useTranslation();
	const { isOpen, currentStep, selectedCall, selectedStatus, note, setIsOpen, setCurrentStep, setSelectedCall, setNote, reset } = useStatusBottomSheetStore();

	const { activeCall } = useCoreStore();
	const { calls } = useCallsStore();

	const handleClose = () => {
		reset();
	};

	const handleNext = () => {
		if (currentStep === "select-call") {
			setCurrentStep("add-note");
		}
	};

	const handleSubmit = React.useCallback(async () => {
		try {
			await useStatusesStore.getState().saveUnitStatus(selectedStatus?.Id.toString() || "", note);
			// TODO: Implement status update logic here
			reset();
		} catch (error) {
			console.error("Failed to save unit status:", error);
		}
	}, [selectedStatus?.Id, note, reset]);

	const handleCallSelect = (callId: string) => {
		const call = calls.find((c) => c.CallId === callId);
		if (call) {
			setSelectedCall(call);
		}
	};

	React.useEffect(() => {
		if (activeCall && currentStep === "select-call" && !selectedCall) {
			setSelectedCall(activeCall);
		}
	}, [activeCall, currentStep, selectedCall, setSelectedCall]);

	return (
		<Actionsheet isOpen={isOpen} onClose={handleClose}>
			<ActionsheetBackdrop />
			<ActionsheetContent className="bg-white dark:bg-gray-900">
				<ActionsheetDragIndicatorWrapper>
					<ActionsheetDragIndicator />
				</ActionsheetDragIndicatorWrapper>

				<VStack space="md" className="w-full p-4">
					<Heading size="lg" className="mb-4">
						{currentStep === "select-call" ? t("Set Status: {{status}}", { status: selectedStatus?.Text }) : t("Add Note (Optional)")}
					</Heading>

					{currentStep === "select-call" ? (
						<VStack space="md" className="w-full">
							<Text className="mb-2 font-medium">{t("Select a Call")}</Text>

							{calls && calls.length > 0 ? (
								<ScrollView className="max-h-[300px]">
									<RadioGroup value={selectedCall?.CallId || ""} onChange={handleCallSelect}>
										<Radio key="0" value="0" className="mb-3 py-2">
											<RadioIndicator>
												<RadioIcon as={CircleIcon} />
											</RadioIndicator>
											<RadioLabel>
												<VStack>
													<Text className="font-bold">{t("calls.no_call_selected")}</Text>
												</VStack>
											</RadioLabel>
										</Radio>
										{calls.map((call) => (
											<Radio key={call.CallId} value={call.CallId} className="mb-3 py-2">
												<RadioIndicator>
													<RadioIcon as={CircleIcon} />
												</RadioIndicator>
												<RadioLabel>
													<VStack>
														<Text className="font-bold">
															{call.Number} - {call.Name}
														</Text>
														<Text className="text-sm text-gray-600 dark:text-gray-400">{call.Address}</Text>
													</VStack>
												</RadioLabel>
											</Radio>
										))}
									</RadioGroup>
								</ScrollView>
							) : (
								<Text className="italic text-gray-600 dark:text-gray-400">{t("No calls available")}</Text>
							)}

							<Button onPress={handleNext} isDisabled={!selectedCall} className="mt-4 w-full bg-blue-600">
								<ButtonText>{t("Next")}</ButtonText>
							</Button>
						</VStack>
					) : (
						<VStack space="md" className="w-full">
							<Text className="mb-2 font-medium">
								{t("Selected Call")}: {selectedCall?.Number} - {selectedCall?.Name}
							</Text>

							<Textarea size="md" className="min-h-[100px] w-full">
								<TextareaInput placeholder={t("Enter optional note...")} value={note} onChangeText={setNote} />
							</Textarea>
							<Button onPress={handleSubmit} className="w-full bg-blue-600">
								<ButtonText>{t("Submit")}</ButtonText>
							</Button>
						</VStack>
					)}
				</VStack>
			</ActionsheetContent>
		</Actionsheet>
	);
};
