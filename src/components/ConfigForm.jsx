import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CYAN, FREQUENCIES } from '../constants';
import { uid } from '../utils';

const METHODS = [
  { value: 'HEAD', label: 'HEAD', desc: 'Lightweight · headers only' },
  { value: 'GET',  label: 'GET',  desc: 'Full response · enables keyword' },
];

export default function ConfigForm({ visible, config, onSave, onClose }) {
  const [name, setName]       = useState('');
  const [url, setUrl]         = useState('');
  const [frequency, setFreq]  = useState(60000);
  const [method, setMethod]   = useState('GET');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (visible) {
      setName(config?.name     ?? '');
      setUrl(config?.url       ?? '');
      setFreq(config?.frequency ?? 60000);
      setMethod(config?.method  ?? 'GET');
      setKeyword(config?.keyword ?? '');
    }
  }, [visible, config]);

  const canSave = name.trim() && url.trim();

  function handleSave() {
    if (!canSave) return;
    onSave({
      id:        config?.id ?? uid(),
      name:      name.trim(),
      url:       url.trim(),
      frequency: frequency,
      method,
      keyword:   keyword.trim(),
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

          <View style={s.header}>
            <TouchableOpacity onPress={onClose} style={s.headerBtn}>
              <Text style={s.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.title}>{config ? 'Edit Monitor' : 'New Monitor'}</Text>
            <TouchableOpacity onPress={handleSave} style={s.headerBtn} disabled={!canSave}>
              <Text style={[s.save, !canSave && s.saveDisabled]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.body}>

            {/* Name */}
            <Text style={s.label}>NAME</Text>
            <View style={s.inputRow}>
              <Ionicons name="bookmark-outline" size={17} color="#555" style={s.icon} />
              <TextInput style={s.input} placeholder="e.g., Production API"
                placeholderTextColor="#555" value={name} onChangeText={setName} />
            </View>

            {/* URL */}
            <Text style={s.label}>URL</Text>
            <View style={s.inputRow}>
              <Ionicons name="link-outline" size={17} color="#555" style={s.icon} />
              <TextInput style={s.input} placeholder="https://api.example.com/health"
                placeholderTextColor="#555" value={url} onChangeText={setUrl}
                autoCapitalize="none" keyboardType="url" />
            </View>

            {/* Frequency */}
            <Text style={s.label}>FREQUENCY</Text>
            <View style={s.freqRow}>
              {FREQUENCIES.map(f => (
                <TouchableOpacity key={f.value}
                  style={[s.freqBtn, frequency === f.value && s.freqBtnActive]}
                  onPress={() => setFreq(f.value)}>
                  <Text style={[s.freqLabel, frequency === f.value && s.freqLabelActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* HTTP Method */}
            <Text style={s.label}>HTTP METHOD</Text>
            <View style={s.methodRow}>
              {METHODS.map(m => (
                <TouchableOpacity key={m.value}
                  style={[s.methodBtn, method === m.value && s.methodBtnActive]}
                  onPress={() => setMethod(m.value)}>
                  <Text style={[s.methodLabel, method === m.value && s.methodLabelActive]}>{m.label}</Text>
                  <Text style={[s.methodDesc,  method === m.value && s.methodDescActive]}>{m.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Keyword */}
            <View style={s.labelRow}>
              <Text style={s.label}>KEYWORD CHECK</Text>
              <Text style={s.optional}>optional · GET only</Text>
            </View>
            <View style={s.inputRow}>
              <Ionicons name="search-outline" size={17} color="#555" style={s.icon} />
              <TextInput style={s.input} placeholder='e.g. "ok" or "Dashboard"'
                placeholderTextColor="#555" value={keyword} onChangeText={setKeyword} />
            </View>
            {keyword.trim() !== '' && method === 'HEAD' && (
              <View style={s.warning}>
                <Ionicons name="warning-outline" size={13} color="#ffab00" />
                <Text style={s.warningText}>Switch to GET to enable keyword matching</Text>
              </View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#111' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  headerBtn:    { minWidth: 60 },
  title:        { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancel:       { color: '#666', fontSize: 15 },
  save:         { color: CYAN, fontSize: 15, fontWeight: '700', textAlign: 'right' },
  saveDisabled: { color: '#333' },
  body:         { padding: 20, paddingBottom: 40 },

  label:    { fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 1.2, marginBottom: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  optional: { fontSize: 10, color: '#333', fontStyle: 'italic' },

  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1c', borderRadius: 8, paddingHorizontal: 12, marginBottom: 18, borderWidth: 1, borderColor: '#222' },
  icon:     { marginRight: 8 },
  input:    { flex: 1, color: '#ccc', fontSize: 14, paddingVertical: 12 },

  freqRow:         { flexDirection: 'row', gap: 8, marginBottom: 20 },
  freqBtn:         { flex: 1, paddingVertical: 9, borderRadius: 6, backgroundColor: '#1c1c1c', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  freqBtnActive:   { backgroundColor: CYAN, borderColor: CYAN },
  freqLabel:       { color: '#555', fontSize: 11, fontWeight: '700' },
  freqLabelActive: { color: '#000' },

  methodRow:         { flexDirection: 'row', gap: 10, marginBottom: 20 },
  methodBtn:         { flex: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#222' },
  methodBtnActive:   { backgroundColor: '#0d1f1f', borderColor: CYAN },
  methodLabel:       { color: '#555', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  methodLabelActive: { color: CYAN },
  methodDesc:        { color: '#333', fontSize: 10 },
  methodDescActive:  { color: '#2a6b6b' },

  warning:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -10, marginBottom: 14, paddingHorizontal: 4 },
  warningText: { color: '#ffab00', fontSize: 11 },
});
