// Mi espacio: notas, favoritos e historial. Requiere sesión (el backend también lo exige).
import { h } from '../utils/dom.js';
import { card, badge, button, breadcrumbs, pageHead, tabs, input, textarea, field, select, modal, confirmDialog, toast, emptyState, table } from '../components/ui.js';
import { icon } from '../components/icons.js';
import { api } from '../services/api.js';
import { state } from '../utils/store.js';
import { toggleFavorite } from '../services/session.js';
import { debounce } from '../utils/dom.js';
import { fmtDate, timeAgo } from '../utils/format.js';
import { navigate } from '../utils/router.js';
import { asyncView, toolIndex, toolHref, summary } from './common.js';

const head = (label, active, actions) => h('div', null, breadcrumbs([{ label: 'Inicio', href: '/' }, { label: 'Mi espacio' }, { label }]), pageHead(label, null, actions),
  tabs([['/mi-espacio/notas', 'Mis notas'], ['/mi-espacio/favoritos', 'Favoritos'], ['/mi-espacio/historial', 'Historial']], active));

export function notesPage({ query }) {
  const list = h('div'); let q = '', cat = '', favOnly = false;
  const search = input({ type: 'search', placeholder: 'Buscar en mis notas…', 'aria-label': 'Buscar notas' });
  const catSel = select([['', 'Todas las categorías'], 'General', 'Clase', 'Fórmulas', 'Obra', 'Pendiente'], '', { 'aria-label': 'Filtrar por categoría' });
  async function load() {
    try {
      const rows = await api.notes({ q, category: cat, favorite: favOnly ? 1 : '' });
      list.replaceChildren(rows.length ? h('div', { class: 'grid grid-2' }, rows.map((n) => card([h('div', { class: 'note-card' }, h('div', { class: 'row row-between' }, badge(n.category, 'accent'),
        h('span', null, button('', { variant: 'ghost', size: 'sm', icon: 'star', tip: n.is_favorite ? 'Quitar favorita' : 'Marcar favorita', ariaLabel: 'Favorita', onClick: async () => { try { await api.updateNote(n.id, { ...n, is_favorite: !n.is_favorite }); load(); } catch (e) { toast(e.message, 'err'); } } }))),
        h('h3', { style: 'margin:0' }, (n.is_favorite ? '★ ' : '') + n.title), h('div', { class: 'body' }, n.content), h('div', { class: 'row row-between' }, h('span', { class: 'muted small' }, timeAgo(n.updated_at)),
          h('span', null, button('', { variant: 'ghost', size: 'sm', icon: 'edit', tip: 'Editar', ariaLabel: 'Editar nota', onClick: () => edit(n) }), button('', { variant: 'ghost', size: 'sm', icon: 'trash', tip: 'Eliminar', ariaLabel: 'Eliminar nota', onClick: () => remove(n) }))))])))
        : emptyState('No hay notas', q || cat || favOnly ? 'Ninguna nota coincide con los filtros.' : 'Guarda apuntes, fórmulas o pendientes de obra.', button('Crear nota', { variant: 'primary', icon: 'plus', onClick: () => edit() })));
    } catch (e) { list.replaceChildren(h('div', { class: 'alert alert-err' }, e.message)); }
  }
  async function remove(n) { if (await confirmDialog({ message: `¿Eliminar la nota “${n.title}”? Esta acción no se puede deshacer.` })) { try { await api.deleteNote(n.id); toast('Nota eliminada'); load(); } catch (e) { toast(e.message, 'err'); } } }
  function edit(n) {
    const title = input({ value: n?.title || '', maxlength: 150 }), content = textarea({ rows: 8 }), cs = select(['General', 'Clase', 'Fórmulas', 'Obra', 'Pendiente'], n?.category || 'General'), fav = h('input', { type: 'checkbox' });
    content.value = n?.content || ''; fav.checked = !!n?.is_favorite; const ft = field('Título', title), fc = field('Contenido', content);
    modal({ title: n ? 'Editar nota' : 'Nueva nota', body: h('div', { class: 'stack' }, ft, fc, field('Categoría', cs), h('label', { class: 'check' }, fav, 'Marcar como favorita')),
      footer: (close) => [button('Cancelar', { onClick: close }), button('Guardar nota', { variant: 'primary', onClick: async () => {
        if (!title.value.trim()) return ft.setError('El título es obligatorio.');
        try { const b = { title: title.value, content: content.value, category: cs.value, is_favorite: fav.checked }; n ? await api.updateNote(n.id, b) : await api.createNote(b); toast('Nota guardada'); close(); load(); } catch (e) { toast(e.message, 'err'); } } })] });
  }
  search.addEventListener('input', debounce(() => { q = search.value.trim(); load(); })); catSel.addEventListener('change', () => { cat = catSel.value; load(); });
  const favBtn = button('★ Favoritas', { onClick: () => { favOnly = !favOnly; favBtn.classList.toggle('btn-primary', favOnly); load(); } });
  load(); if (query.get('nueva')) setTimeout(() => edit(), 0);
  return h('div', null, head('Mis notas', '/mi-espacio/notas', [button('Nueva nota', { variant: 'primary', icon: 'plus', onClick: () => edit() })]), h('div', { class: 'toolbar' }, h('div', { class: 'search' }, search), catSel, favBtn), list);
}

