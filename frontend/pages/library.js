// Biblioteca: fórmulas (lista + detalle), materiales y unidades.
import { h } from '../utils/dom.js';
import { card, badge, button, breadcrumbs, pageHead, input, emptyState, table, modal, tabs } from '../components/ui.js';
import { api } from '../services/api.js';
import { state } from '../utils/store.js';
import { debounce, clear } from '../utils/dom.js';
import { asyncView, favStar, toolHref } from './common.js';
import { back } from '../utils/router.js';
import { fmt } from '../utils/format.js';

const nav = (active) => tabs([['/biblioteca/formulas', 'Fórmulas'], ['/biblioteca/materiales', 'Materiales'], ['/biblioteca/unidades', 'Unidades']], active);
const crumbs = (label) => breadcrumbs([{ label: 'Inicio', href: '/' }, { label: 'Biblioteca', href: '/biblioteca/formulas' }, { label }]);

export function formulasList({ query }) {
  const box = h('div'); const list = h('div'); let cat = query.get('cat') || '', q = '', onlyFav = false, cats = [];
  const search = input({ type: 'search', placeholder: 'Buscar fórmula, símbolo o descripción…', 'aria-label': 'Buscar fórmulas' }); const chips = h('div', { class: 'chips' });
  async function load() {
    list.replaceChildren(h('div', { class: 'loading' }, h('div', { class: 'spinner' })));
    try {
      let rows = await api.formulas({ q, category: cat }); if (onlyFav) rows = rows.filter((f) => state.favorites.has(`formula:${f.id}`));
      list.replaceChildren(rows.length ? h('div', { class: 'grid grid-2' }, rows.map((f) => card([h('div', { class: 'row row-between' }, badge(f.category_name, 'accent'), favStar('formula', f.id)), h('h3', { style: 'margin-top:8px' }, h('a', { href: `#/biblioteca/formulas/${f.id}`, style: 'color:inherit;text-decoration:none' }, f.name)),
        h('div', { class: 'formula-line', style: 'font-size:1.2rem;padding:10px 12px;margin:8px 0' }, f.expression), h('p', { class: 'muted small', style: 'margin:0' }, f.description)]))) : emptyState('No encontramos fórmulas', q || cat || onlyFav ? 'Prueba con otra búsqueda o quita los filtros.' : 'Agrega fórmulas desde el panel de administración.'));
    } catch (e) { list.replaceChildren(h('div', { class: 'alert alert-err' }, e.message, ' ', button('Reintentar', { size: 'sm', onClick: load }))); }
  }
  const drawChips = () => chips.replaceChildren(h('button', { class: `chip ${!cat ? 'active' : ''}`, onClick: () => { cat = ''; drawChips(); load(); } }, 'Todas'), ...cats.map((c) => h('button', { class: `chip ${cat === c.slug ? 'active' : ''}`, onClick: () => { cat = c.slug; drawChips(); load(); } }, c.name)),
    h('button', { class: `chip ${onlyFav ? 'active' : ''}`, onClick: () => { if (!state.user) return; onlyFav = !onlyFav; drawChips(); load(); } }, '★ Favoritas'));
  search.addEventListener('input', debounce(() => { q = search.value.trim(); load(); }, 250));
  api.categories().then((c) => { cats = c; drawChips(); }).catch(() => {}); drawChips(); load();
  return h('div', null, crumbs('Fórmulas'), pageHead('Biblioteca', 'Fórmulas, materiales y unidades de referencia.'), nav('/biblioteca/formulas'), h('div', { class: 'toolbar' }, h('div', { class: 'search' }, search)), chips, h('div', { style: 'margin-top:16px' }, list));
}

