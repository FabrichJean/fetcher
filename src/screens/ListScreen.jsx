import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ConfigCard from '../components/ConfigCard';
import { useMonitoringContext } from '../context/MonitoringContext';
import { BG, GREEN } from '../constants';

export default function ListScreen() {
  const navigation = useNavigation();
  const { configs, monitoring, openAdd, openEdit, deleteConfig, launch, stop } = useMonitoringContext();

  const runningCount = Object.values(monitoring).filter(m => m.isRunning).length;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />

      <View style={s.header}>
        <Text style={s.title}>PingPulse</Text>
        {runningCount > 0 && (
          <View style={s.pill}>
            <View style={s.pillDot} />
            <Text style={s.pillText}>{runningCount} running</Text>
          </View>
        )}
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {configs.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="pulse-outline" size={52} color="#222" />
          <Text style={s.emptyTitle}>No monitors yet</Text>
          <Text style={s.emptySub}>Tap + to add your first configuration</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={openAdd}>
            <Text style={s.emptyBtnText}>Add Monitor</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={configs}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <ConfigCard
              config={item}
              monState={monitoring[item.id]}
              onLaunch={() => launch(item)}
              onStop={() => stop(item.id)}
              onEdit={() => openEdit(item)}
              onDelete={() => deleteConfig(item.id)}
              onViewDetail={() => navigation.navigate('Detail', { configId: item.id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: BG },
  list:  { padding: 16, paddingBottom: 40 },

  header:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#111' },
  title:    { fontSize: 20, fontWeight: '800', color: '#fff', flex: 1 },
  pill:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d2010', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginRight: 10 },
  pillDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN, marginRight: 6 },
  pillText: { color: GREEN, fontSize: 11, fontWeight: '700' },
  addBtn:   { width: 34, height: 34, borderRadius: 17, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },

  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle:   { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  emptySub:     { color: '#444', fontSize: 13, textAlign: 'center', marginBottom: 24 },
  emptyBtn:     { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
});
