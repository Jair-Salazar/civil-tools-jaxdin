// Iconos SVG en línea (trazo). icon('home') → <svg>. Se crean con DOM, sin innerHTML.
const P = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6',
  tools: 'M4 20L20 4M7 17l-3 3M14 4h6v6M3 8l5-5 3 3-5 5z',
  book: 'M4 4h12a3 3 0 013 3v13H7a3 3 0 01-3-3zM4 17a3 3 0 013-3h12',
  folder: 'M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2l.4 2.7h4l.4-2.7a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5', sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  moon: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z', menu: 'M4 6h16M4 12h16M4 18h16', close: 'M6 6l12 12M18 6L6 18',
  chevronLeft: 'M15 6l-6 6 6 6', chevronRight: 'M9 6l6 6-6 6', chevronDown: 'M6 9l6 6 6-6', back: 'M19 12H5M11 6l-6 6 6 6',
  star: 'M12 3l2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8z', trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', copy: 'M9 9h11v11H9zM5 15V5h10', plus: 'M12 5v14M5 12h14', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', alert: 'M12 4l9 16H3zM12 10v4M12 17.5v.5', check: 'M5 12l5 5L20 7', info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8v.5',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', shapes: 'M4 20l5-9 5 9zM14 4h6v6h-6zM8 3a3 3 0 100 .01', compass: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5z',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12L4 7.5M12 12v9', droplet: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z',
  building: 'M5 21V5l9-2v18M14 8h5v13M8 8h2M8 12h2M8 16h2M17 12h.01M17 16h.01M3 21h18', list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  swap: 'M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7', calc: 'M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01',
  formula: 'M18 5H7l6 7-6 7h11', flask: 'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3', ruler: 'M3 17L17 3l4 4L7 21zM8 12l2 2M11 9l2 2M14 6l2 2',
  logout: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', note: 'M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6',
  history: 'M3 12a9 9 0 109-9 9 9 0 00-7 3.4M3 4v4h4M12 7v5l3 2', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3', lock: 'M6 11h12v10H6zM8 11V8a4 4 0 018 0v3', database: 'M4 6c0-1.5 3.6-3 8-3s8 1.5 8 3-3.6 3-8 3-8-1.5-8-3zM4 6v6c0 1.5 3.6 3 8 3s8-1.5 8-3V6M4 12v6c0 1.5 3.6 3 8 3s8-1.5 8-3v-6',
};
export function icon(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', `icon ${cls}`.trim()); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', P[name] || P.info); svg.append(path);
  return svg;
}
// Logo: escuadra de dibujo técnico con marcas de escala
export function logoMark() {
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40'); svg.setAttribute('class', 'brand-mark'); svg.setAttribute('aria-hidden', 'true');
  const add = (tag, attrs) => { const el = document.createElementNS(ns, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); svg.append(el); };
  add('path', { d: 'M5 5h30L5 35z', fill: 'var(--accent)' });
  add('path', { d: 'M12 12h13L12 25z', fill: 'var(--surface)' });
  add('path', { d: 'M5 35h30M5 5v30', stroke: 'var(--ink)', 'stroke-width': '1.4', fill: 'none' });
  add('path', { d: 'M11 35v-3M17 35v-2M23 35v-3M29 35v-2', stroke: 'var(--ink)', 'stroke-width': '1', fill: 'none' });
  return svg;
}
