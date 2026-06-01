import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LatencyChart from '../components/LatencyChart';
import { useMonitoringContext } from '../context/MonitoringContext';
import { BG, CARD, CYAN, GREEN, RED } from '../constants';
import { freqLabel, relativeTime } from '../utils';

const ERROR_META = {
  dns:     { icon: 'globe-outline',       color: '#ff9800', label: 'DNS Error'   },
  timeout: { icon: 'hourglass-outline',   color: '#ff9800', label: 'Timeout'     },
  ssl:     { icon: 'lock-open-outline',   color: '#ff5722', label: 'SSL Error'   },
  anomaly: { icon: 'search-outline',      color: '#ffab00', label: 'Anomaly'     },
  http:    { icon: 'alert-circle-outline',color: RED,       label: 'HTTP Error'  },
  unknown: { icon: 'wifi-outline',        color: RED,       label: 'Unreachable' },
};

function ErrorBadge({ errorType }) {
  if (!errorType) return null;
  const meta = ERROR_META[errorType] ?? ERROR_META.unknown;
  return (
    <View style={[eb.badge, { borderColor: meta.color + '44', backgroundColor: meta.color + '18' }]}>
      <Ionicons name={meta.icon} size={11} color={meta.color} style={{ marginRight: 4 }} />
      <Text style={[eb.label, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}
const eb = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 4, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 },
  label: { fontSize: 10, fontWeight: '700' },
});

function LogIcon({ entry }) {
  if (entry.isOnline) return <Ionicons name="checkmark-circle" size={14} color={GREEN} style={{ marginRight: 8 }} />;
  const meta = ERROR_META[entry.errorType] ?? ERROR_META.unknown;
  return <Ionicons name={meta.icon} size={14} color={meta.color} style={{ marginRight: 8 }} />;
}

