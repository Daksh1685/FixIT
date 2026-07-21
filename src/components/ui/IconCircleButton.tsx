import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';

import { colors } from '../../theme/tokens';

type IconCircleButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  style?: ViewStyle;
};

export function IconCircleButton({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  style,
}: IconCircleButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Ionicons color={colors.ink} name={icon} size={21} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 11, 16, 0.64)',
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
});
