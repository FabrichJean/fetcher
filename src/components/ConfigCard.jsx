import { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActionSheet } from '@expo/react-native-action-sheet';
import LatencyChart from './LatencyChart';
import { CARD, GREEN, RED } from '../constants';
import { freqLabel, relativeTime } from '../utils';

export default function ConfigCard({ config, monState, onLaunch, onStop, onEdit, onDelete, onViewDetail }) {
  const [expanded, setExpanded] = useState(false);
  const { width } = useWindowDimensions();
  const { showActionSheetWithOptions } = useActionSheet();
  const chartWidth   = width - 32 - 32 - 16;
  const lastTapRef   = useRef(0);
  const tapTimerRef  = useRef(null);

  const isRunning  = monState?.isRunning ?? false;
  const status     = monState?.status;
  const latency    = monState?.latencyData ?? [];
  const lastPingTs = monState?.lastPingTs;
  const dotColor   = !isRunning ? '#333' : status?.isOnline ? GREEN : RED;

  function showMenu() {
    const toggleLabel = isRunning ? 'Stop' : 'Launch';
    const options     = ['View Details', 'Edit', toggleLabel, 'Delete', 'Cancel'];

    showActionSheetWithOptions(
      {
        title: config.name,
        options,
        cancelButtonIndex:      4,
        destructiveButtonIndex: 3,
        userInterfaceStyle:     'dark',
      },
      index => {
        if (index === 0) onViewDetail();
        if (index === 1) onEdit();
        if (index === 2) isRunning ? onStop() : onLaunch();
        if (index === 3) onDelete();
      },
    );
  }

  return (
    <View style={s.card}>

      <TouchableOpacity
        style={s.row}
        onPress={() => {
          const now = Date.now();
          if (now - lastTapRef.current < 300) {
            lastTapRef.current = 0;
            clearTimeout(tapTimerRef.current);
            showMenu();
          } else {
            lastTapRef.current = now;
            tapTimerRef.current = setTimeout(() => setExpanded(e => !e), 280);
          }
        }}
        onLongPress={showMenu}
        delayLongPress={350}
        activeOpacity={0.7}
      >
        <View style={[s.dot, { backgroundColor: dotColor }]} />
        <View style={s.meta}>
          <Text style={s.name}>{config.name}</Text>
          <Text style={s.url} numberOfLines={1}>{config.url}</Text>
        </View>
        {isRunning && status && (
          <View style={[s.badge, status.isOnline ? s.badgeGreen : s.badgeRed]}>
            <Text style={[s.badgeText, { color: status.isOnline ? GREEN : RED }]}>
              {status.isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        )}
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#444" style={{ marginLeft: 8 }} />
      </TouchableOpacity>

      {expanded && (
        <View style={s.body}>

          {status && (
            <View style={s.statusRow}>
              <View style={s.statusLeft}>
                <View style={[s.statusDot, { backgroundColor: status.isOnline ? GREEN : RED }]} />
                <Text style={[s.statusLabel, { color: status.isOnline ? GREEN : RED }]}>
                  {status.isOnline ? 'ONLINE' : 'OFFLINE'}
                </Text>
              </View>
              <View style={s.statusRight}>
                <Text style={s.stat}>Status: <Text style={s.statVal}>{status.label}</Text></Text>
                <Text style={s.stat}>Response: <Text style={s.statVal}>{status.responseTime ? `${status.responseTime}ms` : 'N/A'}</Text></Text>
                <Text style={s.stat}>Last Check: <Text style={s.statVal}>{relativeTime(lastPingTs)}</Text></Text>
              </View>
            </View>
          )}

          {latency.length >= 2 && (
            <>
              <Text style={s.sectionLabel}>LATENCY</Text>
              <LatencyChart data={latency} width={chartWidth} />
              <View style={s.xAxis}>
                <Text style={s.axisLabel}>oldest</Text>
                <Text style={s.axisLabel}>now</Text>
              </View>
            </>
          )}

          <View style={s.divider} />

          <Text style={s.info}>
            Freq: <Text style={s.infoVal}>{freqLabel(config.frequency)}</Text>
            {'   '}
            <Text style={s.hint}>Hold to see actions</Text>
          </Text>

        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: CARD, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },

  row:  { flexDirection: 'row', alignItems: 'center', padding: 14 },
  dot:  { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  meta: { flex: 1 },
  name: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  url:  { color: '#555', fontSize: 12 },

  badge:      { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  badgeGreen: { backgroundColor: '#0d2010' },
  badgeRed:   { backgroundColor: '#2a0808' },
  badgeText:  { fontSize: 10, fontWeight: '800' },

  body:    { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: '#1e1e1e', marginVertical: 12 },

  statusRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusLeft:  { alignItems: 'center', width: 68, marginRight: 14 },
  statusDot:   { width: 14, height: 14, borderRadius: 7, marginBottom: 6 },
  statusLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  statusRight: { flex: 1 },
  stat:        { fontSize: 12, color: '#555', marginBottom: 4 },
  statVal:     { color: '#bbb', fontWeight: '600' },

  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 1.2, marginTop: 14, marginBottom: 6 },
  xAxis:        { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisLabel:    { fontSize: 10, color: '#333' },

  info:    { fontSize: 12, color: '#444' },
  infoVal: { color: '#777', fontWeight: '600' },
  hint:    { color: '#2a2a2a', fontSize: 11, fontStyle: 'italic' },
});
