import { createContext, useContext, useEffect, useState } from 'react';
import { useMonitoring } from '../hooks/useMonitoring';
import ConfigForm from '../components/ConfigForm';
import { setupNotifications } from '../notifications';

const MonitoringContext = createContext(null);

export function MonitoringProvider({ children }) {
  const { configs, monitoring, hydrated, launch, stop, saveConfig, deleteConfig } = useMonitoring();

  const [showForm, setShowForm]           = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  useEffect(() => { setupNotifications(); }, []);

  function openAdd()        { setEditingConfig(null);   setShowForm(true); }
  function openEdit(config) { setEditingConfig(config); setShowForm(true); }
  function closeForm()      { setShowForm(false); setEditingConfig(null); }

  function handleSave(config) {
    const isNew       = !configs.find(c => c.id === config.id);
    const wasRunning  = !!monitoring[config.id]?.isRunning;
    if (wasRunning) stop(config.id);
    saveConfig(config);
    closeForm();
    if (isNew || wasRunning) launch(config);
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
