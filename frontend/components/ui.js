// Componentes reutilizables: botones, tarjetas, campos, modales, toasts, alertas, tabs, dropdown, estados…
import { h, append, clear } from '../utils/dom.js';
import { icon } from './icons.js';
import { state } from '../utils/store.js';

export const link = (href, label, cls = '') => h('a', { href: `#${href}`, class: cls }, label);

export function button(label, { variant = '', icon: ic, onClick, type = 'button', size = '', tip, disabled, href, ariaLabel } = {}) {
  const cls = `btn ${variant ? 'btn-' + variant : ''} ${size ? 'btn-' + size : ''} ${!label ? 'btn-icon' : ''}`.trim();
  const attrs = { class: cls, 'data-tip': tip, 'aria-label': ariaLabel || tip || (typeof label === 'string' ? label : undefined), disabled };
  if (href) return h('a', { ...attrs, href: `#${href}` }, ic && icon(ic), label);
  return h('button', { ...attrs, type, onClick }, ic && icon(ic), label);
}
export const card = (children, { cls = '', href } = {}) => (href ? h('a', { class: `card card-link ${cls}`, href: `#${href}` }, children) : h('div', { class: `card ${cls}` }, children));
export const badge = (text, kind = '') => h('span', { class: `badge ${kind ? 'badge-' + kind : ''}` }, text);

let uid = 0;
export function field(label, control, { hint, error } = {}) {
  const id = `f${++uid}`; control.id = control.id || id;
  const wrap = h('div', { class: `field ${error ? 'has-error' : ''}` }, h('label', { for: control.id }, label), control, hint && h('span', { class: 'field-hint' }, hint), h('span', { class: 'field-error', role: 'alert' }, error || ''));
  wrap.setError = (msg) => { wrap.classList.toggle('has-error', !!msg); wrap.querySelector('.field-error').textContent = msg || ''; control.setAttribute('aria-invalid', msg ? 'true' : 'false'); };
  return wrap;
}
export const input = (attrs = {}) => h('input', { class: 'input', ...attrs });
export const textarea = (attrs = {}) => h('textarea', { class: 'textarea', ...attrs });
export function select(options, value, attrs = {}) {
  const el = h('select', { class: 'select', ...attrs }, options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v }, l); }));
  if (value !== undefined) el.value = value; return el;
}
export function switchEl(checked, onChange, label) {
  const inp = h('input', { type: 'checkbox', role: 'switch', 'aria-label': label, onChange: (e) => onChange(e.target.checked) }); inp.checked = !!checked;
  return h('label', { class: 'switch' }, inp, h('i'));
}
export function table(columns, rows, { empty } = {}) {
  if (!rows.length) return empty || emptyState('Sin resultados', 'No hay datos para mostrar.');
  return h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('thead', null, h('tr', null, columns.map((c) => h('th', null, c.label)))),
    h('tbody', null, rows.map((r) => h('tr', null, columns.map((c) => h('td', { class: c.cls || '' }, c.render ? c.render(r) : r[c.key] ?? '—')))))));
}
export function alert(kind, children) { const ic = { warn: 'alert', err: 'alert', info: 'info' }[kind] || 'info'; return h('div', { class: `alert alert-${kind}`, role: kind === 'err' ? 'alert' : 'note' }, icon(ic), h('div', null, children)); }
export function tabs(items, active) { return h('nav', { class: 'tabs', 'aria-label': 'Secciones' }, items.map(([href, label]) => h('a', { class: `tab ${href === active ? 'active' : ''}`, href: `#${href}` }, label))); }
export function breadcrumbs(items) {
  return h('nav', { class: 'breadcrumbs', 'aria-label': 'Ruta de navegación' }, items.flatMap((it, i) => {
    const last = i === items.length - 1; const node = last || !it.href ? h('span', { 'aria-current': last ? 'page' : null }, it.label) : h('a', { href: `#${it.href}` }, it.label);
    return i ? [icon('chevronRight'), node] : [node];
  }).map((n) => { if (n.classList?.contains('icon')) { n.style.width = '14px'; n.style.height = '14px'; } return n; }));
}
export function pageHead(title, subtitle, actions = []) { return h('div', { class: 'page-head' }, h('div', null, h('h1', null, title), subtitle && h('p', { class: 'muted' }, subtitle)), h('div', { class: 'page-actions' }, actions)); }

