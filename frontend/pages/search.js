// Página de resultados del buscador global.
import { h } from '../utils/dom.js';
import { breadcrumbs, pageHead, emptyState, card } from '../components/ui.js';
import { api } from '../services/api.js';
import { searchGroups } from '../components/layout.js';
import { asyncView } from './common.js';

export function searchPage({ query }) {
  const q = (query.get('q') || '').trim();
  return h('div', null, breadcrumbs([{ label: 'Inicio', href: '/' }, { label: 'Búsqueda' }]), pageHead(q ? `Resultados para “${q}”` : 'Buscar', 'Herramientas, fórmulas, materiales, categorías y tus notas.'),
    q.length < 2 ? emptyState('Escribe al menos 2 letras', 'Usa el buscador de arriba para encontrar herramientas, fórmulas o materiales.') :
      asyncView(() => api.search(q), (data) => { const items = searchGroups(data); return items.length ? card([h('div', { class: 'menu', style: 'position:static;box-shadow:none;border:0' }, items)]) : emptyState('Sin resultados', 'Prueba con otra palabra o revisa la ortografía.'); }));
}
export function notFound() { return emptyState('Página no encontrada', 'La dirección no existe o fue movida.', h('a', { class: 'btn btn-primary', href: '#/' }, 'Ir al inicio')); }
