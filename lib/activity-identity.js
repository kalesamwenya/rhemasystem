const VISITOR_STORAGE_KEY = 'rhema_website_visitor';
const VISITOR_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const VISITOR_ID_TTL = 365 * 24 * 60 * 60 * 1000;

function createVisitorId() {
  if (!window.crypto?.getRandomValues) return null;
  if (typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getActivityVisitorId() {
  if (typeof window === 'undefined') return null;
  try {
    const now = Date.now();
    const stored = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (stored) {
      const visitor = JSON.parse(stored);
      if (VISITOR_ID_PATTERN.test(visitor.id)
        && Number.isFinite(visitor.createdAt)
        && now - visitor.createdAt >= 0
        && now - visitor.createdAt < VISITOR_ID_TTL) {
        return visitor.id;
      }
    }

    const visitorId = createVisitorId();
    if (!visitorId) return null;
    window.localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify({ id: visitorId, createdAt: now }));
    return visitorId;
  } catch (cause) {
    console.warn('Activity tracking is unavailable because browser storage could not be accessed.', cause);
    return null;
  }
}