// ---- Estados ----
export const emptyState = (title, text, action) => h('div', { class: 'state' }, icon('folder'), h('h3', null, title), h('p', null, text), action);
export const errorState = (err, retry) => h('div', { class: 'state error' }, icon('alert'), h('h3', null, err?.code === 'network' ? 'Sin conexión con el servidor' : 'No pudimos cargar esto'),
  h('p', null, err?.message || 'Ocurrió un error inesperado.'), retry && button('Reintentar', { icon: 'undo', onClick: retry }));
export const loadingState = (text = 'Cargando…') => h('div', { class: 'loading', role: 'status' }, h('div', { class: 'spinner' }), text);

// ---- Toasts ----
export function toast(message, kind = 'ok', { force = false } = {}) {
  if (!force && !state.prefs.notifications && kind === 'ok') return;
  const root = document.getElementById('toasts');
  const el = h('div', { class: `toast ${kind}`, role: 'status' }, icon(kind === 'err' ? 'alert' : 'check'), message);
  root.append(el); setTimeout(() => el.remove(), kind === 'err' ? 5500 : 2800);
}

// ---- Modales ----
export function modal({ title, body, footer, wide = false, onClose }) {
  const root = document.getElementById('modal-root'); const prev = document.activeElement;
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const dlg = h('div', { class: `modal ${wide ? 'wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'modal-head' }, h('h3', null, title), button('', { variant: 'ghost', size: 'sm', icon: 'close', ariaLabel: 'Cerrar', onClick: close })),
    h('div', { class: 'modal-body' }, body), footer && h('div', { class: 'modal-foot' }, typeof footer === 'function' ? footer(close) : footer));
  const back = h('div', { class: 'modal-back', onMousedown: (e) => { if (e.target === back) close(); } }, dlg);
  root.append(back); document.addEventListener('keydown', onKey);
  (dlg.querySelector('input, textarea, select') || dlg.querySelector('button'))?.focus();
  return { close, el: dlg };
}
export function confirmDialog({ title = '¿Confirmar acción?', message, confirmLabel = 'Eliminar', danger = true }) {
  return new Promise((resolve) => {
    let done = false; const finish = (v, close) => { done = true; close(); resolve(v); };
    modal({ title, body: h('p', null, message), onClose: () => { if (!done) resolve(false); },
      footer: (close) => [button('Cancelar', { onClick: () => finish(false, close) }), button(confirmLabel, { variant: danger ? 'danger' : 'primary', onClick: () => finish(true, close) })] });
  });
}

// ---- Dropdown ----
export function dropdown(trigger, buildMenu) {
  const wrap = h('div', { class: 'dropdown' }); let menu = null;
  const close = () => { menu?.remove(); menu = null; trigger.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', outside); };
  const outside = (e) => { if (!wrap.contains(e.target)) close(); };
  trigger.setAttribute('aria-haspopup', 'true'); trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', (e) => { e.stopPropagation(); if (menu) return close(); menu = h('div', { class: 'menu', role: 'menu', onClick: close }, buildMenu(close)); wrap.append(menu); trigger.setAttribute('aria-expanded', 'true'); setTimeout(() => document.addEventListener('click', outside), 0); });
  wrap.append(trigger); return wrap;
}

// ---- Botón de favorito (estrella) ----
export function starButton(on, onToggle) {
  const b = button('', { variant: 'ghost', size: 'sm', ariaLabel: on ? 'Quitar de favoritos' : 'Agregar a favoritos', tip: on ? 'Quitar de favoritos' : 'Favorito', onClick: async () => { b.disabled = true; try { await onToggle(); } finally { b.disabled = false; } } });
  b.classList.add('star-btn'); if (on) b.classList.add('on'); const ic = icon('star'); if (on) ic.classList.add('filled'); b.append(ic); return b;
}
export { h, append, clear };
