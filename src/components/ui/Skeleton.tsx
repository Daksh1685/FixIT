import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

import { colors, radius } from '../../theme/tokens';

type SkeletonProps = {
  style?: ViewStyle;
};

export function Skeleton({ style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { duration: 760, toValue: 0.82, useNativeDriver: true }),
        Animated.timing(opacity, { duration: 760, toValue: 0.35, useNativeDriver: true }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeleton, style, { opacity }]} />;
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.cardSubtle,
    borderRadius: radius.pill,
  },
});