export function favoritesPage() {
  return h('div', null, head('Favoritos', '/mi-espacio/favoritos'), asyncView(() => api.favorites(), (rows) => {
    if (!rows.length) return emptyState('Aún no tienes favoritos', 'Marca con la estrella herramientas, fórmulas o materiales para volver rápido.', button('Explorar herramientas', { href: '/herramientas', variant: 'primary' }));
    const hrefOf = (f) => (f.item_type === 'tool' ? `/herramientas/${f.category_slug}/${f.tool_slug}` : f.item_type === 'formula' ? `/biblioteca/formulas/${f.item_id}` : `/biblioteca/materiales?id=${f.item_id}`);
    const label = { tool: 'Herramientas', formula: 'Fórmulas', material: 'Materiales' };
    return h('div', { class: 'stack' }, Object.keys(label).map((t) => { const items = rows.filter((r) => r.item_type === t); return items.length ? h('div', null, h('h3', null, label[t]),
      h('div', { class: 'grid grid-2' }, items.map((f) => card([h('div', { class: 'row row-between' }, h('a', { href: `#${hrefOf(f)}`, style: 'font-weight:500' }, f.name || 'Elemento eliminado'),
        button('', { variant: 'ghost', size: 'sm', icon: 'trash', tip: 'Quitar', ariaLabel: 'Quitar de favoritos', onClick: async () => { try { await api.removeFavorite(f.id); state.favorites.delete(`${f.item_type}:${f.item_id}`); toast('Quitado de favoritos'); navigate('/mi-espacio/favoritos?r=' + Date.now(), { replace: true }); } catch (e) { toast(e.message, 'err'); } } })),
        h('p', { class: 'muted small', style: 'margin:6px 0 0' }, f.description || '')])))) : null; }));
  }));
}

export function historyPage() {
  return h('div', null, head('Historial', '/mi-espacio/historial', [button('Limpiar historial', { variant: 'danger', icon: 'trash', onClick: async () => { if (await confirmDialog({ title: 'Limpiar historial', message: 'Se eliminarán todos tus cálculos guardados. Esta acción no se puede deshacer.', confirmLabel: 'Limpiar todo' })) { try { await api.clearHistory(); toast('Historial limpio'); navigate('/mi-espacio/historial?r=' + Date.now(), { replace: true }); } catch (e) { toast(e.message, 'err'); } } } })]),
    asyncView(async () => [await api.history({ limit: 100 }), await toolIndex().catch(() => new Map())], ([rows, tools]) => {
      if (!rows.length) return emptyState('Tu historial está vacío', 'Cada cálculo que hagas se guardará aquí con sus datos y resultado.', button('Ir a herramientas', { href: '/herramientas', variant: 'primary' }));
      return table([{ label: 'Fecha', render: (r) => fmtDate(r.created_at) }, { label: 'Herramienta', render: (r) => { const t = tools.get(r.tool_id); return t ? h('a', { href: `#${toolHref(t)}` }, r.tool_name) : r.tool_name; } },
        { label: 'Datos', render: (r) => h('span', { class: 'small' }, summary(r.inputs)) }, { label: 'Resultado', cls: 'mono-num', render: (r) => h('span', { style: 'color:var(--wine)' }, summary(r.result)) },
        { label: '', cls: 'actions', render: (r) => button('', { variant: 'ghost', size: 'sm', icon: 'trash', tip: 'Eliminar', ariaLabel: 'Eliminar del historial', onClick: async (e) => { try { await api.deleteHistory(r.id); e.target.closest('tr').remove(); toast('Eliminado'); } catch (er) { toast(er.message, 'err'); } } }) }], rows);
    }));
}
