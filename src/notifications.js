import { Platform } from 'react-native';

// expo-notifications is not available in Expo Go SDK 53+.
// We load it dynamically so the app still runs in Expo Go (without notifications).
let N = null;
try {
  N = require('expo-notifications');
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge:  true,
    }),
  });
} catch {}

export async function setupNotifications() {
  if (!N) return false;
  try {
    const { status } = await N.requestPermissionsAsync();
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('monitor-alerts', {
        name:             'Monitor Alerts',
        importance:       N.AndroidImportance.MAX,
        sound:            'default',
        vibrationPattern: [0, 400, 200, 400, 200, 400],
        enableLights:     true,
        lightColor:       '#ff1744',
        lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
        bypassDnd:        true,
      });
    }
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function sendDownNotification(config, label) {
  if (!N) return;
  try {
    await N.scheduleNotificationAsync({
      content: {
        title:    `🚨 DOWN — ${config.name}`,
        body:     `${label}\n${config.url}`,
        sound:    true,
        priority: 'max',
        color:    '#ff1744',
        ...(Platform.OS === 'android' && { channelId: 'monitor-alerts' }),
      },
      trigger: null,
    });
  } catch {}
}
