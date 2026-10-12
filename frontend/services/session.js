// Sesión: iniciar/cerrar sesión, favoritos en memoria y sincronización de preferencias con el servidor.
import { api, clearCache } from './api.js';
import { state, setSession, setPrefs, favKey, notify } from '../utils/store.js';

export async function loadFavorites() {
  if (!state.user) return;
  try { const rows = await api.favorites(); state.favorites = new Map(rows.map((f) => [favKey(f.item_type, f.item_id), f.id])); notify(); } catch { /* no crítico */ }
}
export async function restoreSession() {
  if (!state.token) return;
  try { const { user } = await api.me(); setSession(state.token, user); mergeServerPrefs(user.preferences); await loadFavorites(); } catch { setSession(null, null); }
}
function mergeServerPrefs(p) { if (p && Object.keys(p).length) setPrefs(p); }
export async function login(email, password) { const { token, user } = await api.login({ email, password }); setSession(token, user); mergeServerPrefs(user.preferences); await loadFavorites(); clearCache(); }
export async function register(body) { const { token, user } = await api.register(body); setSession(token, user); await loadFavorites(); }
export function logout() { setSession(null, null); clearCache(); }
export async function savePrefs(patch) { setPrefs(patch); if (state.user) { try { await api.savePrefs(state.prefs); } catch { /* se guarda local igualmente */ } } }

// Alternar favorito: devuelve true si queda marcado.
export async function toggleFavorite(type, id) {
  const key = favKey(type, id);
  if (state.favorites.has(key)) { await api.removeFavorite(state.favorites.get(key)); state.favorites.delete(key); notify(); return false; }
  const row = await api.addFavorite(type, id); state.favorites.set(key, row.id); notify(); return true;
}
export const isFav = (type, id) => state.favorites.has(favKey(type, id));
