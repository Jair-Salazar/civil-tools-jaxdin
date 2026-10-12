// Estructura fija de la app: header, sidebar y footer.
import { h, clear, debounce } from '../utils/dom.js';
import { icon, logoMark } from './icons.js';
import { button, dropdown, link } from './ui.js';
import { state, subscribe, setPrefs, isAdmin } from '../utils/store.js';
import { api } from '../services/api.js';
import { logout, savePrefs } from '../services/session.js';
import { navigate } from '../utils/router.js';
import { CONFIG } from '../config.js';

export function brand() {
  return h('a', { class: 'brand', href: '#/', 'aria-label': 'CIVIL TOOLS — JAXDIN, ir al inicio' }, logoMark(),
    h('span', { class: 'brand-text' }, h('span', { class: 'brand-main' }, 'CIVIL TOOLS'), h('span', { class: 'brand-sub' }, 'JAXDIN')));
}

// ---------- Resultados del buscador (compartido con la página /buscar) ----------
export function searchGroups(data, onPick) {
  const defs = [['tools', 'Herramientas', (r) => `/herramientas/${r.category_slug}/${r.slug}`, (r) => r.category_name], ['formulas', 'Fórmulas', (r) => `/biblioteca/formulas/${r.id}`, (r) => r.expression],
    ['materials', 'Materiales', (r) => `/biblioteca/materiales?id=${r.id}`, (r) => r.category], ['categories', 'Categorías', (r) => `/herramientas/${r.slug}`, () => ''], ['notes', 'Notas', () => '/mi-espacio/notas', (r) => r.category]];
  const out = [];
  for (const [key, title, href, meta] of defs) {
    const rows = data[key] || []; if (!rows.length) continue;
    out.push(h('div', { class: 'result-group' }, title));
    rows.forEach((r) => out.push(h('a', { class: 'result-item', href: `#${href(r)}`, onClick: onPick }, r.name || r.title, h('small', null, meta(r)))));
  }
  return out;
}

function searchBox() {
  const inp = h('input', { class: 'input', type: 'search', placeholder: 'Buscar herramientas, fórmulas, materiales…', 'aria-label': 'Buscar', autocomplete: 'off' });
  const panel = h('div', { class: 'search-results', hidden: true }); const wrap = h('div', { class: 'search-wrap', role: 'search' }, h('span', { class: 'search-icon' }, icon('search')), inp, h('kbd', null, '/'), panel);
  const hide = () => (panel.hidden = true);
  const run = debounce(async () => {
    const q = inp.value.trim(); if (q.length < 2) return hide();
    try { const data = await api.search(q); const items = searchGroups(data, () => { hide(); inp.value = ''; });
      clear(panel).append(...(items.length ? items : [h('div', { class: 'result-group' }, `Sin resultados para "${q}"`)])); panel.hidden = false; }
    catch { clear(panel).append(h('div', { class: 'result-group' }, 'No se pudo buscar ahora. Inténtalo de nuevo.')); panel.hidden = false; }
  }, 250);
  inp.addEventListener('input', run);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && inp.value.trim()) { hide(); navigate(`/buscar?q=${encodeURIComponent(inp.value.trim())}`); } if (e.key === 'Escape') { hide(); inp.blur(); } });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); inp.focus(); } });
  return wrap;
}

export function buildHeader(app, toggleDrawer) {
  const header = h('header', { class: 'header' });
  const themeBtn = button('', { variant: 'ghost', tip: 'Cambiar tema', onClick: () => savePrefs({ theme: state.prefs.theme === 'dark' ? 'light' : 'dark' }) });
  const mobileSearch = h('div', { class: 'mobile-search-bar', hidden: true }); mobileSearch.append(searchBox());
  const desktopSearch = searchBox();   // se crea una sola vez para no perder lo escrito al redibujar
  const draw = () => {
    clear(header);
    const quick = dropdown(button('', { variant: 'ghost', icon: 'bolt', tip: 'Acceso rápido', ariaLabel: 'Acceso rápido' }), () => [
      h('div', { class: 'menu-head' }, 'Acceso rápido'), h('a', { href: '#/herramientas/calculadora/calculadora-cientifica' }, icon('calc'), 'Calculadora'),
      h('a', { href: '#/herramientas/conversor/conversor-unidades' }, icon('swap'), 'Conversor'), h('a', { href: '#/mi-espacio/notas' }, icon('note'), 'Mis notas'), h('a', { href: '#/biblioteca/formulas' }, icon('formula'), 'Fórmulas')]);
    themeBtn.replaceChildren(icon(state.prefs.theme === 'dark' ? 'sun' : 'moon'));
    const userBtn = button(state.user ? (state.user.full_name || state.user.email).split(' ')[0].slice(0, 14) : 'Entrar', { variant: state.user ? 'ghost' : 'primary', icon: 'user', size: 'sm' });
    const userMenu = state.user ? dropdown(userBtn, () => [h('div', { class: 'menu-head' }, state.user.email), h('a', { href: '#/mi-espacio/notas' }, icon('note'), 'Mis notas'), h('a', { href: '#/mi-espacio/favoritos' }, icon('star'), 'Favoritos'),
      h('a', { href: '#/mi-espacio/historial' }, icon('history'), 'Historial'), h('a', { href: '#/preferencias' }, icon('settings'), 'Preferencias'), isAdmin() && h('a', { href: '#/admin' }, icon('shield'), 'Administración'), h('hr'),
      h('button', { onClick: () => { logout(); navigate('/'); } }, icon('logout'), 'Cerrar sesión')]) : button('Entrar', { variant: 'primary', icon: 'user', size: 'sm', href: '/login' });
    header.append(button('', { variant: 'ghost', icon: 'menu', tip: 'Menú', ariaLabel: 'Abrir menú', onClick: toggleDrawer }), brand(), h('div', { class: 'header-spacer' }), desktopSearch,
      h('div', { class: 'header-actions' }, button('', { variant: 'ghost', icon: 'search', tip: 'Buscar', ariaLabel: 'Buscar', onClick: () => { mobileSearch.hidden = !mobileSearch.hidden; mobileSearch.querySelector('input').focus(); } }), quick, themeBtn, userMenu));
    header.querySelector('.btn-icon').classList.add('menu-btn');
    header.querySelectorAll('.header-actions > .btn-icon')[0].classList.add('mobile-search');
  };
  draw(); subscribe(debounce(draw, 0));
  const frag = document.createDocumentFragment(); frag.append(header, mobileSearch); return frag;
}

