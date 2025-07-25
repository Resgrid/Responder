import { ArrowLeft, ArrowRight, CircleIcon } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";

import { useCoreStore } from "@/stores/app/core-store";
import { useStaffingBottomSheetStore } from "@/stores/staffing/staffing-bottom-sheet-store";
import { invertColor } from "@/lib/utils";

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from "../ui/actionsheet";
import { Button, ButtonText } from "../ui/button";
import { Heading } from "../ui/heading";
import { HStack } from "../ui/hstack";
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from "../ui/radio";
import { Text } from "../ui/text";
import { Textarea, TextareaInput } from "../ui/textarea";
import { VStack } from "../ui/vstack";

export const StaffingBottomSheet = () => {
  const { t } = useTranslation();
  const {
    isOpen,
    currentStep,
    selectedStaffing,
    note,
    isLoading,
    setCurrentStep,
    setSelectedStaffing,
    setNote,
    nextStep,
    previousStep,
    submitStaffing,
    reset,
  } = useStaffingBottomSheetStore();

  const { activeStaffing } = useCoreStore();

  const handleClose = () => {
    reset();
  };

  const handleStaffingSelect = (staffingId: string) => {
    const staffing = activeStaffing?.find((s) => s.Id.toString() === staffingId);
    if (staffing) {
      setSelectedStaffing(staffing);
    }
  };

  const handleNext = () => {
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleSubmit = async () => {
    await submitStaffing();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "select-staffing":
        return t("staffing.select_staffing_level");
      case "add-note":
        return t("staffing.add_note");
      case "confirm":
        return t("staffing.confirm_staffing", { staffing: selectedStaffing?.Text });
      default:
        return t("staffing.set_staffing");
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "select-staffing":
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
      case "select-staffing":
        return selectedStaffing !== null;
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

          {currentStep === "select-staffing" && (
            <VStack space="md" className="w-full">
              <Text className="mb-2 font-medium">{t("staffing.select_staffing_level_description")}</Text>

              <ScrollView className="max-h-[400px]">
                <RadioGroup value={selectedStaffing?.Id.toString() || ""} onChange={handleStaffingSelect}>
                  {activeStaffing && activeStaffing.length > 0 ? (
                    activeStaffing.map((staffing) => (
                      <Radio key={staffing.Id} value={staffing.Id.toString()} className="mb-3 py-2">
                        <RadioIndicator>
                          <RadioIcon as={CircleIcon} />
                        </RadioIndicator>
                        <RadioLabel>
                          <VStack>
                            <HStack space="sm" className="items-center">
                              <Text
                                className="font-bold text-white px-2 py-1 rounded text-xs min-w-[60px] text-center"
                                style={{ backgroundColor: staffing.BColor, color: invertColor(staffing.BColor, true) }}
                              >
                                {staffing.Text}
                              </Text>
                            </HStack>
                            {staffing.DetailedDescription && (
                              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {staffing.DetailedDescription}
                              </Text>
                            )}
                          </VStack>
                        </RadioLabel>
                      </Radio>
                    ))
                  ) : (
                    <Text className="italic text-gray-600 dark:text-gray-400 mt-4">
                      {t("staffing.no_staffing_options")}
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
                <Text className="font-medium">{t("staffing.selected_staffing")}:</Text>
                <HStack space="sm" className="items-center">
                  <Text
                    className="font-bold text-white px-2 py-1 rounded text-sm"
                    style={{ backgroundColor: selectedStaffing?.BColor, color: invertColor(selectedStaffing?.BColor || '#000000', true) }}
                  >
                    {selectedStaffing?.Text}
                  </Text>
                </HStack>
              </VStack>

              <VStack space="sm">
                <Text className="font-medium">{t("staffing.note")} ({t("common.optional")}):</Text>
                <Textarea size="md" className="min-h-[100px] w-full">
                  <TextareaInput
                    placeholder={t("staffing.note_placeholder")}
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
              <Text className="text-lg font-semibold text-center mb-4">{t("staffing.review_and_confirm")}</Text>

              <VStack space="sm" className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <VStack space="xs">
                  <Text className="font-medium">{t("staffing.staffing_level")}:</Text>
                  <HStack space="sm" className="items-center">
                    <Text
                      className="font-bold text-white px-2 py-1 rounded text-sm"
                      style={{ backgroundColor: selectedStaffing?.BColor, color: invertColor(selectedStaffing?.BColor || '#000000', true) }}
                    >
                      {selectedStaffing?.Text}
                    </Text>
                  </HStack>
                </VStack>

                {note && (
                  <VStack space="xs">
                    <Text className="font-medium">{t("staffing.note")}:</Text>
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