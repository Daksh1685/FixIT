import { CameraView } from 'expo-camera';
import { useEffect, useRef, type RefObject } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { lightImpactHaptic, mediumImpactHaptic } from '../../services/haptics';
import { colors } from '../../theme/tokens';
import { CameraControls } from './CameraControls';

type CameraCaptureProps = {
  cameraRef: RefObject<CameraView | null>;
  isCameraReady: boolean;
  isCapturing: boolean;
  isPickingImage: boolean;
  onCameraReady: () => void;
  onCapture: () => void;
  onOpenLibrary: () => void;
};

export function CameraCapture({
  cameraRef,
  isCameraReady,
  isCapturing,
  isPickingImage,
  onCameraReady,
  onCapture,
  onOpenLibrary,
}: CameraCaptureProps) {
  const cameraOpacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(cameraOpacity, {
      duration: 280,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [cameraOpacity]);

  const captureFrame = () => {
    mediumImpactHaptic();
    flashOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(flashOpacity, { duration: 55, toValue: 0.7, useNativeDriver: true }),
      Animated.timing(flashOpacity, { duration: 180, toValue: 0, useNativeDriver: true }),
    ]).start();
    onCapture();
  };

  const openLibrary = () => {
    lightImpactHaptic();
    onOpenLibrary();
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: cameraOpacity }]}>
        <CameraView
          facing="back"
          onCameraReady={onCameraReady}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Pressable
        accessibilityHint="Freezes the live camera frame"
        accessibilityLabel="Capture current camera frame"
        accessibilityRole="button"
        disabled={!isCameraReady || isCapturing || isPickingImage}
        onPress={captureFrame}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flashOpacity }]} />

      <CameraControls
        isCameraReady={isCameraReady}
        isCapturing={isCapturing}
        isPickingImage={isPickingImage}
        onOpenLibrary={openLibrary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  flash: {
    backgroundColor: colors.white,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
