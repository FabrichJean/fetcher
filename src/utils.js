import { FREQUENCIES, TELEGRAM_BOT_TOKEN } from './constants';

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function relativeTime(ts) {
  if (!ts) return '–';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return '< 1 min';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function freqLabel(val) {
  return FREQUENCIES.find(f => f.value === val)?.label ?? '–';
}

export async function sendTelegramAlert(config, message) {
  if (!TELEGRAM_BOT_TOKEN || !config.tgContact) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: config.tgContact, text: message }),
    });
  } catch {}
}
