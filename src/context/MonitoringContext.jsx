import { createContext, useContext, useState } from 'react';
import { useMonitoring } from '../hooks/useMonitoring';
import ConfigForm from '../components/ConfigForm';

const MonitoringContext = createContext(null);

export function MonitoringProvider({ children }) {
  const { configs, monitoring, hydrated, launch, stop, saveConfig, deleteConfig } = useMonitoring();

  const [showForm, setShowForm]           = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  function openAdd()        { setEditingConfig(null);   setShowForm(true); }
  function openEdit(config) { setEditingConfig(config); setShowForm(true); }
  function closeForm()      { setShowForm(false); setEditingConfig(null); }

  function handleSave(config) {
    saveConfig(config);
    closeForm();
  }

  return (
    <MonitoringContext.Provider value={{ configs, monitoring, hydrated, launch, stop, deleteConfig, openAdd, openEdit }}>
      {children}
      <ConfigForm visible={showForm} config={editingConfig} onSave={handleSave} onClose={closeForm} />
    </MonitoringContext.Provider>
  );
}

export function useMonitoringContext() {
  return useContext(MonitoringContext);
}
