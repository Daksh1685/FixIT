import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFollowUpConversation } from '../../features/diagnosis/hooks/useFollowUpConversation';
import {
  errorHaptic,
  lightImpactHaptic,
  mediumImpactHaptic,
  successHaptic,
  warningHaptic,
} from '../../services/haptics';
import { colors, radius } from '../../theme/tokens';
import { DeviceDiagnosis, DiagnosisState } from '../../types/diagnosis';
import { ScanSource } from '../../types/scan';
import { Skeleton } from '../ui/Skeleton';
import { FollowUpConversation } from './FollowUpConversation';

type AnalysisHudProps = {
  diagnosisState: DiagnosisState;
  onResume: () => void;
  onRetry: () => void;
  source: ScanSource;
};

export function AnalysisHud({ diagnosisState, onResume, onRetry, source }: AnalysisHudProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardEntrance = useRef(new Animated.Value(0)).current;
  const detailEntrance = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(1)).current;
  const previousStatus = useRef(diagnosisState.status);
  const isReady = diagnosisState.status === 'success';
  const needsAnotherImage = diagnosisState.status === 'needs_photo';
  const diagnosis = isReady ? diagnosisState.diagnosis : null;
  const followUpConversation = useFollowUpConversation(diagnosis);

  useEffect(() => {
    setIsExpanded(false);
    cardEntrance.setValue(0);
    Animated.timing(cardEntrance, {
      duration: 280,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [cardEntrance, diagnosisState.status]);

  useEffect(() => {
    const previous = previousStatus.current;
    if (previous !== diagnosisState.status) {
      if (diagnosisState.status === 'success') {
        successScale.setValue(0.55);
        Animated.spring(successScale, {
          friction: 5,
          tension: 150,
          toValue: 1,
          useNativeDriver: true,
        }).start();
        successHaptic();
      }

      if (diagnosisState.status === 'needs_photo') {
        warningHaptic();
      }

      if (diagnosisState.status === 'error') {
        errorHaptic();
      }
    }
    previousStatus.current = diagnosisState.status;
  }, [diagnosisState.status, successScale]);

  useEffect(() => {
    detailEntrance.setValue(0);
    if (isExpanded) {
      Animated.timing(detailEntrance, {
        duration: 220,
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [detailEntrance, isExpanded]);

  const toggleDetails = () => {
    if (!isReady) {
      return;
    }

    lightImpactHaptic();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((expanded) => !expanded);
  };

  const resumeScan = () => {
    mediumImpactHaptic();
    onResume();
  };

  const retryAnalysis = () => {
    lightImpactHaptic();
    onRetry();
  };

  const sourceLabel = source === 'camera' ? 'CAPTURED FRAME' : 'PHOTO LIBRARY';
  const cardStyle = {
    opacity: cardEntrance,
    transform: [
      {
        translateY: cardEntrance.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }),
      },
    ],
  };
  const detailsStyle = {
    opacity: detailEntrance,
    transform: [
      {
        translateY: detailEntrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.card, isExpanded && styles.cardExpanded, cardStyle]}>
      <Pressable
        accessibilityHint={isReady ? 'Shows or hides the full diagnosis' : undefined}
        accessibilityLabel={isReady ? 'Toggle diagnosis details' : undefined}
        accessibilityRole={isReady ? 'button' : undefined}
        disabled={!isReady}
        onPress={toggleDetails}
        style={({ pressed }) => [styles.summary, pressed && isReady && styles.summaryPressed]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.status}>
            <View
              style={[
                styles.statusDot,
                diagnosisState.status === 'error' && styles.errorDot,
                needsAnotherImage && styles.lowConfidenceDot,
              ]}
            />
            <Text style={styles.statusText}>{sourceLabel}</Text>
          </View>
          {isReady ? (
            <Animated.View style={{ transform: [{ scale: successScale }] }}>
              <Ionicons color={colors.accent} name="checkmark-circle" size={21} />
            </Animated.View>
          ) : (
            <Ionicons color={colors.muted} name="scan-outline" size={20} />
          )}
        </View>

        <HudSummary diagnosisState={diagnosisState} />
      </Pressable>

      {isReady && isExpanded ? (
        <Animated.View style={detailsStyle}>
          <DiagnosisDetails diagnosis={diagnosisState.diagnosis} followUpConversation={followUpConversation} />
        </Animated.View>
      ) : null}

      {diagnosisState.status === 'error' ? (
        <Pressable
          accessibilityLabel="Try analysis again"
          accessibilityRole="button"
          onPress={retryAnalysis}
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
        >
          <Ionicons color={colors.ink} name="refresh-outline" size={18} />
          <Text style={styles.retryLabel}>Try again</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityHint="Returns to the live camera"
        accessibilityLabel={needsAnotherImage ? 'Capture another image' : 'Resume Scan'}
        accessibilityRole="button"
        onPress={resumeScan}
        style={({ pressed }) => [styles.resumeButton, pressed && styles.resumeButtonPressed]}
      >
        <Ionicons color={colors.background} name="camera-outline" size={19} />
        <Text style={styles.resumeLabel}>
          {needsAnotherImage ? 'Capture another image' : 'Resume Scan'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function HudSummary({ diagnosisState }: Pick<AnalysisHudProps, 'diagnosisState'>) {
  if (diagnosisState.status === 'loading' || diagnosisState.status === 'idle') {
    return (
      <View style={styles.loadingContent}>
        <View style={styles.loadingIcon}>
          <Ionicons color={colors.accent} name="scan-outline" size={21} />
        </View>
        <View style={styles.loadingText}>
          <Text style={styles.title}>Analyzing device...</Text>
          <Skeleton style={styles.loadingSkeletonLong} />
          <Skeleton style={styles.loadingSkeletonShort} />
        </View>
      </View>
    );
  }

  if (diagnosisState.status === 'error') {
    return (
      <View style={styles.errorSummary}>
        <Text style={styles.title}>Analysis unavailable</Text>
        <Text style={styles.description}>{diagnosisState.message}</Text>
      </View>
    );
  }

  if (diagnosisState.status === 'needs_photo') {
    return (
      <View>
        <Text style={styles.title}>One more photo needed</Text>
        <Text style={styles.issueLabel}>MISSING INFORMATION</Text>
        <Text style={styles.issueSummary}>{diagnosisState.request.missing_information}</Text>
        <View style={styles.photoRequest}>
          <Ionicons color={colors.accent} name="camera-outline" size={18} />
          <Text style={styles.photoRequestText}>{diagnosisState.request.suggested_photo}</Text>
        </View>
      </View>
    );
  }

  if (diagnosisState.diagnosis.finding === 'no_issue_visible') {
    return (
      <View>
        <Text style={styles.title}>No visible issue found</Text>
        <Text style={styles.issueLabel}>VISUAL CHECK</Text>
        <Text style={styles.issueSummary}>No visible fault was detected in this photo.</Text>
        <Text style={styles.expandHint}>Tap to view assessment</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.title}>Diagnosis ready</Text>
      <Text style={styles.issueLabel}>LIKELY ISSUE</Text>
      <Text style={styles.issueSummary}>{diagnosisState.diagnosis.issue}</Text>
      <Text style={styles.expandHint}>Tap to view full diagnosis</Text>
    </View>
  );
}

function DiagnosisDetails({
  diagnosis,
  followUpConversation,
}: {
  diagnosis: DeviceDiagnosis;
  followUpConversation: ReturnType<typeof useFollowUpConversation>;
}) {
  const hasVisibleIssue = diagnosis.finding === 'issue_found';

  return (
    <ScrollView
      contentContainerStyle={styles.detailsContent}
      showsVerticalScrollIndicator={false}
      style={styles.details}
    >
      <DetailSection title={hasVisibleIssue ? 'Issue' : 'Assessment'} value={diagnosis.issue} />
      <DetailSection title="Confidence" value={capitalize(diagnosis.confidence)} />
      {hasVisibleIssue ? (
        <>
          <DetailSection items={diagnosis.causes} title="Causes" />
          <DetailSection items={diagnosis.fix_steps} title="Fix Steps" />
        </>
      ) : (
        <DetailSection
          title="Recommended Next Step"
          value="No repair is recommended from this photo. If the device has a functional problem, capture its error indicator or the affected component."
        />
      )}
      <DetailSection title="Safety Note" value={diagnosis.safety_note} warning />
      <FollowUpConversation
        errorMessage={followUpConversation.errorMessage}
        isSending={followUpConversation.isSending}
        messages={followUpConversation.messages}
        onRetry={followUpConversation.retryLastQuestion}
        onSend={followUpConversation.sendQuestion}
      />
    </ScrollView>
  );
}

function DetailSection({
  items,
  title,
  value,
  warning = false,
}: {
  items?: string[];
  title: string;
  value?: string;
  warning?: boolean;
}) {
  return (
    <View style={[styles.detailSection, warning && styles.safetySection]}>
      <Text style={[styles.detailTitle, warning && styles.safetyTitle]}>{title}</Text>
      {items ? (
        items.length ? (
          <View style={styles.list}>
            {items.map((item, index) => (
              <View key={`${item}-${index}`} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.detailValue}>{item}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.detailValue}>No likely causes identified.</Text>
        )
      ) : (
        <Text style={styles.detailValue}>{value}</Text>
      )}
    </View>
  );
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

const styles = StyleSheet.create({
  bullet: {
    color: colors.accent,
    fontSize: 17,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    bottom: 32,
    elevation: 12,
    left: 16,
    padding: 20,
    position: 'absolute',
    right: 16,
    shadowColor: '#000000',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 28,
  },
  cardExpanded: {
    bottom: 20,
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  detailSection: {
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 1,
    gap: 7,
    paddingTop: 14,
  },
  detailTitle: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  detailValue: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  details: {
    marginTop: 18,
    maxHeight: 300,
  },
  detailsContent: {
    gap: 15,
    paddingBottom: 3,
  },
  errorDot: {
    backgroundColor: '#FF9A9A',
  },
  errorSummary: {
    backgroundColor: 'rgba(255, 154, 154, 0.08)',
    borderColor: 'rgba(255, 154, 154, 0.18)',
    borderRadius: radius.sm,
    borderWidth: 1,
    marginTop: 17,
    padding: 12,
  },
  expandHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    height: 4,
    marginBottom: 18,
    width: 36,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  issueLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginTop: 16,
  },
  issueSummary: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 5,
  },
  list: {
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    gap: 7,
  },
  loadingContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  loadingIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(145, 245, 178, 0.1)',
    borderColor: 'rgba(145, 245, 178, 0.2)',
    borderRadius: 18,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  loadingSkeletonLong: {
    height: 9,
    marginTop: 10,
    width: '86%',
  },
  loadingSkeletonShort: {
    height: 9,
    marginTop: 7,
    width: '58%',
  },
  loadingText: {
    flex: 1,
  },
  lowConfidenceDot: {
    backgroundColor: '#FFD166',
  },
  photoRequest: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(145, 245, 178, 0.1)',
    borderColor: 'rgba(145, 245, 178, 0.22)',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
    padding: 12,
  },
  photoRequestText: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  resumeButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    elevation: 5,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 52,
    paddingHorizontal: 18,
    shadowColor: colors.accent,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  resumeButtonPressed: {
    backgroundColor: '#B1F8C8',
    transform: [{ scale: 0.985 }],
  },
  resumeLabel: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '800',
  },
  retryButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 48,
  },
  retryButtonPressed: {
    backgroundColor: colors.cardSubtle,
  },
  retryLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  safetySection: {
    backgroundColor: 'rgba(255, 209, 102, 0.08)',
    borderColor: 'rgba(255, 209, 102, 0.26)',
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: 12,
  },
  safetyTitle: {
    color: '#FFD166',
  },
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  statusDot: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  statusText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  summary: {
    borderRadius: radius.md,
  },
  summaryPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.995 }],
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
});