export default function DetailScreen() {
  const navigation = useNavigation();
  const { params: { configId } } = useRoute();
  const { width } = useWindowDimensions();
  const chartWidth = width - 32;

  const { configs, monitoring, launch, stop, deleteConfig, openEdit } = useMonitoringContext();
  const config   = configs.find(c => c.id === configId);
  const monState = monitoring[configId];

  if (!config) { navigation.goBack(); return null; }

  const isRunning     = monState?.isRunning ?? false;
  const status        = monState?.status;
  const latency       = monState?.latencyData ?? [];
  const history       = monState?.history ?? [];
  const lastPingTs    = monState?.lastPingTs;

  const successPings  = history.filter(h => h.isOnline);
  const responseTimes = history.map(h => h.responseTime).filter(Boolean);
  const uptimePct     = history.length ? Math.round((successPings.length / history.length) * 100) : null;
  const avgResponse   = responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null;
  const minResponse   = responseTimes.length ? Math.min(...responseTimes) : null;
  const maxResponse   = responseTimes.length ? Math.max(...responseTimes) : null;

  function uptimeColor(pct) {
    if (pct >= 99) return GREEN;
    if (pct >= 90) return '#ffab00';
    return RED;
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerMeta}>
          <Text style={s.headerTitle} numberOfLines={1}>{config.name}</Text>
          <Text style={s.headerUrl} numberOfLines={1}>{config.url}</Text>
        </View>
        {isRunning ? (
          <TouchableOpacity style={s.stopBtn} onPress={() => stop(configId)}>
            <Ionicons name="stop-circle-outline" size={15} color="#000" style={{ marginRight: 5 }} />
            <Text style={s.stopText}>Stop</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.launchBtn} onPress={() => launch(config)}>
            <Ionicons name="play-circle-outline" size={15} color="#000" style={{ marginRight: 5 }} />
            <Text style={s.launchText}>Launch</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* Current status */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>CURRENT STATUS</Text>
          {status ? (
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
                {!status.isOnline && <ErrorBadge errorType={status.errorType} />}
              </View>
            </View>
          ) : (
            <Text style={s.hint}>Monitor not started yet.</Text>
          )}
        </View>

        {/* Statistics */}
        {history.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>STATISTICS</Text>
            <View style={s.statsGrid}>
              <View style={s.statBox}>
                <Text style={s.statBoxVal}>{history.length}</Text>
                <Text style={s.statBoxKey}>Total Pings</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statBoxVal, { color: uptimeColor(uptimePct) }]}>{uptimePct}%</Text>
                <Text style={s.statBoxKey}>Uptime</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statBoxVal}>{avgResponse != null ? `${avgResponse}ms` : '–'}</Text>
                <Text style={s.statBoxKey}>Avg Response</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statBoxVal, { color: GREEN }]}>{minResponse != null ? `${minResponse}ms` : '–'}</Text>
                <Text style={s.statBoxKey}>Best</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statBoxVal, { color: RED }]}>{maxResponse != null ? `${maxResponse}ms` : '–'}</Text>
                <Text style={s.statBoxKey}>Worst</Text>
              </View>
            </View>
          </View>
        )}

        {/* Latency chart */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>LATENCY CHART</Text>
          <LatencyChart data={latency} width={chartWidth} height={100} />
          <View style={s.xAxis}>
            <Text style={s.axisLabel}>oldest</Text>
            <Text style={s.axisLabel}>now</Text>
          </View>
        </View>

        {/* Ping log */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>
            PING LOG{'  '}<Text style={{ color: '#333', fontWeight: '400' }}>{history.length} entries</Text>
          </Text>
          {history.length === 0 ? (
            <Text style={s.hint}>No pings recorded yet.</Text>
          ) : (
            [...history].reverse().map(entry => (
              <View key={entry.id} style={s.logRow}>
                <LogIcon entry={entry} />
                <Text style={s.logTime}>{entry.timestamp}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.logLabel, !entry.isOnline && { color: entry.errorType === 'anomaly' ? '#ffab00' : RED }]}>
                    {entry.label}{entry.responseTime ? `  ${entry.responseTime}ms` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Configuration */}
        <View style={s.card}>
          <View style={s.configHeader}>
            <Text style={s.sectionLabel}>CONFIGURATION</Text>
            <TouchableOpacity onPress={() => openEdit(config)} style={s.editLink}>
              <Ionicons name="pencil-outline" size={13} color={CYAN} />
              <Text style={s.editLinkText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={s.configRow}>
            <Text style={s.configKey}>URL</Text>
            <Text style={s.configVal}>{config.url}</Text>
          </View>
          <View style={s.configRow}>
            <Text style={s.configKey}>Frequency</Text>
            <Text style={s.configVal}>{freqLabel(config.frequency)}</Text>
          </View>
          <View style={s.configRow}>
            <Text style={s.configKey}>Method</Text>
            <Text style={[s.configVal, { color: CYAN, fontWeight: '700' }]}>{config.method ?? 'GET'}</Text>
          </View>
          {config.keyword ? (
            <View style={s.configRow}>
              <Text style={s.configKey}>Keyword</Text>
              <Text style={s.configVal}>"{config.keyword}"</Text>
            </View>
          ) : null}
          <TouchableOpacity style={s.deleteBtn} onPress={() => { deleteConfig(configId); navigation.goBack(); }}>
            <Ionicons name="trash-outline" size={15} color={RED} style={{ marginRight: 6 }} />
            <Text style={s.deleteBtnText}>Delete Monitor</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 48 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  backBtn:     { marginRight: 12 },
  headerMeta:  { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerUrl:   { color: '#444', fontSize: 11, marginTop: 1 },
  launchBtn:   { flexDirection: 'row', alignItems: 'center', backgroundColor: GREEN, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 14 },
  launchText:  { color: '#000', fontWeight: '800', fontSize: 12 },
  stopBtn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: RED, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 14 },
  stopText:    { color: '#000', fontWeight: '800', fontSize: 12 },

  card:         { backgroundColor: CARD, borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 1.2, marginBottom: 14 },
  hint:         { color: '#333', fontSize: 13, paddingVertical: 4 },

  statusRow:   { flexDirection: 'row', alignItems: 'flex-start' },
  statusLeft:  { alignItems: 'center', width: 68, marginRight: 14, paddingTop: 2 },
  statusDot:   { width: 14, height: 14, borderRadius: 7, marginBottom: 6 },
  statusLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  statusRight: { flex: 1 },
  stat:        { fontSize: 12, color: '#555', marginBottom: 4 },
  statVal:     { color: '#bbb', fontWeight: '600' },

  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox:    { flex: 1, minWidth: '28%', backgroundColor: '#1c1c1c', borderRadius: 8, padding: 12, alignItems: 'center' },
  statBoxVal: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  statBoxKey: { color: '#444', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },

  xAxis:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisLabel: { fontSize: 10, color: '#333' },

  logRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1c1c1c' },
  logTime:  { color: '#555', fontSize: 12, marginRight: 8, width: 72 },
  logLabel: { color: '#888', fontSize: 12 },

  configHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  editLink:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editLinkText:  { color: CYAN, fontSize: 12, fontWeight: '600' },
  configRow:     { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#1c1c1c' },
  configKey:     { color: '#444', fontSize: 13, width: 90 },
  configVal:     { color: '#bbb', fontSize: 13, flex: 1 },
  deleteBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#2a0808', backgroundColor: '#1a0505' },
  deleteBtnText: { color: RED, fontWeight: '700', fontSize: 13 },
});