export function formulaDetail({ params }) {
  return asyncView(() => api.formula(params.id), (f) => h('div', null, breadcrumbs([{ label: 'Inicio', href: '/' }, { label: 'Biblioteca', href: '/biblioteca/formulas' }, { label: 'Fórmulas', href: '/biblioteca/formulas' }, { label: f.name }]),
    pageHead(f.name, f.description, [favStar('formula', f.id), button('Volver', { icon: 'back', onClick: () => back('/biblioteca/formulas') })]), h('div', { class: 'stack' },
      h('div', { class: 'formula-line' }, f.expression),
      f.variables.length ? h('div', null, h('h3', null, 'Variables'), h('div', { class: 'table-wrap' }, h('table', { class: 'table vars-table' }, h('tbody', null, f.variables.map((v) => h('tr', null, h('td', null, v.symbol), h('td', null, v.name, v.description && h('div', { class: 'muted small' }, v.description)), h('td', { class: 'mono' }, v.unit || '—'))))))) : null,
      f.explanation ? h('div', null, h('h3', null, 'Explicación'), h('p', null, f.explanation)) : null,
      f.example ? h('div', null, h('h3', null, 'Ejemplo'), card([f.example])) : null,
      f.tool_id ? h('div', null, button(`Abrir herramienta: ${f.tool_name}`, { variant: 'primary', icon: 'tools', href: toolHref({ category_slug: f.tool_category_slug, slug: f.tool_slug }) })) : null)));
}

export function materialsList({ query }) {
  return asyncView(() => api.materials(), (rows) => {
    const pick = query.get('id'); const list = h('div'); let q = '', cat = ''; const cats = [...new Set(rows.map((m) => m.category))];
    const search = input({ type: 'search', placeholder: 'Buscar material…', 'aria-label': 'Buscar materiales' }); const chips = h('div', { class: 'chips' });
    const open = (m) => modal({ title: m.name, body: h('div', { class: 'stack' }, badge(m.category, 'accent'), h('p', null, m.description), m.properties && Object.keys(m.properties).length ? table([{ label: 'Propiedad', key: 'k' }, { label: 'Valor', key: 'v', cls: 'mono' }], Object.entries(m.properties).map(([k, v]) => ({ k, v: String(v) }))) : null, m.notes ? h('p', { class: 'muted small' }, m.notes) : null) });
    const draw = () => { const f = rows.filter((m) => (!cat || m.category === cat) && (!q || `${m.name} ${m.description} ${m.category}`.toLowerCase().includes(q.toLowerCase())));
      list.replaceChildren(f.length ? h('div', { class: 'grid grid-2' }, f.map((m) => card([h('div', { class: 'row row-between' }, badge(m.category), favStar('material', m.id)), h('h3', { style: 'margin-top:8px' }, m.name), h('p', { class: 'muted small' }, m.description), button('Ver propiedades', { size: 'sm', onClick: () => open(m) })])))
        : emptyState('No encontramos materiales', 'Prueba con otra búsqueda o agrega materiales desde /admin.'));
      chips.replaceChildren(h('button', { class: `chip ${!cat ? 'active' : ''}`, onClick: () => { cat = ''; draw(); } }, 'Todos'), ...cats.map((c) => h('button', { class: `chip ${cat === c ? 'active' : ''}`, onClick: () => { cat = c; draw(); } }, c))); };
    search.addEventListener('input', () => { q = search.value.trim(); draw(); }); draw();
    if (pick) { const m = rows.find((x) => String(x.id) === pick); if (m) setTimeout(() => open(m), 0); }
    return h('div', null, crumbs('Materiales'), pageHead('Biblioteca', 'Valores referenciales: verifica siempre con la norma y el proveedor.'), nav('/biblioteca/materiales'), h('div', { class: 'toolbar' }, h('div', { class: 'search' }, search)), chips, h('div', { style: 'margin-top:16px' }, list));
  });
}

export function unitsPage() {
  return asyncView(() => api.units(), (units) => {
    const groups = new Map(); units.forEach((u) => { if (!groups.has(u.quantity_label)) groups.set(u.quantity_label, []); groups.get(u.quantity_label).push(u); });
    return h('div', null, crumbs('Unidades'), pageHead('Biblioteca', 'Unidades disponibles en el conversor y su relación con la unidad base.'), nav('/biblioteca/unidades'),
      groups.size ? h('div', { class: 'stack' }, [...groups].map(([label, items]) => h('div', null, h('h3', null, label), table([{ label: 'Símbolo', cls: 'mono', render: (u) => u.symbol }, { label: 'Nombre', key: 'name' },
        { label: 'Equivale a la base', cls: 'mono-num', render: (u) => (u.is_base ? 'unidad base' : u.offset_value ? `× ${fmt(u.factor, 6)} + ${fmt(u.offset_value, 4)}` : `× ${fmt(u.factor, 10)}`) }], items)))) : emptyState('Sin unidades', 'Agrega unidades desde el panel de administración.'));
  });
}
