import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { ScanImage } from '../types/scan';

/** Opens the platform image picker and returns a single image URI when selected. */
export function useImagePicker(onImageSelected: (image: ScanImage) => void) {
  const [isPickingImage, setIsPickingImage] = useState(false);

  const pickImage = useCallback(async () => {
    if (isPickingImage) {
      return;
    }

    setIsPickingImage(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ['images'],
        quality: 1,
      });

      const asset = result.assets?.[0];
      if (!result.canceled && asset?.uri) {
        onImageSelected({
          fileName: asset.fileName ?? undefined,
          height: asset.height > 0 ? asset.height : undefined,
          mimeType: asset.mimeType ?? undefined,
          source: 'library',
          uri: asset.uri,
          width: asset.width > 0 ? asset.width : undefined,
        });
      }
    } finally {
      setIsPickingImage(false);
    }
  }, [isPickingImage, onImageSelected]);

  return { isPickingImage, pickImage };
}
