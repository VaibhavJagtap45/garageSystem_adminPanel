const ADMIN_TOKEN_KEY = "admin_token";
const ADMIN_TOKEN_EXPIRES_AT_KEY = "admin_token_expires_at";

export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);

export const getAdminTokenExpiry = () =>
  localStorage.getItem(ADMIN_TOKEN_EXPIRES_AT_KEY);

export const parseAdminSessionExpiry = (expiresAt) => {
  if (!expiresAt) return null;
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const isAdminSessionExpired = (expiresAt, now = Date.now()) => {
  const expiryMs = parseAdminSessionExpiry(expiresAt);
  if (!expiryMs) return true;
  return expiryMs <= now;
};

export const clearAdminSession = () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_EXPIRES_AT_KEY);
};

export const hasActiveAdminSession = () => {
  const token = getAdminToken();
  const expiresAt = getAdminTokenExpiry();

  if (!token || !expiresAt || isAdminSessionExpired(expiresAt)) {
    clearAdminSession();
    return false;
  }

  return true;
};

export const saveAdminSession = ({ token, expiresAt }) => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);

  if (expiresAt) {
    localStorage.setItem(ADMIN_TOKEN_EXPIRES_AT_KEY, expiresAt);
  } else {
    localStorage.removeItem(ADMIN_TOKEN_EXPIRES_AT_KEY);
  }
};
