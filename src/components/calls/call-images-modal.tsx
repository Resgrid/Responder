import { FlashList } from '@shopify/flash-list';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon, ImageIcon, PlusIcon, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, type ImageSourcePropType, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { useAnalytics } from '@/hooks/use-analytics';
import { useAuthStore } from '@/lib';
import { type CallFileResultData } from '@/models/v4/callFiles/callFileResultData';
import { useLocationStore } from '@/stores/app/location-store';
import { useCallDetailStore } from '@/stores/calls/detail-store';
import { useToastStore } from '@/stores/toast/store';

import { Box } from '../ui/box';
import { Button, ButtonIcon, ButtonText } from '../ui/button';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { Input, InputField } from '../ui/input';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';
import FullScreenImageModal from './full-screen-image-modal';

interface CallImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  galleryImage: {
    height: 256, // h-64 equivalent
    width: '100%',
    borderRadius: 8, // rounded-lg equivalent
  },
  previewImage: {
    height: 256, // h-64 equivalent
    width: '100%',
    borderRadius: 8, // rounded-lg equivalent
  },
});

const CallImagesModal: React.FC<CallImagesModalProps> = ({ isOpen, onClose, callId }) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { colorScheme } = useColorScheme();
  const { latitude, longitude } = useLocationStore();
  const { showToast } = useToastStore();

  // Create dynamic styles based on color scheme
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colorScheme === 'dark' ? '#111827' : 'white',
        },
        header: {
          backgroundColor: colorScheme === 'dark' ? '#111827' : 'white',
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB',
        },
        contentContainer: {
          flex: 1,
        },
        footer: {
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB',
          backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#F9FAFB',
        },
      }),
    [colorScheme]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [newImageNote, setNewImageNote] = useState('');
  const [selectedImageInfo, setSelectedImageInfo] = useState<{ uri: string; filename: string } | null>(null);
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [fullScreenImage, setFullScreenImage] = useState<{ source: ImageSourcePropType; name?: string } | null>(null);
  const flatListRef = useRef<FlashList<CallFileResultData>>(null);

  const { callImages, isLoadingImages, errorImages, fetchCallImages, uploadCallImage, clearCallImages } = useCallDetailStore();

  // Filter out images without proper data or URL
  const validImages = useMemo(() => {
    if (!callImages) return [];

    const filtered = callImages.filter((image: CallFileResultData) => {
      const hasValidData = image.Data && image.Data.trim() !== '';
      const hasValidUrl = image.Url && image.Url.trim() !== '';
      return hasValidData || hasValidUrl;
    });

    return filtered;
  }, [callImages]);

  useEffect(() => {
    if (isOpen && callId) {
      fetchCallImages(callId);
      setActiveIndex(0); // Reset active index when opening
      setImageErrors(new Set()); // Reset image errors
    }
  }, [isOpen, callId, fetchCallImages]);

  // Track when call images modal is opened/rendered
  useEffect(() => {
    if (isOpen) {
      trackEvent('call_images_modal_opened', {
        callId: callId,
        hasExistingImages: validImages.length > 0,
        imagesCount: validImages.length,
        isLoadingImages: isLoadingImages,
        hasError: !!errorImages,
      });
    }
  }, [isOpen, trackEvent, callId, validImages.length, isLoadingImages, errorImages]);

  // Reset active index when valid images change
  useEffect(() => {
    if (activeIndex >= validImages.length && validImages.length > 0) {
      setActiveIndex(0);
    }
  }, [validImages.length, activeIndex]);

  const handleImageSelect = async () => {
    try {
      // On Web, permissions are handled by the browser, so we skip the permission check
      // On iOS/Android, we need to request permissions first
      if (Platform.OS !== 'web') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
          // Check if user can be asked again or needs to go to settings
          if (!permissionResult.canAskAgain) {
            showToast('error', t('callImages.permission_denied_settings'));
          } else {
            showToast('error', t('common.permission_denied'));
          }
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        // Disable allowsEditing on all platforms - it can cause issues with high-res images
        // On iOS: UIImagePickerController bugs cause crashes
        // On Android: Can cause silent failures with certain device/image configurations
        allowsEditing: false,
        quality: 0.8,
        // Use compatible asset representation to avoid iOS crashes with certain image formats
        ...(Platform.OS === 'ios' && {
          preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        }),
      });

      // Handle Android MainActivity destruction - check for pending results first
      if (Platform.OS === 'android') {
        const pendingResult = await ImagePicker.getPendingResultAsync();
        if (pendingResult && 'assets' in pendingResult && pendingResult.assets && pendingResult.assets.length > 0) {
          const asset = pendingResult.assets[0];
          if (asset?.uri) {
            // Native Android uses PNG encoding
            const filename = asset.fileName || `image_${Date.now()}.png`;
            setSelectedImageInfo({ uri: asset.uri, filename });
            return;
          }
        }

        // If result was canceled and no pending result, user likely dismissed the picker
        if (result.canceled) {
          console.log('Image selection was canceled by user');
          return;
        }
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset?.uri) {
          // Derive extension based on platform encoding format
          // Native platforms use PNG encoding, web uses JPEG
          const defaultExtension = Platform.OS === 'web' ? 'jpg' : 'png';
          const filename = asset.fileName || `image_${Date.now()}.${defaultExtension}`;
          setSelectedImageInfo({ uri: asset.uri, filename });
        } else {
          console.error('Image picker returned asset without URI:', JSON.stringify(asset));
          showToast('error', t('callImages.select_error'));
        }
      } else if (!result.canceled) {
        // Result was not canceled but we have no assets - this is unexpected
        console.error('Image picker returned no assets:', JSON.stringify(result));
        showToast('error', t('callImages.select_error'));
      }
    } catch (error) {
      console.error('Error selecting image from library:', error);
      showToast('error', t('callImages.select_error'));
    }
  };

  const handleCameraCapture = async () => {
    try {
      // On Web, camera permissions are handled by the browser when launching the camera
      // On iOS/Android, we need to request camera permissions first
      if (Platform.OS !== 'web') {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
          // Check if user can be asked again or needs to go to settings
          if (!permissionResult.canAskAgain) {
            showToast('error', t('callImages.permission_denied_settings'));
          } else {
            showToast('error', t('common.permission_denied'));
          }
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        // Disable allowsEditing on all platforms - it can cause issues with high-res images
        // On iOS: UIImagePickerController bugs cause crashes
        // On Android: Can cause silent failures with certain device/camera configurations
        allowsEditing: false,
        quality: 0.8,
        // Ensure we get the image data back
        exif: false,
        // Use compatible asset representation to avoid iOS crashes with certain image formats
        ...(Platform.OS === 'ios' && {
          preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        }),
      });

      // Handle Android MainActivity destruction - check for pending results first
      if (Platform.OS === 'android') {
        // Always check for pending results on Android, not just when canceled
        // The activity might have been destroyed and recreated
        const pendingResult = await ImagePicker.getPendingResultAsync();
        if (pendingResult && 'assets' in pendingResult && pendingResult.assets && pendingResult.assets.length > 0) {
          const asset = pendingResult.assets[0];
          if (asset?.uri) {
            // Native Android uses PNG encoding
            const filename = `camera_${Date.now()}.png`;
            setSelectedImageInfo({ uri: asset.uri, filename });
            return;
          }
        }

        // If result was canceled and no pending result, user likely dismissed the camera
        if (result.canceled) {
          console.log('Camera capture was canceled by user');
          return;
        }
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset?.uri) {
          // Derive extension based on platform encoding format
          // Native platforms use PNG encoding, web uses JPEG
          const defaultExtension = Platform.OS === 'web' ? 'jpg' : 'png';
          const filename = `camera_${Date.now()}.${defaultExtension}`;
          setSelectedImageInfo({ uri: asset.uri, filename });
        } else {
          console.error('Camera returned asset without URI:', JSON.stringify(asset));
          showToast('error', t('callImages.capture_error'));
        }
      } else if (!result.canceled) {
        // Result was not canceled but we have no assets - this is unexpected
        console.error('Camera returned no assets:', JSON.stringify(result));
        showToast('error', t('callImages.capture_error'));
      }
    } catch (error) {
      console.error('Error capturing image from camera:', error);
      showToast('error', t('callImages.capture_error'));
    }
  };

  const handleUploadImage = async () => {
    if (!selectedImageInfo) return;

    // Validate URI before processing
    if (!selectedImageInfo.uri || typeof selectedImageInfo.uri !== 'string') {
      console.error('Invalid image URI:', selectedImageInfo.uri);
      showToast('error', t('callImages.upload_error'));
      return;
    }

    setIsUploading(true);
    try {
      let base64Image: string;

      // On Web, we can skip image manipulation if there are issues
      // On native platforms, manipulate the image for consistency
      if (Platform.OS === 'web') {
        // On Web, try to manipulate but have a fallback
        try {
          const manipulatedImage = await ImageManipulator.manipulateAsync(selectedImageInfo.uri, [{ resize: { width: 1024 } }], {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true, // Get base64 directly to avoid FileSystem issues on web
          });

          if (manipulatedImage?.base64) {
            base64Image = manipulatedImage.base64;
          } else {
            // Fallback: try to read from data URI if manipulation didn't return base64
            throw new Error('No base64 returned from manipulation');
          }
        } catch (webError) {
          console.error('Web image manipulation error:', webError);
          // On web, the URI might already be a data URI or blob URL
          // Try to extract base64 from data URI
          if (selectedImageInfo.uri.startsWith('data:')) {
            const base64Match = selectedImageInfo.uri.match(/base64,(.*)$/);
            if (base64Match && base64Match[1]) {
              base64Image = base64Match[1];
            } else {
              throw new Error('Could not extract base64 from data URI');
            }
          } else {
            throw webError;
          }
        }
      } else {
        // Native platforms (iOS/Android)
        let manipulatedImage;
        try {
          manipulatedImage = await ImageManipulator.manipulateAsync(selectedImageInfo.uri, [{ resize: { width: 1024 } }], {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.PNG,
            base64: true, // Get base64 directly
          });
        } catch (manipulateError) {
          console.error('Error manipulating image:', manipulateError);
          // Try without resize as fallback for problematic images
          manipulatedImage = await ImageManipulator.manipulateAsync(
            selectedImageInfo.uri,
            [], // No transformations
            {
              compress: 0.8,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            }
          );
        }

        if (manipulatedImage?.base64) {
          base64Image = manipulatedImage.base64;
        } else if (manipulatedImage?.uri) {
          // Fallback to FileSystem if base64 wasn't returned
          base64Image = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } else {
          throw new Error('Image manipulation failed - no output');
        }
      }

      // Get current location if available
      const currentLatitude = latitude;
      const currentLongitude = longitude;

      await uploadCallImage(
        callId,
        useAuthStore.getState().userId!,
        newImageNote || '', // Use note for the note field
        selectedImageInfo.filename, // Use filename for the name field
        currentLatitude, // Current latitude
        currentLongitude, // Current longitude
        base64Image
      );
      setSelectedImageInfo(null);
      setNewImageNote('');
      setIsAddingImage(false);
      showToast('success', t('callImages.upload_success'));
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('error', t('callImages.upload_error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageError = (itemId: string, error: any) => {
    console.error(`Image failed to load for ${itemId}:`, error);
    setImageErrors((prev) => new Set([...prev, itemId]));
  };

  // Reset active index when valid images change

  const renderImageItem = ({ item, index }: { item: CallFileResultData; index: number }) => {
    if (!item) return null;

    const hasError = imageErrors.has(item.Id);
    let imageSource: { uri: string } | null = null;

    if (item.Data && item.Data.trim() !== '') {
      // Use Data as base64 image
      const mimeType = item.Mime || 'image/png'; // Default to png if no mime type
      imageSource = { uri: `data:${mimeType};base64,${item.Data}` };
    } else if (item.Url && item.Url.trim() !== '') {
      // Use URL directly since it's unauthenticated
      const url = item.Url.trim();
      imageSource = { uri: url };
    }

    // Show error state if there's an error or no valid image source
    if (!imageSource || hasError) {
      return (
        <Box className="w-full items-center justify-center px-4" style={{ width }}>
          <Box className="h-64 w-full items-center justify-center rounded-lg bg-gray-200">
            <ImageIcon size={48} color="#999" />
            <Text className="mt-2 text-gray-500">{t('callImages.failed_to_load')}</Text>
            {item.Url && (
              <Text className="mt-1 px-2 text-center text-xs text-gray-400" numberOfLines={2}>
                URL: {item.Url}
              </Text>
            )}
          </Box>
          <Text className="mt-2 text-center font-medium">{item.Name || ''}</Text>
          <Text className="text-xs text-gray-500">{item.Timestamp || ''}</Text>
        </Box>
      );
    }

    // At this point, imageSource is guaranteed to be non-null
    return (
      <Box className="w-full items-center justify-center px-4" style={{ width }}>
        <TouchableOpacity
          onPress={() => {
            setFullScreenImage({ source: imageSource, name: item.Name });
          }}
          testID={`image-${item.Id}-touchable`}
          activeOpacity={0.7}
          style={{ width: '100%' }}
          delayPressIn={0}
          delayPressOut={0}
        >
          <Image
            key={`${item.Id}-${index}`}
            source={imageSource}
            style={styles.galleryImage}
            contentFit="contain"
            transition={200}
            pointerEvents="none"
            cachePolicy="memory-disk"
            recyclingKey={item.Id}
            onError={() => {
              handleImageError(item.Id, 'expo-image load error');
            }}
            onLoad={() => {
              // Remove from error set if it loads successfully
              setImageErrors((prev) => {
                const newSet = new Set(prev);
                newSet.delete(item.Id);
                return newSet;
              });
            }}
          />
        </TouchableOpacity>
        <Text className="mt-2 text-center font-medium">{item.Name || ''}</Text>
        <Text className="text-xs text-gray-500">{item.Timestamp || ''}</Text>
      </Box>
    );
  };

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }).current;

  const handlePrevious = () => {
    const newIndex = Math.max(0, activeIndex - 1);
    setActiveIndex(newIndex);
    try {
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
    } catch (error) {
      console.warn('Error scrolling to previous image:', error);
    }
  };

  const handleNext = () => {
    const newIndex = Math.min(validImages.length - 1, activeIndex + 1);
    setActiveIndex(newIndex);
    try {
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
    } catch (error) {
      console.warn('Error scrolling to next image:', error);
    }
  };

  const renderPagination = () => {
    if (!validImages || validImages.length <= 1) return null;

    return (
      <HStack className="mt-4 items-center justify-between px-4">
        <TouchableOpacity testID="previous-button" onPress={handlePrevious} disabled={activeIndex === 0} className={`rounded-full bg-white/80 p-2 ${activeIndex === 0 ? 'opacity-50' : ''}`}>
          <ChevronLeftIcon size={24} color="#000" />
        </TouchableOpacity>

        <HStack className="items-center space-x-2 rounded-full bg-white/80 px-4 py-2 dark:bg-gray-800/80">
          <Text className="text-sm font-medium text-gray-800 dark:text-white">
            {activeIndex + 1} / {validImages.length}
          </Text>
        </HStack>

        <TouchableOpacity
          testID="next-button"
          onPress={handleNext}
          disabled={activeIndex === validImages.length - 1}
          className={`rounded-full bg-white/80 p-2 ${activeIndex === validImages.length - 1 ? 'opacity-50' : ''}`}
        >
          <ChevronRightIcon size={24} color="#000" />
        </TouchableOpacity>
      </HStack>
    );
  };

  const renderAddImageContent = () => (
    <VStack className="flex-1">
      {/* Scrollable content area */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
        {selectedImageInfo ? (
          <Box className="items-center justify-center">
            <Image source={{ uri: selectedImageInfo.uri }} style={styles.previewImage} contentFit="contain" transition={200} />
          </Box>
        ) : (
          <VStack className="space-y-4">
            <TouchableOpacity onPress={handleImageSelect} className="flex-row items-center space-x-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-700">
              <PlusIcon size={20} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
              <Text className="text-gray-800 dark:text-gray-200">{t('callImages.select_from_gallery')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCameraCapture} className="flex-row items-center space-x-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-700">
              <CameraIcon size={20} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
              <Text className="text-gray-800 dark:text-gray-200">{t('callImages.take_photo')}</Text>
            </TouchableOpacity>
          </VStack>
        )}
      </ScrollView>

      {/* Fixed bottom section for input and buttons */}
      {selectedImageInfo && (
        <KeyboardStickyView offset={{ opened: 0, closed: 0 }}>
          <View style={dynamicStyles.footer}>
            <VStack space="md" className="w-full">
              <Input className="w-full rounded-lg bg-white dark:bg-gray-700">
                <InputField placeholder={t('callImages.image_note')} value={newImageNote} onChangeText={setNewImageNote} testID="image-note-input" autoCorrect={false} />
              </Input>
              <HStack className="w-full justify-between">
                <Button
                  variant="outline"
                  onPress={() => {
                    setIsAddingImage(false);
                    setSelectedImageInfo(null);
                    setNewImageNote('');
                  }}
                  className="border-gray-300 dark:border-gray-600"
                >
                  <ButtonText className="text-gray-700 dark:text-gray-300">{t('common.cancel')}</ButtonText>
                </Button>
                <Button onPress={handleUploadImage} className="bg-blue-600 dark:bg-blue-500" isDisabled={isUploading} testID="upload-button">
                  <ButtonText>{isUploading ? t('common.uploading') : t('callImages.upload')}</ButtonText>
                </Button>
              </HStack>
            </VStack>
          </View>
        </KeyboardStickyView>
      )}
    </VStack>
  );

  const renderImageGallery = () => {
    if (!validImages?.length) return null;

    return (
      <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 16 }} showsVerticalScrollIndicator={true}>
        <VStack className="space-y-4">
          <Box className="relative">
            <FlashList
              ref={flatListRef}
              data={validImages}
              renderItem={renderImageItem}
              keyExtractor={(item: CallFileResultData, index: number) => item?.Id || `image-${index}-${item?.Name || 'unknown'}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={handleViewableItemsChanged}
              viewabilityConfig={{
                itemVisiblePercentThreshold: 50,
                minimumViewTime: 100,
              }}
              snapToInterval={width}
              snapToAlignment="start"
              decelerationRate="fast"
              estimatedItemSize={width}
              // Memory optimization: only render visible items plus a small buffer
              drawDistance={width}
              // Optimize for memory by removing items that are far from viewport
              overrideItemLayout={(layout, item, index, maxColumns, extraData) => {
                layout.size = width;
              }}
              className="w-full"
              contentContainerStyle={{ paddingHorizontal: 0 }}
              ListEmptyComponent={() => (
                <Box className="w-full items-center justify-center p-4">
                  <Text className="text-center text-gray-500">{t('callImages.no_images')}</Text>
                </Box>
              )}
            />
          </Box>
          {renderPagination()}
        </VStack>
      </ScrollView>
    );
  };

  const renderContent = () => {
    if (isLoadingImages) {
      return <Loading text={t('callImages.loading')} />;
    }

    if (errorImages) {
      return <ZeroState heading={t('callImages.error')} description={errorImages} isError={true} />;
    }

    if (isAddingImage) {
      return renderAddImageContent();
    }

    if (!validImages || validImages.length === 0) {
      return <ZeroState icon={ImageIcon} heading={t('callImages.no_images')} description={t('callImages.no_images_description')} />;
    }

    return renderImageGallery();
  };

  // Handle modal close with cleanup
  const handleClose = useCallback(() => {
    // Clear state before closing
    setFullScreenImage(null);
    setSelectedImageInfo(null);
    setIsAddingImage(false);
    setNewImageNote('');
    setImageErrors(new Set());
    // Clear images from store to free memory
    clearCallImages();
    onClose();
  }, [onClose, clearCallImages]);

  return (
    <>
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
          {/* Fixed Header */}
          <View style={dynamicStyles.header}>
            <Box className="w-full flex-row items-center justify-between px-4 pb-4 pt-2">
              <Heading size="lg">{isAddingImage ? t('callImages.add_new') : t('callImages.title')}</Heading>
              <Button variant="link" onPress={handleClose} className="p-1" testID="close-button">
                <X size={24} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
              </Button>
            </Box>

            {/* Add Image Button - Only show when not adding and not loading */}
            {!isAddingImage && !isLoadingImages && (
              <Box className="px-4 pb-4">
                <Button size="sm" variant="outline" onPress={() => setIsAddingImage(true)} className="w-full">
                  <ButtonIcon as={PlusIcon} />
                  <ButtonText>{t('callImages.add')}</ButtonText>
                </Button>
              </Box>
            )}
          </View>

          {/* Scrollable Content */}
          <View style={dynamicStyles.contentContainer}>{renderContent()}</View>
        </SafeAreaView>
      </Modal>

      {/* Full Screen Image Modal */}
      <FullScreenImageModal isOpen={!!fullScreenImage} onClose={() => setFullScreenImage(null)} imageSource={fullScreenImage?.source || { uri: '' }} imageName={fullScreenImage?.name} />
    </>
  );
};

export default CallImagesModal;
