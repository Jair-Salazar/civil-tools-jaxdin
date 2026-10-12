// Conversor de unidades. Los factores vienen de la tabla `units`: base = valor × factor + desfase.
import { h } from '../utils/dom.js';
import { field, input, select, button, toast, table, emptyState } from '../components/ui.js';
import { api } from '../services/api.js';
import { fmt, parseNum, plain } from '../utils/format.js';
import { copyText } from '../utils/dom.js';
import { state } from '../utils/store.js';
import { asyncView } from './common.js';

export const convert = (value, from, to) => ((value * from.factor + from.offset_value) - to.offset_value) / to.factor;
const clean = (n) => parseFloat(n.toPrecision(12));   // evita 0.30000000000000004

export function renderConverter(tool) {
  return asyncView(() => api.units(), (units) => {
    if (!units.length) return emptyState('Sin unidades', 'Agrega unidades desde el panel de administración.');
    const groups = new Map(); units.forEach((u) => { if (!groups.has(u.quantity)) groups.set(u.quantity, { label: u.quantity_label, items: [] }); groups.get(u.quantity).items.push(u); });
    const qSel = select([...groups].map(([k, g]) => [k, g.label]), 'longitud'); const val = input({ inputmode: 'decimal', value: '1', 'aria-label': 'Valor' });
    const from = select([]), to = select([]); const res = h('div', { class: 'big-result', 'aria-live': 'polite' }); const all = h('div'); const vf = field('Valor', val);
    const opts = (sel, items, v) => { sel.replaceChildren(...items.map((u) => h('option', { value: u.symbol }, `${u.symbol} — ${u.name}`))); if (v) sel.value = v; };
    function fill(keep) { const g = groups.get(qSel.value).items; opts(from, g, keep ? from.value : g.find((u) => u.is_base)?.symbol); opts(to, g, g[Math.min(1, g.length - 1)].symbol === from.value ? g[0].symbol : (g.find((u) => u.symbol !== from.value) || g[0]).symbol); update(); }
    let lastText = '';
    function update() {
      const g = groups.get(qSel.value).items, n = parseNum(val.value); vf.setError('');
      if (Number.isNaN(n)) { vf.setError(val.value.trim() ? 'Ingresa un número válido.' : 'Completa este campo.'); res.textContent = '—'; all.replaceChildren(); lastText = ''; return; }
      const f = g.find((u) => u.symbol === from.value), t = g.find((u) => u.symbol === to.value); if (!f || !t) return;
      const r = clean(convert(n, f, t)); lastText = `${plain(n)} ${f.symbol} = ${fmt(r, 8)} ${t.symbol}`; res.textContent = `${fmt(r, 8)} ${t.symbol}`;
      all.replaceChildren(h('h3', { style: 'margin-top:22px' }, `${plain(n)} ${f.symbol} equivale a`), table([{ label: 'Unidad', render: (u) => `${u.name} (${u.symbol})` }, { label: 'Valor', cls: 'mono-num', render: (u) => fmt(clean(convert(n, f, u)), 8) }], g.filter((u) => u !== f)));
    }
    qSel.addEventListener('change', () => fill(false)); [val, from, to].forEach((e) => e.addEventListener('input', update));
    const swap = button('⇄', { ariaLabel: 'Intercambiar unidades', tip: 'Intercambiar', onClick: () => { const a = from.value; from.value = to.value; to.value = a; update(); } });
    const save = button('Guardar en historial', { icon: 'history', onClick: async () => { if (!state.user) return toast('Inicia sesión para guardar en el historial.', 'err'); if (!lastText) return toast('No hay un resultado válido para guardar.', 'err');
      try { await api.addHistory({ tool_id: tool.id, tool_name: tool.name, inputs: [{ label: 'Valor', value: plain(parseNum(val.value)), unit: from.value }], result: [{ label: 'Resultado', value: res.textContent, unit: '' }] }); toast('Guardado en el historial'); } catch (e) { toast(e.message, 'err'); } } });
    fill(false);
    return h('div', { class: 'card' }, field('Magnitud', qSel), h('div', { class: 'conv-grid', style: 'margin-top:14px' }, h('div', { class: 'stack' }, vf, field('De', from)), swap, field('A', to)),
      h('div', { style: 'margin:20px 0 6px' }, res), h('div', { class: 'row' }, button('Copiar resultado', { icon: 'copy', onClick: async () => lastText ? toast((await copyText(lastText)) ? 'Resultado copiado' : 'No se pudo copiar', 'ok', { force: true }) : toast('No hay resultado para copiar.', 'err') }), save), all);
  });
}
