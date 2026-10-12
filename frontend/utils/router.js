// Router por hash (#/herramientas/topografia/pendiente). Funciona en GitHub Pages sin configuración de servidor
// porque la parte después de "#" nunca se envía al servidor (no hay errores 404 al recargar).
const routes = [];
let outlet = null, onChange = null, token = 0;

export function defineRoutes(list) { list.forEach(([pattern, handler, opts = {}]) => routes.push({ keys: [...pattern.matchAll(/:(\w+)/g)].map((m) => m[1]), re: new RegExp('^' + pattern.replace(/:\w+/g, '([^/]+)') + '/?$'), handler, opts })); }
export const currentPath = () => (location.hash.slice(1).split('?')[0] || '/');
export const currentQuery = () => new URLSearchParams(location.hash.split('?')[1] || '');
export const navigate = (path, { replace = false } = {}) => { if (replace) location.replace('#' + path); else location.hash = path; };
export const back = (fallback = '/') => { if (history.length > 1) history.back(); else navigate(fallback); };

export function startRouter(el, changeCb) { outlet = el; onChange = changeCb; window.addEventListener('hashchange', render); render(); }

export async function render() {
  const path = currentPath(), my = ++token;
  let match = null, params = {};
  for (const r of routes) { const m = r.re.exec(path); if (m) { match = r; r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]))); break; } }
  match = match || routes.find((r) => r.opts.notFound);
  onChange?.(path, match?.opts || {});
  const guard = match.opts.guard?.(); if (guard) { navigate(guard, { replace: true }); return; }
  outlet.replaceChildren(); outlet.append(match.opts.loading?.() || document.createTextNode(''));
  let view;
  try { view = await match.handler({ params, query: currentQuery(), path }); }
  catch (err) { console.error(err); view = match.opts.onError ? match.opts.onError(err) : document.createTextNode('Error'); }
  if (my !== token || !view) return;                      // llegó otra navegación mientras cargaba
  const page = document.createElement('div'); page.className = 'page'; page.append(view);
  outlet.replaceChildren(page); window.scrollTo({ top: 0 }); document.getElementById('main').focus({ preventScroll: true });
}
