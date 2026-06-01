import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Colors (must be hex strings — no constants import in widget context)
const BG       = '#111418';
const CARD     = '#1a1d27';
const GREEN    = '#00e676';
const RED      = '#ff1744';
const MUTED    = '#444';
const WHITE    = '#ffffff';
const SUBTEXT  = '#888';

function StatusDot({ isOnline }) {
  return (
    <FlexWidget
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: isOnline ? GREEN : RED,
        marginRight: 6,
      }}
    />
  );
}

function MonitorRow({ monitor }) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
      }}
    >
      <StatusDot isOnline={monitor.isOnline} />
      <TextWidget
        text={monitor.name}
        style={{ color: WHITE, fontSize: 12, fontWeight: '600', flex: 1 }}
        maxLines={1}
      />
      <TextWidget
        text={monitor.responseTime ? `${monitor.responseTime}ms` : '–'}
        style={{ color: SUBTEXT, fontSize: 11 }}
      />
    </FlexWidget>
  );
}

export default function MonitorWidget({ monitors = [] }) {
  const online  = monitors.filter(m => m.isOnline).length;
  const offline = monitors.filter(m => !m.isOnline).length;

  return (
    <FlexWidget
      style={{
        flex: 1,
        backgroundColor: BG,
        borderRadius: 16,
        padding: 14,
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <TextWidget
          text="PingPulse"
          style={{ color: WHITE, fontSize: 13, fontWeight: '800', flex: 1 }}
        />
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {online > 0 && (
            <TextWidget
              text={`${online} ↑`}
              style={{ color: GREEN, fontSize: 11, fontWeight: '700' }}
            />
          )}
          {offline > 0 && (
            <TextWidget
              text={`${offline} ↓`}
              style={{ color: RED, fontSize: 11, fontWeight: '700' }}
            />
          )}
        </FlexWidget>
      </FlexWidget>

      {/* Monitor rows */}
      {monitors.length === 0 ? (
        <TextWidget
          text="No active monitors"
          style={{ color: MUTED, fontSize: 12 }}
        />
      ) : (
        monitors.slice(0, 4).map(m => (
          <MonitorRow key={m.id} monitor={m} />
        ))
      )}

      {monitors.length > 4 && (
        <TextWidget
          text={`+${monitors.length - 4} more`}
          style={{ color: MUTED, fontSize: 10, marginTop: 4 }}
        />
      )}
    </FlexWidget>
  );
}
