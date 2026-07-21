import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { lightImpactHaptic, selectionHaptic } from '../../services/haptics';
import { colors, radius } from '../../theme/tokens';
import { FollowUpMessage } from '../../types/diagnosis';
import { Skeleton } from '../ui/Skeleton';

type FollowUpConversationProps = {
  errorMessage: string | null;
  isSending: boolean;
  messages: FollowUpMessage[];
  onRetry: () => Promise<boolean>;
  onSend: (question: string, displayContent?: string) => Promise<boolean>;
};

type QuickAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  prompt: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: 'locate-outline',
    label: 'Show me where',
    prompt:
      'Show me where the faulty component is based on the diagnosis highlight, and explain how to identify it on the device.',
  },
  {
    icon: 'help-circle-outline',
    label: 'Why did this happen?',
    prompt: 'Why did this issue likely happen based on the diagnosis? Explain the most likely causes plainly.',
  },
  {
    icon: 'construct-outline',
    label: 'Can I fix it myself?',
    prompt:
      'Can I fix this myself? Explain the skill level, tools, risks, and when a professional repair is safer.',
  },
  {
    icon: 'cash-outline',
    label: 'Estimated repair cost',
    prompt:
      'What is a broad estimated repair cost for this issue? State the assumptions and factors that can change the price.',
  },
  {
    icon: 'shield-checkmark-outline',
    label: 'Safety precautions',
    prompt: 'What safety precautions should I take before handling or using this device?',
  },
  {
    icon: 'cube-outline',
    label: 'Replacement part',
    prompt:
      'What replacement part may be needed, and what model or compatibility details should I confirm before ordering?',
  },
];

export function FollowUpConversation({
  errorMessage,
  isSending,
  messages,
  onRetry,
  onSend,
}: FollowUpConversationProps) {
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0 && !isSending;

  const send = async () => {
    if (!canSend) {
      return;
    }

    selectionHaptic();
    const sent = await onSend(draft);
    if (sent) {
      setDraft('');
    }
  };

  const sendQuickAction = async (action: QuickAction) => {
    lightImpactHaptic();
    await onSend(action.prompt, action.label);
  };

  const retryQuestion = () => {
    lightImpactHaptic();
    void onRetry();
  };

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Ionicons color={colors.accent} name="chatbubble-ellipses-outline" size={18} />
        <Text style={styles.headingText}>FOLLOW-UP</Text>
      </View>

      <View style={styles.actions}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            accessibilityLabel={action.label}
            accessibilityRole="button"
            disabled={isSending}
            key={action.label}
            onPress={() => void sendQuickAction(action)}
            style={({ pressed }) => [
              styles.actionButton,
              isSending && styles.actionButtonDisabled,
              pressed && !isSending && styles.actionButtonPressed,
            ]}
          >
            <Ionicons color={colors.accent} name={action.icon} size={15} />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {messages.length ? (
        <View style={styles.messages}>
          {messages.map((message, index) => (
            <ConversationMessage key={`${message.role}-${index}`} message={message} />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          Choose an action or ask a question. The image will not be uploaded again.
        </Text>
      )}

      {isSending ? (
        <View style={styles.thinking}>
          <View style={styles.thinkingDot} />
          <View style={styles.thinkingContent}>
            <Text style={styles.thinkingText}>Thinking...</Text>
            <Skeleton style={styles.thinkingSkeleton} />
          </View>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable accessibilityLabel="Retry follow-up question" onPress={retryQuestion}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Ask a follow-up question"
          editable={!isSending}
          maxLength={1200}
          multiline
          onChangeText={setDraft}
          placeholder="Ask a follow-up question..."
          placeholderTextColor={colors.disabled}
          style={styles.input}
          value={draft}
        />
        <Pressable
          accessibilityLabel="Send follow-up question"
          accessibilityRole="button"
          disabled={!canSend}
          onPress={() => void send()}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
            pressed && canSend && styles.sendButtonPressed,
          ]}
        >
          <Ionicons color={colors.background} name="arrow-up" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

function ConversationMessage({ message }: { message: FollowUpMessage }) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      duration: 180,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.View
      style={[
        styles.message,
        message.role === 'user' ? styles.userMessage : styles.assistantMessage,
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }),
            },
          ],
        },
      ]}
    >
      <Text style={message.role === 'user' ? styles.userText : styles.assistantText}>
        {message.displayContent ?? message.content}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(145, 245, 178, 0.08)',
    borderColor: 'rgba(145, 245, 178, 0.24)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionButtonDisabled: {
    opacity: 0.48,
  },
  actionButtonPressed: {
    backgroundColor: 'rgba(145, 245, 178, 0.16)',
    transform: [{ scale: 0.98 }],
  },
  actionLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardSubtle,
  },
  assistantText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 8,
  },
  container: {
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 1,
    gap: 10,
    marginTop: 18,
    paddingTop: 16,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    backgroundColor: 'rgba(255, 154, 154, 0.12)',
    borderColor: 'rgba(255, 154, 154, 0.36)',
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: 6,
    padding: 10,
  },
  errorText: {
    color: '#FFD0D0',
    fontSize: 12,
    lineHeight: 17,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  headingText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    maxHeight: 82,
    minHeight: 36,
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  message: {
    borderRadius: radius.sm,
    maxWidth: '90%',
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  messages: {
    gap: 7,
  },
  retryText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sendButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  sendButtonPressed: {
    transform: [{ scale: 0.94 }],
  },
  thinking: {
    alignItems: 'center',
    backgroundColor: 'rgba(145, 245, 178, 0.06)',
    borderColor: 'rgba(145, 245, 178, 0.14)',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  thinkingContent: {
    flex: 1,
    gap: 7,
  },
  thinkingDot: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  thinkingSkeleton: {
    height: 7,
    width: '46%',
  },
  thinkingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
  },
  userText: {
    color: colors.background,
    fontSize: 13,
    lineHeight: 19,
  },
});
