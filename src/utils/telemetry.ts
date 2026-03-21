const TRAE_DEBUG = (() => {
  const url = '/__trae_event';
  const fallbackSessionId = `dream-galaxy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    const key = '__trae_dream_galaxy_session_id__';
    const existing = localStorage.getItem(key);
    const sessionId = existing ?? fallbackSessionId;
    if (!existing) localStorage.setItem(key, sessionId);
    return { url, sessionId };
  } catch {
    return { url, sessionId: fallbackSessionId };
  }
})();

export function reportTraeDebug(event: Record<string, unknown>) {
  if (!TRAE_DEBUG.url) return;
  try {
    const payload = { sessionId: TRAE_DEBUG.sessionId, ...event };
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(TRAE_DEBUG.url, blob);
      return;
    }
    void fetch(TRAE_DEBUG.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    });
  } catch {
    return;
  }
}
