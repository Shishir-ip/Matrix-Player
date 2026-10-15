/**
 * Nothing OS style subtle haptic feedback
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'double' | 'tick' = 'light') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    switch (type) {
      case 'tick':
        navigator.vibrate(8);
        break;
      case 'light':
        navigator.vibrate(14);
        break;
      case 'medium':
        navigator.vibrate(28);
        break;
      case 'double':
        navigator.vibrate([12, 40, 12]);
        break;
      case 'success':
        navigator.vibrate([16, 50, 24]);
        break;
    }
  } catch {
    // Ignore unsupported/blocked vibration
  }
}
