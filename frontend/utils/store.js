// Estado global mínimo: sesión, preferencias y favoritos, con suscripción a cambios.
const listeners = new Set();
const DEFAULT_PREFS = { theme: 'light', bootAnimation: true, notifications: true, calcAngle: 'deg', calcDecimals: 6, sidebarCollapsed: false };

function loadPrefs() { try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem('ct_prefs') || '{}') }; } catch { return { ...DEFAULT_PREFS }; } }

export const state = {
  user: null, token: localStorage.getItem('ct_token') || null, prefs: loadPrefs(),
  favorites: new Map(), // "tool:5" → id del favorito
  categories: [], settings: {},
};
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const notify = () => listeners.forEach((fn) => fn(state));

export function setPrefs(patch) {
  state.prefs = { ...state.prefs, ...patch };
  localStorage.setItem('ct_prefs', JSON.stringify(state.prefs));
  document.documentElement.dataset.theme = state.prefs.theme;
  notify();
}
export function setSession(token, user) {
  state.token = token; state.user = user;
  if (token) localStorage.setItem('ct_token', token); else localStorage.removeItem('ct_token');
  if (!user) state.favorites = new Map();
  notify();
}
export const isAdmin = () => state.user?.role === 'ADMIN';
export const favKey = (type, id) => `${type}:${id}`;
