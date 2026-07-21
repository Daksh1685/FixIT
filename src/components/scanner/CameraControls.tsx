import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../../theme/tokens';
import { IconCircleButton } from '../ui/IconCircleButton';
import { ScanFrame } from './ScanFrame';

type CameraControlsProps = {
  isCameraReady: boolean;
  isCapturing: boolean;
  isPickingImage: boolean;
  onOpenLibrary: () => void;
};

export function CameraControls({
  isCameraReady,
  isCapturing,
  isPickingImage,
  onOpenLibrary,
}: CameraControlsProps) {
  const isBusy = isCapturing || isPickingImage;
  const entrance = useRef(new Animated.Value(0)).current;
  const livePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      duration: 360,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { duration: 900, toValue: 0.35, useNativeDriver: true }),
        Animated.timing(livePulse, { duration: 900, toValue: 1, useNativeDriver: true }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [livePulse]);

  const headerStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }),
      },
    ],
  };
  const guideStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
      },
    ],
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.header, headerStyle]}>
        <View style={styles.brandLockup}>
          <View style={styles.mark} />
          <Text style={styles.brand}>FixiT</Text>
        </View>
        <IconCircleButton
          accessibilityLabel="Choose a photo from your library"
          disabled={isBusy}
          icon="images-outline"
          onPress={onOpenLibrary}
        />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.guide, guideStyle]}>
        <ScanFrame />
        <Text style={styles.guideTitle}>Frame the device</Text>
        <Text style={styles.guideCopy}>Keep the issue clearly in view</Text>
      </Animated.View>

      <Animated.View pointerEvents="box-none" style={[styles.footer, guideStyle]}>
        <Pressable
          accessibilityHint="Opens your photo library"
          accessibilityLabel="Inspect a photo from your library"
          accessibilityRole="button"
          disabled={isBusy}
          onPress={onOpenLibrary}
          style={({ pressed }) => [styles.libraryButton, pressed && !isBusy && styles.pressed]}
        >
          {isPickingImage ? (
            <ActivityIndicator color={colors.ink} size="small" />
          ) : (
            <Ionicons color={colors.ink} name="images-outline" size={18} />
          )}
          <Text style={styles.libraryLabel}>Photo library</Text>
        </Pressable>

        <View style={styles.captureHint}>
          {isCapturing ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <Animated.View
              style={[
                styles.liveDot,
                !isCameraReady && styles.waitingDot,
                isCameraReady && { opacity: livePulse },
              ]}
            />
          )}
          <Text style={styles.captureText}>
            {isCapturing ? 'Capturing frame…' : isCameraReady ? 'Tap anywhere to capture' : 'Starting camera…'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  brandLockup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  captureHint: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 11, 16, 0.64)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  captureText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    bottom: 34,
    gap: 14,
    left: 20,
    position: 'absolute',
    right: 20,
  },
  guide: {
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: '42%',
  },
  guideCopy: {
    color: 'rgba(246, 248, 250, 0.76)',
    fontSize: 13,
    marginTop: 5,
  },
  guideTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 62,
  },
  libraryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 11, 16, 0.64)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  libraryLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  liveDot: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  mark: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  waitingDot: {
    backgroundColor: colors.muted,
  },
});
