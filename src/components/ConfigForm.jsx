import { useEffect, useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CYAN, FREQUENCIES } from "../constants";
import { uid } from "../utils";

export default function ConfigForm({ visible, config, onSave, onClose }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [frequency, setFrequency] = useState(60000);

  useEffect(() => {
    if (visible) {
      setName(config?.name ?? "");
      setUrl(config?.url ?? "");
      setFrequency(config?.frequency ?? 60000);
    }
  }, [visible, config]);

  const canSave = name.trim() && url.trim();

  function handleSave() {
    if (!canSave) return;
    onSave({
      id: config?.id ?? uid(),
      name: name.trim(),
      url: url.trim(),
      frequency,
    });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={s.header}>
            <TouchableOpacity onPress={onClose} style={s.headerBtn}>
              <Text style={s.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.title}>
              {config ? "Edit Monitor" : "New Monitor"}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              style={s.headerBtn}
              disabled={!canSave}
            >
              <Text style={[s.save, !canSave && s.saveDisabled]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.body}>
            <Text style={s.label}>NAME</Text>
            <View style={s.inputRow}>
              <Ionicons
                name="bookmark-outline"
                size={17}
                color="#555"
                style={s.icon}
              />
              <TextInput
                style={s.input}
                placeholder="e.g., Production API"
                placeholderTextColor="#555"
                value={name}
                onChangeText={setName}
              />
            </View>

            <Text style={s.label}>URL</Text>
            <View style={s.inputRow}>
              <Ionicons
                name="link-outline"
                size={17}
                color="#555"
                style={s.icon}
              />
              <TextInput
                style={s.input}
                placeholder="https://api.example.com/health"
                placeholderTextColor="#555"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <Text style={s.label}>FREQUENCY</Text>
            <View style={s.freqRow}>
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[s.freqBtn, frequency === f.value && s.freqBtnActive]}
                  onPress={() => setFrequency(f.value)}
                >
                  <Text
                    style={[
                      s.freqLabel,
                      frequency === f.value && s.freqLabelActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#111" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
  },
  headerBtn: { minWidth: 60 },
  title: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancel: { color: "#666", fontSize: 15 },
  save: { color: CYAN, fontSize: 15, fontWeight: "700", textAlign: "right" },
  saveDisabled: { color: "#333" },
  body: { padding: 20, paddingBottom: 40 },

  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1c",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#222",
  },
  icon: { marginRight: 8 },
  input: { flex: 1, color: "#ccc", fontSize: 14, paddingVertical: 12 },

  freqRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  freqBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  freqBtnActive: { backgroundColor: CYAN, borderColor: CYAN },
  freqLabel: { color: "#555", fontSize: 11, fontWeight: "700" },
  freqLabelActive: { color: "#000" },
});
