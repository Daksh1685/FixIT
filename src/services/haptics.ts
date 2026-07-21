import * as Haptics from 'expo-haptics';

function ignoreUnavailableHaptics(promise: Promise<void>) {
  void promise.catch(() => undefined);
}

export function selectionHaptic() {
  ignoreUnavailableHaptics(Haptics.selectionAsync());
}

export function lightImpactHaptic() {
  ignoreUnavailableHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function mediumImpactHaptic() {
  ignoreUnavailableHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function successHaptic() {
  ignoreUnavailableHaptics(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warningHaptic() {
  ignoreUnavailableHaptics(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function errorHaptic() {
  ignoreUnavailableHaptics(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
