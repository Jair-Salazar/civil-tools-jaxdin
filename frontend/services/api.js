// Capa de comunicación con la REST API. Todo el frontend habla con el backend SOLO a través de este archivo.
import { CONFIG } from '../config.js';
import { state, setSession } from '../utils/store.js';

export class ApiError extends Error {
  constructor(message, status = 0, code = 'error', fields = null) { super(message); this.status = status; this.code = code; this.fields = fields; }
}
const cache = new Map();

export async function request(method, path, body, { cacheMs = 0 } = {}) {
  const key = method + path;
  if (cacheMs && cache.has(key) && Date.now() - cache.get(key).t < cacheMs) return cache.get(key).d;
  let res;
  try {
    res = await fetch(CONFIG.API_URL + path, {
      method, headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión o inténtalo más tarde.', 0, 'network');
  }
  let data = null; try { data = await res.json(); } catch { /* respuesta sin cuerpo */ }
  if (!res.ok) {
    if (res.status === 401 && state.token) { setSession(null, null); }
    const e = data?.error;
    throw new ApiError(e?.message || 'Ocurrió un error inesperado.', res.status, e?.code, e?.fields);
  }
  if (cacheMs) cache.set(key, { t: Date.now(), d: data });
  return data;
}
export const clearCache = () => cache.clear();
const get = (p, o) => request('GET', p, undefined, o);
const qs = (o) => { const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v !== null && v !== undefined)); const s = p.toString(); return s ? `?${s}` : ''; };

export const api = {
  health: () => get('/health'), publicSettings: () => get('/settings/public', { cacheMs: 60000 }),
  login: (b) => request('POST', '/auth/login', b), register: (b) => request('POST', '/auth/register', b),
  me: () => get('/auth/me'), savePrefs: (preferences) => request('PUT', '/auth/preferences', { preferences }),
  changePassword: (b) => request('PUT', '/auth/password', b),
  categories: () => get('/categories', { cacheMs: 60000 }),
  tools: (p = {}) => get('/tools' + qs(p), { cacheMs: 30000 }),
  formulas: (p = {}) => get('/formulas' + qs(p), { cacheMs: 30000 }), formula: (id) => get(`/formulas/${id}`),
  units: () => get('/units', { cacheMs: 300000 }),
  materials: (p = {}) => get('/materials' + qs(p), { cacheMs: 30000 }),
  search: (q) => get('/search' + qs({ q })),
  notes: (p = {}) => get('/notes' + qs(p)), createNote: (b) => request('POST', '/notes', b),
  updateNote: (id, b) => request('PUT', `/notes/${id}`, b), deleteNote: (id) => request('DELETE', `/notes/${id}`),
  favorites: () => get('/favorites'), addFavorite: (item_type, item_id) => request('POST', '/favorites', { item_type, item_id }),
  removeFavorite: (id) => request('DELETE', `/favorites/${id}`),
  history: (p = {}) => get('/history' + qs(p)), addHistory: (b) => request('POST', '/history', b),
  deleteHistory: (id) => request('DELETE', `/history/${id}`), clearHistory: () => request('DELETE', '/history'),
  myStats: () => get('/me/stats'),
  admin: {
    schema: () => get('/admin/schema'), list: (res, p) => get(`/admin/resources/${res}` + qs(p)),
    create: (res, b) => request('POST', `/admin/resources/${res}`, b), update: (res, id, b) => request('PUT', `/admin/resources/${res}/${id}`, b),
    remove: (res, id) => request('DELETE', `/admin/resources/${res}/${id}`),
    createUser: (b) => request('POST', '/admin/users', b), updateUser: (id, b) => request('PUT', `/admin/users/${id}`, b), deleteUser: (id) => request('DELETE', `/admin/users/${id}`),
    stats: () => get('/admin/stats'), status: () => get('/admin/status'),
  },
};
