import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { CameraCapture } from '../../components/scanner/CameraCapture';
import { CameraPermission } from '../../components/scanner/CameraPermission';
import { ImagePreview } from '../../components/scanner/ImagePreview';
import { useDeviceDiagnosis } from '../diagnosis/hooks/useDeviceDiagnosis';
import { useImagePicker } from '../../hooks/useImagePicker';
import { colors } from '../../theme/tokens';
import { ScanImage } from '../../types/scan';

export function ScannerScreen() {
  const cameraRef = useRef<CameraView>(null);
  const hasRequestedPermission = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<ScanImage | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const { diagnosisState, retry } = useDeviceDiagnosis(capturedImage);

  useEffect(() => {
    if (
      permission &&
      !permission.granted &&
      permission.canAskAgain &&
      !hasRequestedPermission.current
    ) {
      hasRequestedPermission.current = true;
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const handleImageSelected = useCallback((image: ScanImage) => setCapturedImage(image), []);

  const { isPickingImage, pickImage } = useImagePicker(handleImageSelected);

  const captureFrame = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) {
      return;
    }

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        setCapturedImage({
          fileName: 'fixit-capture.jpg',
          height: photo.height,
          mimeType: 'image/jpeg',
          source: 'camera',
          uri: photo.uri,
          width: photo.width,
        });
      }
    } finally {
      setIsCapturing(false);
    }
  }, [isCameraReady, isCapturing]);

  const resumeScan = useCallback(() => {
    setCapturedImage(null);
    setIsCameraReady(false);
  }, []);

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <CameraPermission
        canAskAgain={permission.canAskAgain}
        onOpenSettings={() => void Linking.openSettings()}
        onRequestPermission={() => void requestPermission()}
      />
    );
  }

  if (capturedImage) {
    return (
      <ImagePreview
        diagnosisState={diagnosisState}
        image={capturedImage}
        onResume={resumeScan}
        onRetry={retry}
      />
    );
  }

  return (
    <CameraCapture
      cameraRef={cameraRef}
      isCameraReady={isCameraReady}
      isCapturing={isCapturing}
      isPickingImage={isPickingImage}
      onCameraReady={() => setIsCameraReady(true)}
      onCapture={() => void captureFrame()}
      onOpenLibrary={() => void pickImage()}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
