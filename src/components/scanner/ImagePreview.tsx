import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/tokens';
import { DiagnosisState } from '../../types/diagnosis';
import { ScanImage } from '../../types/scan';
import { AnalysisHud } from './AnalysisHud';
import { FaultHighlightOverlay } from './FaultHighlightOverlay';

type ImagePreviewProps = {
  diagnosisState: DiagnosisState;
  image: ScanImage;
  onResume: () => void;
  onRetry: () => void;
};

export function ImagePreview({ diagnosisState, image, onResume, onRetry }: ImagePreviewProps) {
  const label = image.source === 'camera' ? 'FRAME FROZEN' : 'IMAGE SELECTED';
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, {
      duration: 320,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [entrance, image.uri]);

  const imageStyle = {
    opacity: entrance,
    transform: [
      {
        scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [1.035, 1] }),
      },
    ],
  };
  const headerStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Animated.Image
        accessibilityLabel="Selected device image"
        source={{ uri: image.uri }}
        style={[styles.image, imageStyle]}
      />
      <View pointerEvents="none" style={styles.scrim} />
      {diagnosisState.status === 'success' ? (
        <FaultHighlightOverlay highlight={diagnosisState.diagnosis.highlight} image={image} />
      ) : null}

      <Animated.View pointerEvents="none" style={[styles.header, headerStyle]}>
        <View style={styles.badge}>
          <Ionicons color={colors.accent} name="checkmark-circle" size={16} />
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      </Animated.View>

      <AnalysisHud
        diagnosisState={diagnosisState}
        onResume={onResume}
        onRetry={onRetry}
        source={image.source}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 11, 16, 0.7)',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    left: 22,
    position: 'absolute',
    top: 62,
  },
  image: {
    height: '100%',
    resizeMode: 'cover',
    width: '100%',
  },
  scrim: {
    backgroundColor: 'rgba(4, 7, 10, 0.18)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
