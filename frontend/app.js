// Arranque de la aplicación: carga sesión + categorías, muestra la animación de carga y arranca el router.
import { h } from './utils/dom.js';
import { state, subscribe, setPrefs, isAdmin } from './utils/store.js';
import { defineRoutes, startRouter } from './utils/router.js';
import { buildHeader, buildSidebar, buildFooter } from './components/layout.js';
import { errorState, loadingState, emptyState } from './components/ui.js';
import { restoreSession } from './services/session.js';
import { api } from './services/api.js';
import { runBootLoader } from './animations/loader.js';
import { CONFIG } from './config.js';
import { dashboard } from './pages/dashboard.js';
import { toolsIndex, categoryView, toolView } from './pages/tools.js';
import { formulasList, formulaDetail, materialsList, unitsPage } from './pages/library.js';
import { notesPage, favoritesPage, historyPage } from './pages/myspace.js';
import { preferencesPage } from './pages/preferences.js';
import { loginPage } from './pages/auth.js';
import { searchPage, notFound } from './pages/search.js';
import { adminPage } from './pages/admin.js';

const needLogin = () => (state.user ? null : '/login');
const needAdmin = () => (!state.user ? '/login' : isAdmin() ? null : '/');
const oops = (e) => errorState(e);

defineRoutes([
  ['/', dashboard, { onError: oops }], ['/herramientas', toolsIndex], ['/herramientas/:cat', categoryView], ['/herramientas/:cat/:tool', toolView],
  ['/biblioteca', () => { location.replace('#/biblioteca/formulas'); return null; }], ['/biblioteca/formulas', formulasList], ['/biblioteca/formulas/:id', formulaDetail], ['/biblioteca/materiales', materialsList], ['/biblioteca/unidades', unitsPage],
  ['/mi-espacio', () => { location.replace('#/mi-espacio/notas'); return null; }], ['/mi-espacio/notas', notesPage, { guard: needLogin }], ['/mi-espacio/favoritos', favoritesPage, { guard: needLogin }], ['/mi-espacio/historial', historyPage, { guard: needLogin }],
  ['/preferencias', preferencesPage], ['/login', loginPage], ['/buscar', searchPage], ['/admin', adminPage, { guard: needAdmin }], ['/admin/:section', adminPage, { guard: needAdmin }],
  ['/.*', notFound, { notFound: true }],
]);

function applyPrefs() { document.documentElement.dataset.theme = state.prefs.theme; document.getElementById('app').classList.toggle('collapsed', state.prefs.sidebarCollapsed); }

async function init() {
  const app = document.getElementById('app'), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const boot = document.getElementById('boot'); let loader = null;
  if (state.prefs.bootAnimation) loader = runBootLoader(document.getElementById('boot-canvas'), { reduced });
  const minDelay = state.prefs.bootAnimation ? new Promise((r) => setTimeout(r, 1700)) : Promise.resolve();

  applyPrefs(); subscribe(applyPrefs);
  const backdrop = h('div', { class: 'backdrop', hidden: true, onClick: () => closeDrawer() });
  const sidebar = buildSidebar(app, () => closeDrawer());
  const openDrawer = () => { sidebar.classList.add('open'); backdrop.hidden = false; }, closeDrawer = () => { sidebar.classList.remove('open'); backdrop.hidden = true; };
  const main = h('main', { class: 'main', id: 'main', tabindex: '-1' });
  app.replaceChildren(buildHeader(app, () => (sidebar.classList.contains('open') ? closeDrawer() : openDrawer())), h('div', { class: 'shell' }, sidebar, backdrop, main), buildFooter());

  // Datos iniciales (la sesión y las categorías se cargan mientras se ve la animación)
  await Promise.all([restoreSession(), api.categories().then((c) => (state.categories = c)).catch(() => {})]);
  setPrefs({}); // redibuja header/sidebar con los datos cargados
  startRouter(main, (path) => { sidebar.markActive(path); closeDrawer(); document.title = 'CIVIL TOOLS — JAXDIN'; });

  await minDelay; app.hidden = false;
  if (boot) { boot.classList.add('hide'); setTimeout(() => { loader?.stop(); boot.remove(); }, 600); }
  if (CONFIG.ENABLE_SW && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}
init().catch((e) => { console.error(e); document.getElementById('app').hidden = false; document.getElementById('boot')?.remove(); document.getElementById('main')?.replaceChildren(errorState(e)); });
