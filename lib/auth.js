const USER_KEY = 'rhema_user';
const ACCESS_TOKEN_KEY = 'rhema_access_token';
const TOKEN_EXPIRY_KEY = 'rhema_access_token_expires_at';

export function getAuthUser() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  const token = window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = Number(window.sessionStorage.getItem(TOKEN_EXPIRY_KEY));
  if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    return null;
  }
  return token;
}

export function setAuthSession(token, expiresIn) {
  if (typeof window === 'undefined') return;
  if (!/^[a-f0-9]{64}$/i.test(token) || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error('The sign-in service returned an invalid session token.');
  }
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token.toLowerCase());
  window.sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
}
