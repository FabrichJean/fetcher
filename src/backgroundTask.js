import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEY, RUNNING_KEY } from './constants';
import { sendDownNotification } from './notifications';

export const TASK_ID = 'pingpulse-monitor';

// ─── Must be defined at module level (before App mounts) ──────────────────────
TaskManager.defineTask(TASK_ID, async () => {
  try {
    const [rawConfigs, rawRunning] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(RUNNING_KEY),
    ]);

    const configs    = rawConfigs  ? JSON.parse(rawConfigs)  : [];
    const runningIds = rawRunning  ? JSON.parse(rawRunning)  : [];
    const active     = configs.filter(c => runningIds.includes(c.id));

    if (active.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

    await Promise.all(active.map(pingInBackground));
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

async function pingInBackground(config) {
  const controller    = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(config.url, {
      method: config.method ?? 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutHandle);
    if (!res.ok) sendDownNotification(config, `${res.status} ${res.statusText || 'Error'}`);
  } catch (err) {
    clearTimeout(timeoutHandle);
    const label = err.name === 'AbortError' ? 'Timeout' : classifyBgError(err);
    sendDownNotification(config, label);
  }
}

function classifyBgError(err) {
  const msg = (err.message ?? '').toLowerCase();
  if (msg.includes('getaddrinfo') || msg.includes('unable to resolve') || msg.includes('enotfound')) return 'DNS Error';
  if (msg.includes('ssl') || msg.includes('certificate')) return 'SSL Error';
  return 'Offline';
}

// ─── Registration helpers ──────────────────────────────────────────────────────

export async function registerBackgroundTask(minimumIntervalSeconds = 15 * 60) {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) return;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_ID);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(TASK_ID, {
        minimumInterval: minimumIntervalSeconds,
        stopOnTerminate: false, // Android: keep alive after app kill
        startOnBoot:     true,  // Android: restart on device reboot
      });
    }
  } catch {}
}

export async function unregisterBackgroundTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_ID);
    if (isRegistered) await BackgroundFetch.unregisterTaskAsync(TASK_ID);
  } catch {}
}

// ─── Persistent foreground notification (Android only) ───────────────────────
// A "sticky" notification keeps the OS from killing the JS thread.
let persistentNotifId = null;

export async function showPersistentNotification(runningCount) {
  if (Platform.OS !== 'android') return;
  let N = null;
  try { N = require('expo-notifications'); } catch { return; }

  try {
    if (persistentNotifId) {
      await N.dismissNotificationAsync(persistentNotifId).catch(() => {});
    }
    persistentNotifId = await N.scheduleNotificationAsync({
      content: {
        title:    `PingPulse — ${runningCount} monitor${runningCount > 1 ? 's' : ''} active`,
        body:     'Tap to open the app.',
        sticky:   true,
        priority: 'low',
        color:    '#00e676',
        channelId:'monitor-persistent',
        ongoing:  true,
      },
      trigger: null,
    });
  } catch {}
}

export async function dismissPersistentNotification() {
  if (Platform.OS !== 'android' || !persistentNotifId) return;
  let N = null;
  try { N = require('expo-notifications'); } catch { return; }
  try {
    await N.dismissNotificationAsync(persistentNotifId);
    persistentNotifId = null;
  } catch {}
}
