import React from 'react';
import { registerWidgetTaskHandler, requestWidgetUpdate } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MonitorWidget from './MonitorWidget';

export const WIDGET_NAME = 'MonitorWidget';
const WIDGET_DATA_KEY    = '@pingpulse_widget_data';

// ── Task handler — called by the OS to render / refresh the widget ─────────
async function widgetTaskHandler({ widgetName }) {
  if (widgetName !== WIDGET_NAME) return;

  const monitors = await loadWidgetData();
  return <MonitorWidget monitors={monitors} />;
}

export function registerWidgetTask() {
  registerWidgetTaskHandler(widgetTaskHandler);
}

// ── Called from useMonitoring whenever monitoring state changes ────────────
export async function updateWidgetData(configs, monitoring) {
  const monitors = configs
    .filter(c => monitoring[c.id]?.isRunning)
    .map(c => ({
      id:           c.id,
      name:         c.name,
      isOnline:     monitoring[c.id]?.status?.isOnline ?? null,
      responseTime: monitoring[c.id]?.status?.responseTime ?? null,
    }));

  await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(monitors));
  await requestWidgetUpdate({ widgetName: WIDGET_NAME });
}

// ── Widget reads from AsyncStorage (no React state access) ────────────────
async function loadWidgetData() {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
