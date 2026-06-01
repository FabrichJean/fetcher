import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LatencyChart from './LatencyChart';
import { CARD, CYAN, GREEN, RED } from '../constants';
import { freqLabel, relativeTime } from '../utils';

const MENU_WIDTH = 210;

function MenuItem({ icon, label, color = '#ccc', onPress }) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.6}>
      <Ionicons name={icon} size={16} color={color} style={s.menuIcon} />
      <Text style={[s.menuLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MenuDivider() {
  return <View style={s.menuDivider} />;
}

export default function ConfigCard({ config, monState, onLaunch, onStop, onEdit, onDelete, onViewDetail }) {
  const [expanded, setExpanded]     = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos]       = useState({ top: 0, right: 0 });

  const { width } = useWindowDimensions();
  const chartWidth  = width - 32 - 32 - 16;
  const rowRef      = useRef(null);
  const lastTapRef  = useRef(0);
  const tapTimerRef = useRef(null);
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(-6)).current;

  const isRunning  = monState?.isRunning ?? false;
  const status     = monState?.status;
  const latency    = monState?.latencyData ?? [];
  const lastPingTs = monState?.lastPingTs;
  const dotColor   = !isRunning ? '#333' : status?.isOnline ? GREEN : RED;

  function openMenu() {
    rowRef.current?.measure((_, __, w, h, pageX, pageY) => {
      const screenW = Dimensions.get('window').width;
      setMenuPos({
        top:   pageY + h + 4,
        right: screenW - pageX - w,
      });
      setMenuVisible(true);
      slideAnim.setValue(-6);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
      ]).start();
    });
  }

  function closeMenu(fn) {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -6, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setMenuVisible(false);
      fn?.();
    });
  }

  function handlePress() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      clearTimeout(tapTimerRef.current);
      openMenu();
    } else {
      lastTapRef.current = now;
      tapTimerRef.current = setTimeout(() => setExpanded(e => !e), 280);
    }
  }

  return (
    <View style={s.card}>

      <TouchableOpacity
        ref={rowRef}
        style={s.row}
        onPress={handlePress}
        onLongPress={openMenu}
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

      {/* Expanded preview */}
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
          <Text style={s.info}>Freq: <Text style={s.infoVal}>{freqLabel(config.frequency)}</Text></Text>
        </View>
      )}

      {/* Dropdown menu */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={() => closeMenu()}>
        <TouchableWithoutFeedback onPress={() => closeMenu()}>
          <View style={s.backdrop}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  s.menu,
                  { top: menuPos.top, right: menuPos.right },
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                ]}
              >
                <MenuItem icon="eye-outline" label={`See ${config.name}`} color={CYAN} onPress={() => closeMenu(onViewDetail)} />
                <MenuItem icon="pencil-outline"    label="Edit"         color="#aaa"  onPress={() => closeMenu(onEdit)} />
                <MenuDivider />
                <MenuItem
                  icon={isRunning ? 'stop-circle-outline' : 'play-circle-outline'}
                  label={isRunning ? 'Stop' : 'Launch'}
                  color={isRunning ? RED : GREEN}
                  onPress={() => closeMenu(isRunning ? onStop : onLaunch)}
                />
                <MenuDivider />
                <MenuItem icon="trash-outline" label="Delete" color={RED} onPress={() => closeMenu(onDelete)} />
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
  info:         { fontSize: 12, color: '#444' },
  infoVal:      { color: '#777', fontWeight: '600' },

  // Dropdown
  backdrop: { flex: 1 },
  menu: {
    position:        'absolute',
    width:           MENU_WIDTH,
    backgroundColor: '#1e1e1e',
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     '#2a2a2a',
    paddingVertical: 4,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.5,
    shadowRadius:    16,
    elevation:       12,
  },
  menuItem:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  menuIcon:    { marginRight: 10 },
  menuLabel:   { fontSize: 14, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: '#2a2a2a', marginHorizontal: 0 },
});