export function buildSidebar(app, closeDrawer) {
  const el = h('aside', { class: 'sidebar', id: 'sidebar', 'aria-label': 'Navegación principal' });
  const item = (href, ic, label, extra = {}) => h('a', { class: 'nav-link', href: `#${href}`, 'data-tip': label, 'data-match': extra.match || href, onClick: closeDrawer }, icon(ic), h('span', { class: 'nav-label' }, label));
  const draw = () => {
    clear(el);
    const cats = state.categories;
    el.append(
      h('div', { class: 'nav-group' }, item('/', 'home', 'Inicio', { match: '^/$' })),
      h('div', { class: 'nav-group' }, h('div', { class: 'nav-title' }, 'Herramientas'), item('/herramientas', 'tools', 'Todas las herramientas', { match: '^/herramientas/?$' }),
        h('div', { class: 'nav-sub' }, cats.map((c) => item(`/herramientas/${c.slug}`, c.icon, c.name, { match: `^/herramientas/${c.slug}` })))),
      h('div', { class: 'nav-group' }, h('div', { class: 'nav-title' }, 'Biblioteca'), item('/biblioteca/formulas', 'formula', 'Fórmulas', { match: '^/biblioteca/formulas' }), item('/biblioteca/materiales', 'flask', 'Materiales', { match: '^/biblioteca/materiales' }), item('/biblioteca/unidades', 'ruler', 'Unidades', { match: '^/biblioteca/unidades' })),
      h('div', { class: 'nav-group' }, h('div', { class: 'nav-title' }, 'Mi espacio'), item('/mi-espacio/notas', 'note', 'Mis notas', { match: '^/mi-espacio/notas' }), item('/mi-espacio/favoritos', 'star', 'Favoritos', { match: '^/mi-espacio/favoritos' }), item('/mi-espacio/historial', 'history', 'Historial', { match: '^/mi-espacio/historial' })),
      h('div', { class: 'nav-group' }, item('/preferencias', 'settings', 'Preferencias', { match: '^/preferencias' }), isAdmin() && item('/admin', 'shield', 'Administración', { match: '^/admin' })),
      h('div', { class: 'sidebar-foot' }, button('', { variant: 'ghost', tip: state.prefs.sidebarCollapsed ? 'Expandir menú' : 'Contraer menú', ariaLabel: 'Contraer o expandir menú', onClick: () => setPrefs({ sidebarCollapsed: !state.prefs.sidebarCollapsed }), icon: state.prefs.sidebarCollapsed ? 'chevronRight' : 'chevronLeft' })));
    el.querySelector('.sidebar-foot .btn').classList.add('collapse-btn');
    mark(location.hash.slice(1).split('?')[0] || '/');
  };
  const mark = (path) => el.querySelectorAll('.nav-link').forEach((a) => a.classList.toggle('active', new RegExp(a.dataset.match).test(path)));
  draw(); subscribe(debounce(draw, 0));
  el.markActive = mark; return el;
}

export function buildFooter() {
  const dot = h('span', { class: 'status-dot' }), statusText = h('span', null, 'Comprobando…');
  api.health().then(() => { dot.classList.add('ok'); statusText.textContent = 'API en línea'; }).catch(() => { dot.classList.add('err'); statusText.textContent = 'API sin conexión'; });
  const col = (title, items) => h('div', null, h('h4', null, title), h('ul', null, items.map(([href, label]) => h('li', null, link(href, label)))));
  return h('footer', { class: 'footer' }, h('div', { class: 'footer-grid' },
    h('div', null, brand(), h('p', { class: 'muted small', style: 'margin-top:12px;max-width:34ch' }, 'Herramientas digitales para Ingeniería Civil.')),
    col('Navegación', [['/', 'Inicio'], ['/herramientas', 'Herramientas'], ['/biblioteca/formulas', 'Biblioteca'], ['/mi-espacio/notas', 'Mi espacio']]),
    col('Herramientas', [['/herramientas/topografia', 'Topografía'], ['/herramientas/concreto', 'Concreto'], ['/herramientas/hidraulica', 'Hidráulica'], ['/herramientas/conversor', 'Conversor']]),
    h('div', null, h('h4', null, 'Información'), h('ul', null, h('li', null, `Versión ${CONFIG.APP_VERSION}`), h('li', null, dot, statusText), h('li', null, link('/preferencias', 'Preferencias')), h('li', null, h('a', { href: 'https://github.com/', target: '_blank', rel: 'noopener' }, 'Documentación'))))),
    h('div', { class: 'footer-bottom' }, h('span', null, '© 2026 CIVIL TOOLS — JAXDIN'), h('span', null, 'Los resultados son referenciales y no reemplazan el criterio de un ingeniero.')));
}
