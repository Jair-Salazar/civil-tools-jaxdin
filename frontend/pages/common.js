// Utilidades compartidas por las páginas.
import { h } from '../utils/dom.js';
import { errorState, loadingState, starButton, toast } from '../components/ui.js';
import { api } from '../services/api.js';
import { state } from '../utils/store.js';
import { isFav, toggleFavorite } from '../services/session.js';

// Muestra "cargando", luego el contenido o un estado de error con botón Reintentar.
export function asyncView(loader, render) {
  const box = h('div');
  const run = async () => {
    box.replaceChildren(loadingState());
    try { box.replaceChildren(await render(await loader())); } catch (e) { console.error(e); box.replaceChildren(errorState(e, run)); }
  };
  run(); return box;
}
export async function toolIndex() { const tools = await api.tools(); return new Map(tools.map((t) => [t.id, t])); }
export const toolHref = (t) => `/herramientas/${t.category_slug}/${t.slug}`;

export function favStar(type, id) {
  const mk = () => starButton(isFav(type, id), async () => {
    if (!state.user) return toast('Inicia sesión para guardar favoritos.', 'err');
    try { const on = await toggleFavorite(type, id); toast(on ? 'Agregado a favoritos' : 'Quitado de favoritos'); swap(); } catch (e) { toast(e.message, 'err'); }
  });
  let btn = mk(); const swap = () => { const n = mk(); btn.replaceWith(n); btn = n; }; const wrap = h('span', null, btn); return wrap;
}
export const summary = (rows) => (rows || []).map((r) => `${r.label}: ${r.value}${r.unit ? ' ' + r.unit : ''}`).join(' · ');
