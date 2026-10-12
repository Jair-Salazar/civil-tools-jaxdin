// Inicio: dashboard con búsqueda, categorías, recientes, favoritos, fórmulas destacadas y estadísticas.
import { h } from '../utils/dom.js';
import { card, button, emptyState, link, alert } from '../components/ui.js';
import { icon } from '../components/icons.js';
import { api } from '../services/api.js';
import { state } from '../utils/store.js';
import { navigate } from '../utils/router.js';
import { timeAgo } from '../utils/format.js';
import { asyncView, toolIndex, toolHref, summary } from './common.js';
import { categoryTile } from './tools.js';

const section = (title, action, body) => h('section', null, h('div', { class: 'section-title' }, h('h2', null, title), action), body);

export function dashboard() {
  return asyncView(async () => {
    const guest = !state.user, safe = (p) => p.catch(() => null);
    const [cats, formulas, stats, history, favs, tools, pub] = await Promise.all([api.categories(), safe(api.formulas({ featured: 1 })), guest ? null : safe(api.myStats()), guest ? null : safe(api.history({ limit: 30 })),
      guest ? null : safe(api.favorites()), safe(toolIndex()), safe(api.publicSettings())]);
    return { cats, formulas: formulas || [], stats, history: history || [], favs: favs || [], tools, pub };
  }, ({ cats, formulas, stats, history, favs, tools, pub }) => {
    const q = h('input', { class: 'input', type: 'search', placeholder: 'Ej. pendiente, losa, Manning…', 'aria-label': 'Buscar herramienta' });
    const stat = (n, label) => h('div', null, h('b', null, n ?? '—'), h('span', null, label));
    const recent = [...new Map(history.filter((r) => r.tool_id && tools?.get(r.tool_id)).map((r) => [r.tool_id, r])).values()].slice(0, 6);
    const guestBox = emptyState('Inicia sesión para ver tu actividad', 'Tus cálculos recientes, favoritos y notas aparecerán aquí.', button('Iniciar sesión', { variant: 'primary', href: '/login' }));
    return h('div', null,
      pub?.maintenance_message ? h('div', { style: 'margin-bottom:16px' }, alert('warn', pub.maintenance_message)) : null,
      h('div', { class: 'hero' }, h('div', null, h('h1', null, '¿Qué necesitas calcular?'), h('p', { class: 'muted' }, state.user ? `Hola, ${(state.user.full_name || 'ingeniera').split(' ')[0]}. Elige una categoría o busca una herramienta.` : 'Elige una categoría o busca una herramienta.'),
        h('form', { class: 'hero-search', onSubmit: (e) => { e.preventDefault(); if (q.value.trim()) navigate(`/buscar?q=${encodeURIComponent(q.value.trim())}`); } }, q)),
        h('div', { class: 'titleblock', 'aria-label': 'Resumen personal' }, stat(stats?.calculations, 'cálculos'), stat(stats?.week, 'esta semana'), stat(stats?.notes, 'notas'), stat(stats?.favorites, 'favoritos'))),
      section('Categorías', link('/herramientas', 'Ver todas'), h('div', { class: 'grid grid-3' }, cats.map(categoryTile))),
      section('Accesos rápidos', null, h('div', { class: 'row' }, button('Calculadora', { icon: 'calc', href: '/herramientas/calculadora/calculadora-cientifica' }), button('Conversor', { icon: 'swap', href: '/herramientas/conversor/conversor-unidades' }), button('Nueva nota', { icon: 'plus', href: '/mi-espacio/notas?nueva=1' }), button('Fórmulas', { icon: 'formula', href: '/biblioteca/formulas' }))),
      h('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));margin-top:4px' },
        section('Herramientas recientes', null, state.user ? (recent.length ? h('div', { class: 'stack' }, recent.map((r) => card([h('a', { href: `#${toolHref(tools.get(r.tool_id))}`, style: 'text-decoration:none;color:inherit' }, h('b', null, r.tool_name), h('div', { class: 'muted small' }, timeAgo(r.created_at)))]))) : emptyState('Sin actividad todavía', 'Usa una herramienta y aparecerá aquí.')) : guestBox),
        section('Últimos cálculos', link('/mi-espacio/historial', 'Historial'), state.user ? (history.length ? h('div', { class: 'stack' }, history.slice(0, 4).map((r) => card([h('div', { class: 'small muted' }, `${r.tool_name} · ${timeAgo(r.created_at)}`), h('div', { class: 'mono-num', style: 'color:var(--wine)' }, summary(r.result))]))) : emptyState('Aún no hay cálculos', 'Tu historial se llena automáticamente.')) : guestBox),
        section('Favoritos', link('/mi-espacio/favoritos', 'Ver todos'), state.user ? (favs.length ? h('div', { class: 'stack' }, favs.slice(0, 5).map((f) => card([h('b', null, f.name || 'Elemento'), h('div', { class: 'muted small' }, { tool: 'Herramienta', formula: 'Fórmula', material: 'Material' }[f.item_type])], { href: f.item_type === 'tool' ? `/herramientas/${f.category_slug}/${f.tool_slug}` : f.item_type === 'formula' ? `/biblioteca/formulas/${f.item_id}` : `/biblioteca/materiales?id=${f.item_id}` }))) : emptyState('Sin favoritos', 'Marca con la estrella lo que uses seguido.')) : guestBox)),
      section('Fórmulas destacadas', link('/biblioteca/formulas', 'Biblioteca'), formulas.length ? h('div', { class: 'grid grid-2' }, formulas.slice(0, 4).map((f) => card([h('div', { class: 'small muted' }, f.category_name), h('h3', null, f.name), h('div', { class: 'formula-line', style: 'font-size:1.15rem;padding:10px 12px' }, f.expression)], { href: `/biblioteca/formulas/${f.id}` }))) : emptyState('No hay fórmulas destacadas', 'Márcalas como destacadas desde el panel de administración.')));
  });
}
