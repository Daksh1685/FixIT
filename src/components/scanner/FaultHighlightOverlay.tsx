import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../../theme/tokens';
import { DiagnosisHighlight } from '../../types/diagnosis';
import { ScanImage } from '../../types/scan';

type FaultHighlightOverlayProps = {
  highlight: DiagnosisHighlight;
  image: ScanImage;
};

type Size = {
  height: number;
  width: number;
};

type Rectangle = {
  height: number;
  left: number;
  top: number;
  width: number;
};

const LABEL_WIDTH = 178;
const LABEL_HEIGHT = 38;
const EDGE_PADDING = 14;

/**
 * Draws a static, normalized highlight over a resizeMode="cover" image. The
 * cover geometry accounts for image cropping on screens with different ratios.
 */
export function FaultHighlightOverlay({ highlight, image }: FaultHighlightOverlayProps) {
  const [containerSize, setContainerSize] = useState<Size | null>(null);
  const [imageSize, setImageSize] = useState<Size | null>(getKnownImageSize(image));
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setImageSize(getKnownImageSize(image));

    if (!image.width || !image.height) {
      Image.getSize(
        image.uri,
        (width, height) => setImageSize({ height, width }),
        () => setImageSize(null),
      );
    }
  }, [image]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 1100, toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 1100, toValue: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [pulse]);

  const rectangle = useMemo(
    () => getHighlightRectangle(containerSize, imageSize, highlight),
    [containerSize, highlight, imageSize],
  );

  if (!rectangle || !containerSize) {
    return (
      <View
        onLayout={(event) => setContainerSize(event.nativeEvent.layout)}
        pointerEvents="none"
        style={styles.overlay}
      />
    );
  }

  const label = getLabelPosition(rectangle, containerSize);
  const from = {
    x: rectangle.left + rectangle.width / 2,
    y: label.isAbove ? rectangle.top : rectangle.top + rectangle.height,
  };
  const to = {
    x: label.left + label.width / 2,
    y: label.isAbove ? label.top + label.height : label.top,
  };

  return (
    <View
      onLayout={(event) => setContainerSize(event.nativeEvent.layout)}
      pointerEvents="none"
      style={styles.overlay}
    >
      <Animated.View
        style={[
          styles.pulseRing,
          rectangle,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 0.18] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }) }],
          },
        ]}
      />
      <View style={[styles.rectangle, rectangle]} />
      <ConnectingLine from={from} to={to} />
      <View style={[styles.label, { left: label.left, top: label.top, width: label.width }]}>
        <View style={styles.labelDot} />
        <Text numberOfLines={2} style={styles.labelText}>
          {highlight.label}
        </Text>
      </View>
    </View>
  );
}

function ConnectingLine({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

  return (
    <View
      style={[
        styles.line,
        {
          left: (from.x + to.x) / 2 - length / 2,
          top: (from.y + to.y) / 2 - 1,
          transform: [{ rotate: `${angle}deg` }],
          width: length,
        },
      ]}
    />
  );
}

function getKnownImageSize(image: ScanImage): Size | null {
  if (!image.width || !image.height || image.width <= 0 || image.height <= 0) {
    return null;
  }

  return { height: image.height, width: image.width };
}

function getHighlightRectangle(
  containerSize: Size | null,
  imageSize: Size | null,
  highlight: DiagnosisHighlight,
): Rectangle | null {
  if (!containerSize || !imageSize || !containerSize.width || !containerSize.height) {
    return null;
  }

  const containerRatio = containerSize.width / containerSize.height;
  const imageRatio = imageSize.width / imageSize.height;
  const renderedSize =
    imageRatio > containerRatio
      ? { height: containerSize.height, width: containerSize.height * imageRatio }
      : { height: containerSize.width / imageRatio, width: containerSize.width };
  const offsetX = (containerSize.width - renderedSize.width) / 2;
  const offsetY = (containerSize.height - renderedSize.height) / 2;

  return {
    height: renderedSize.height * highlight.height,
    left: offsetX + renderedSize.width * highlight.x,
    top: offsetY + renderedSize.height * highlight.y,
    width: renderedSize.width * highlight.width,
  };
}

function getLabelPosition(rectangle: Rectangle, containerSize: Size) {
  const width = Math.min(LABEL_WIDTH, containerSize.width - EDGE_PADDING * 2);
  const isAbove = rectangle.top > LABEL_HEIGHT + 42;
  const top = isAbove
    ? Math.max(EDGE_PADDING, rectangle.top - LABEL_HEIGHT - 26)
    : Math.min(containerSize.height - LABEL_HEIGHT - EDGE_PADDING, rectangle.top + rectangle.height + 26);
  const left = clamp(
    rectangle.left + rectangle.width / 2 - width / 2,
    EDGE_PADDING,
    containerSize.width - width - EDGE_PADDING,
  );

  return { height: LABEL_HEIGHT, isAbove, left, top, width };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

const styles = StyleSheet.create({
  label: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 11, 16, 0.9)',
    borderColor: colors.accent,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: LABEL_HEIGHT,
    paddingHorizontal: 10,
    position: 'absolute',
  },
  labelDot: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  labelText: {
    color: colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 15,
  },
  line: {
    backgroundColor: colors.accent,
    height: 2,
    position: 'absolute',
  },
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  pulseRing: {
    borderColor: colors.accent,
    borderRadius: radius.sm,
    borderWidth: 4,
    position: 'absolute',
  },
  rectangle: {
    borderColor: colors.accent,
    borderRadius: radius.sm,
    borderWidth: 2,
    position: 'absolute',
  },
});
