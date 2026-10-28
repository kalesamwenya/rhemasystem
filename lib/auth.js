const USER_KEY = 'rhema_user';
const ROLE_TOKEN_KEYS = {
  student: ['rhema_student_access_token', 'rhema_student_access_token_expires_at'],
  lecturer: ['rhema_lecturer_access_token', 'rhema_lecturer_access_token_expires_at'],
  admin: ['rhema_admin_access_token', 'rhema_admin_access_token_expires_at'],
};

export function getAuthUser() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function getAuthToken(role = getAuthUser()?.role) {
  if (typeof window === 'undefined') return null;
  const keys = ROLE_TOKEN_KEYS[role];
  if (!keys) return null;
  const [tokenKey, expiryKey] = keys;
  const token = window.sessionStorage.getItem(tokenKey);
  const expiresAt = Number(window.sessionStorage.getItem(expiryKey));
  if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    window.sessionStorage.removeItem(tokenKey);
    window.sessionStorage.removeItem(expiryKey);
    return null;
  }
  return token;
}

export function setAuthSession(token, expiresIn, role) {
  if (typeof window === 'undefined') return;
  const keys = ROLE_TOKEN_KEYS[role];
  if (!keys || !/^[a-f0-9]{64}$/i.test(token) || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error('The sign-in service returned an invalid session token.');
  }
  clearAuthSession();
  window.sessionStorage.setItem(keys[0], token.toLowerCase());
  window.sessionStorage.setItem(keys[1], String(Date.now() + expiresIn * 1000));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USER_KEY);
  Object.values(ROLE_TOKEN_KEYS).forEach(([tokenKey, expiryKey]) => {
    window.sessionStorage.removeItem(tokenKey);
    window.sessionStorage.removeItem(expiryKey);
  });
}
