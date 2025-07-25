import { ArrowLeft, ArrowRight, CircleIcon } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";

import { useCoreStore } from "@/stores/app/core-store";
import { useCallsStore } from "@/stores/calls/store";
import { usePersonnelStatusBottomSheetStore } from "@/stores/status/personnel-status-store";

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from "../ui/actionsheet";
import { Button, ButtonText } from "../ui/button";
import { Heading } from "../ui/heading";
import { HStack } from "../ui/hstack";
import { Input, InputField } from "../ui/input";
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from "../ui/radio";
import { Text } from "../ui/text";
import { Textarea, TextareaInput } from "../ui/textarea";
import { VStack } from "../ui/vstack";

export const PersonnelStatusBottomSheet = () => {
  const { t } = useTranslation();
  const {
    isOpen,
    currentStep,
    selectedCall,
    selectedStatus,
    note,
    respondingTo,
    isLoading,
    setCurrentStep,
    setSelectedCall,
    setNote,
    setRespondingTo,
    nextStep,
    previousStep,
    submitStatus,
    reset,
  } = usePersonnelStatusBottomSheetStore();

  const { activeCall } = useCoreStore();
  const { calls } = useCallsStore();

  const handleClose = () => {
    reset();
  };

  const handleCallSelect = (callId: string) => {
    const call = calls.find((c) => c.CallId === callId);
    if (call) {
      setSelectedCall(call);
      setRespondingTo(call.CallId);
    } else if (callId === "0") {
      setSelectedCall(null);
      setRespondingTo("");
    }
  };

  const handleNext = () => {
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleSubmit = async () => {
    await submitStatus();
  };

  // Auto-select active call if available and no call is selected
  React.useEffect(() => {
    if (activeCall && currentStep === "select-responding-to" && !selectedCall) {
      setSelectedCall(activeCall);
      setRespondingTo(activeCall.CallId);
    }
  }, [activeCall, currentStep, selectedCall, setSelectedCall, setRespondingTo]);

  const getStepTitle = () => {
    switch (currentStep) {
      case "select-responding-to":
        return t("personnel.status.select_responding_to", { status: selectedStatus?.Text });
      case "add-note":
        return t("personnel.status.add_note");
      case "confirm":
        return t("personnel.status.confirm_status", { status: selectedStatus?.Text });
      default:
        return t("personnel.status.set_status");
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "select-responding-to":
        return 1;
      case "add-note":
        return 2;
      case "confirm":
        return 3;
      default:
        return 1;
    }
  };

  const canProceedFromCurrentStep = () => {
    switch (currentStep) {
      case "select-responding-to":
        return true; // Can proceed even without selecting a call
      case "add-note":
        return true; // Note is optional
      case "confirm":
        return true;
      default:
        return false;
    }
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={handleClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="bg-white dark:bg-gray-900">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <VStack space="md" className="w-full p-4">
          {/* Step indicator */}
          <HStack space="sm" className="justify-center mb-2">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t("common.step")} {getStepNumber()} {t("common.of")} 3
            </Text>
          </HStack>

          <Heading size="lg" className="mb-4 text-center">
            {getStepTitle()}
          </Heading>

          {currentStep === "select-responding-to" && (
            <VStack space="md" className="w-full">
              <Text className="mb-2 font-medium">{t("personnel.status.select_call_to_respond_to")}</Text>

              <ScrollView className="max-h-[300px]">
                <RadioGroup value={selectedCall?.CallId || "0"} onChange={handleCallSelect}>
                  <Radio key="0" value="0" className="mb-3 py-2">
                    <RadioIndicator>
                      <RadioIcon as={CircleIcon} />
                    </RadioIndicator>
                    <RadioLabel>
                      <VStack>
                        <Text className="font-bold">{t("calls.no_call_selected")}</Text>
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          {t("personnel.status.general_status")}
                        </Text>
                      </VStack>
                    </RadioLabel>
                  </Radio>
                  {calls && calls.length > 0 ? (
                    calls.map((call) => (
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
                    ))
                  ) : (
                    <Text className="italic text-gray-600 dark:text-gray-400 mt-4">
                      {t("calls.no_calls_available")}
                    </Text>
                  )}
                </RadioGroup>
              </ScrollView>

              <HStack space="sm" className="justify-end mt-4">
                <Button onPress={handleNext} isDisabled={!canProceedFromCurrentStep()} className="bg-blue-600">
                  <ButtonText>{t("common.next")}</ButtonText>
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </HStack>
            </VStack>
          )}

          {currentStep === "add-note" && (
            <VStack space="md" className="w-full">
              <VStack space="sm">
                <Text className="font-medium">{t("personnel.status.selected_call")}:</Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedCall ? `${selectedCall.Number} - ${selectedCall.Name}` : t("calls.no_call_selected")}
                </Text>
              </VStack>

              <VStack space="sm">
                <Text className="font-medium">{t("personnel.status.responding_to")} ({t("common.optional")}):</Text>
                <Input size="md">
                  <InputField
                    placeholder={t("personnel.status.responding_to_placeholder")}
                    value={respondingTo}
                    onChangeText={setRespondingTo}
                  />
                </Input>
              </VStack>

              <VStack space="sm">
                <Text className="font-medium">{t("personnel.status.note")} ({t("common.optional")}):</Text>
                <Textarea size="md" className="min-h-[100px] w-full">
                  <TextareaInput
                    placeholder={t("personnel.status.note_placeholder")}
                    value={note}
                    onChangeText={setNote}
                  />
                </Textarea>
              </VStack>

              <HStack space="sm" className="justify-between mt-4">
                <Button variant="outline" onPress={handlePrevious} className="flex-1">
                  <ArrowLeft size={16} className="mr-2" />
                  <ButtonText>{t("common.previous")}</ButtonText>
                </Button>
                <Button onPress={handleNext} isDisabled={!canProceedFromCurrentStep()} className="flex-1 bg-blue-600">
                  <ButtonText>{t("common.next")}</ButtonText>
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </HStack>
            </VStack>
          )}

          {currentStep === "confirm" && (
            <VStack space="md" className="w-full">
              <Text className="text-lg font-semibold text-center mb-4">{t("personnel.status.review_and_confirm")}</Text>

              <VStack space="sm" className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <VStack space="xs">
                  <Text className="font-medium">{t("personnel.status.status")}:</Text>
                  <Text className="text-sm">{selectedStatus?.Text}</Text>
                </VStack>

                <VStack space="xs">
                  <Text className="font-medium">{t("personnel.status.responding_to")}:</Text>
                  <Text className="text-sm">
                    {selectedCall ? `${selectedCall.Number} - ${selectedCall.Name}` : t("calls.no_call_selected")}
                  </Text>
                </VStack>

                {respondingTo && (
                  <VStack space="xs">
                    <Text className="font-medium">{t("personnel.status.custom_responding_to")}:</Text>
                    <Text className="text-sm">{respondingTo}</Text>
                  </VStack>
                )}

                {note && (
                  <VStack space="xs">
                    <Text className="font-medium">{t("personnel.status.note")}:</Text>
                    <Text className="text-sm">{note}</Text>
                  </VStack>
                )}
              </VStack>

              <HStack space="sm" className="justify-between mt-4">
                <Button variant="outline" onPress={handlePrevious} className="flex-1" isDisabled={isLoading}>
                  <ArrowLeft size={16} className="mr-2" />
                  <ButtonText>{t("common.previous")}</ButtonText>
                </Button>
                <Button onPress={handleSubmit} isDisabled={isLoading} className="flex-1 bg-green-600">
                  <ButtonText>{isLoading ? t("common.submitting") : t("common.submit")}</ButtonText>
                </Button>
              </HStack>
            </VStack>
          )}
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
}; 