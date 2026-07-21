import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { mediumImpactHaptic } from '../../services/haptics';
import { colors, radius } from '../../theme/tokens';

type CameraPermissionProps = {
  canAskAgain: boolean;
  onOpenSettings: () => void;
  onRequestPermission: () => void;
};

export function CameraPermission({
  canAskAgain,
  onOpenSettings,
  onRequestPermission,
}: CameraPermissionProps) {
  const entrance = useRef(new Animated.Value(0)).current;
  const primaryAction = canAskAgain ? onRequestPermission : onOpenSettings;
  const actionLabel = canAskAgain ? 'Enable camera' : 'Open settings';

  useEffect(() => {
    Animated.spring(entrance, {
      friction: 8,
      tension: 90,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const continueToPermission = () => {
    mediumImpactHaptic();
    primaryAction();
  };

  return (
    <View style={styles.screen}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
              },
              {
                scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }),
              },
            ],
          },
        ]}
      >
        <View style={styles.iconWrap}>
          <Ionicons color={colors.accent} name="camera-outline" size={34} />
        </View>
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.copy}>
          FixiT uses your camera to capture a clear view of the device you want to inspect.
        </Text>
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          onPress={continueToPermission}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonLabel}>{actionLabel}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: 28,
    minHeight: 52,
    paddingHorizontal: 24,
  },
  buttonLabel: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '800',
  },
  content: {
    alignItems: 'center',
    maxWidth: 390,
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.cardSubtle,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  pressed: {
    backgroundColor: '#B1F8C8',
    transform: [{ scale: 0.985 }],
  },
  screen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 22,
  },
});
