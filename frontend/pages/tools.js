// Vistas: Herramientas (todas) → Categoría → Herramienta.
import { h } from '../utils/dom.js';
import { card, breadcrumbs, pageHead, badge, button, emptyState, errorState } from '../components/ui.js';
import { icon } from '../components/icons.js';
import { api } from '../services/api.js';
import { state } from '../utils/store.js';
import { navigate, back } from '../utils/router.js';
import { asyncView, favStar, toolHref } from './common.js';
import { renderRunner } from './runner.js';
import { renderConverter } from './converter.js';
import { renderCalculator } from './calculator.js';

export function categoryTile(c) {
  return card([h('div', { class: 'cat-tile' }, h('div', { class: 'icon-box' }, icon(c.icon)), h('div', null, h('h3', null, c.name), h('p', { class: 'muted small', style: 'margin:0' }, c.description)),
    h('div', { class: 'meta' }, `${c.tool_count} ${c.tool_count === 1 ? 'herramienta' : 'herramientas'}`))], { href: `/herramientas/${c.slug}` });
}

export function toolsIndex() {
  return h('div', null, breadcrumbs([{ label: 'Inicio', href: '/' }, { label: 'Herramientas' }]), pageHead('Herramientas', 'Elige una categoría para ver sus herramientas de cálculo.'),
    asyncView(() => api.categories(), (cats) => (cats.length ? h('div', { class: 'grid grid-2' }, cats.map(categoryTile)) : emptyState('Aún no hay categorías', 'Agrégalas desde el panel de administración.'))));
}

export function categoryView({ params }) {
  return asyncView(() => Promise.all([api.categories(), api.tools({ category: params.cat })]), ([cats, tools]) => {
    const cat = cats.find((c) => c.slug === params.cat);
    if (!cat) return h('div', null, breadcrumbs([{ label: 'Inicio', href: '/' }, { label: 'Herramientas', href: '/herramientas' }, { label: 'No encontrada' }]), emptyState('Categoría no encontrada', 'Puede que haya sido renombrada o desactivada.', button('Ver herramientas', { href: '/herramientas', variant: 'primary' })));
    if (tools.length === 1 && tools[0].kind !== 'calculator') { navigate(toolHref(tools[0]), { replace: true }); return h('span'); }
    return h('div', null, breadcrumbs([{ label: 'Inicio', href: '/' }, { label: 'Herramientas', href: '/herramientas' }, { label: cat.name }]), pageHead(cat.name, cat.description, [button('Volver', { icon: 'back', onClick: () => back('/herramientas') })]),
      tools.length ? h('div', { class: 'grid grid-2' }, tools.map((t) => card([h('div', { class: 'tool-card' }, h('div', null, h('h3', null, h('a', { href: `#${toolHref(t)}`, style: 'color:inherit;text-decoration:none' }, t.name)), h('p', null, t.description), t.educational_only && h('div', { style: 'margin-top:8px' }, badge('Referencial', 'warn'))), favStar('tool', t.id))])))
        : emptyState('Esta categoría aún no tiene herramientas', 'Cuando agregues herramientas desde /admin aparecerán aquí.'));
  });
}

export function toolView({ params }) {
  return asyncView(() => api.tools({ category: params.cat }), (tools) => {
    const tool = tools.find((t) => t.slug === params.tool);
    const crumbs = [{ label: 'Inicio', href: '/' }, { label: 'Herramientas', href: '/herramientas' }];
    if (!tool) return h('div', null, breadcrumbs([...crumbs, { label: 'No encontrada' }]), emptyState('Herramienta no encontrada', 'Revisa el enlace o vuelve al listado.', button('Ver herramientas', { href: '/herramientas', variant: 'primary' })));
    const single = tools.length === 1 && tool.kind !== 'calculator';
    const trail = single ? [...crumbs, { label: tool.name }] : [...crumbs, { label: tool.category_name, href: `/herramientas/${tool.category_slug}` }, { label: tool.name }];
    const body = tool.kind === 'converter' ? renderConverter(tool) : tool.kind === 'scientific' ? renderCalculator(tool) : renderRunner(tool);
    return h('div', null, breadcrumbs(trail), pageHead(tool.name, tool.description, [favStar('tool', tool.id), button('Volver', { icon: 'back', onClick: () => back(`/herramientas/${tool.category_slug}`) })]), body,
      tool.kind === 'calculator' ? asyncView(() => api.formulas({ tool_id: tool.id }), (fs) => (fs.length ? h('div', { style: 'margin-top:26px' }, h('h3', null, 'Fórmulas relacionadas'), h('div', { class: 'row' }, fs.map((f) => h('a', { class: 'chip', href: `#/biblioteca/formulas/${f.id}` }, f.name)))) : h('span'))) : null);
  });
}
