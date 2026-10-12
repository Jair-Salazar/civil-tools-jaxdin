// Ejecutor genérico de herramientas: dibuja el formulario a partir del JSON "definition" guardado en la base de datos.
import { h } from '../utils/dom.js';
import { field, input, select, button, alert, toast, errorState, emptyState } from '../components/ui.js';
import { icon } from '../components/icons.js';
import { evaluate, substitute } from '../utils/expr.js';
import { fmt, parseNum, plain, timeAgo } from '../utils/format.js';
import { copyText } from '../utils/dom.js';
import { state } from '../utils/store.js';
import { api } from '../services/api.js';
import { summary } from './common.js';

export function renderRunner(tool) {
  const def = tool.definition || {}; const inputs = def.inputs || [], outputs = def.outputs || [];
  if (!outputs.length) return errorState({ message: 'Esta herramienta aún no tiene fórmulas configuradas.' });
  const controls = {};
  const form = h('form', { class: 'stack', novalidate: true, onSubmit: (e) => { e.preventDefault(); calculate(); } });
  inputs.forEach((i) => {
    const num = input({ inputmode: 'decimal', autocomplete: 'off', placeholder: i.default !== undefined ? String(i.default) : '0', 'aria-describedby': undefined });
    if (i.default !== undefined) num.value = String(i.default);
    const unitSel = i.units ? select(i.units.map(([s]) => s), i.units[0][0], { 'aria-label': `Unidad de ${i.label}` }) : null;
    const control = unitSel ? h('div', { class: 'input-group' }, num, unitSel) : h('div', { class: i.unit ? 'input-group' : '' }, num, i.unit && h('span', { class: 'badge', style: 'align-self:center' }, i.unit));
    const f = field(i.label, control, { hint: i.hint }); num.id = `in-${tool.id}-${i.key}`; f.querySelector('label').setAttribute('for', num.id);
    controls[i.key] = { num, unitSel, f, def: i };
    form.append(f);
  });
  const placeholder = () => h('div', { class: 'empty-result card' }, 'Ingresa los datos y presiona “Calcular”.');
  const out = h('div', null, placeholder()); const notice = tool.educational_only ? alert('warn', [h('b', null, 'Resultados referenciales y educativos. '), 'El diseño real requiere normativa vigente, criterio profesional, verificación y la responsabilidad de un ingeniero.']) : null;
  let last = null;

  function readValues() {
    const values = {}, shown = []; let ok = true;
    for (const [key, c] of Object.entries(controls)) {
      const raw = parseNum(c.num.value), i = c.def; let err = '';
      if (Number.isNaN(raw)) err = c.num.value.trim() === '' ? 'Completa este campo.' : 'Ingresa un número válido.';
      else if (i.positive && raw <= 0) err = 'Debe ser mayor que 0.'; else if (i.nonnegative && raw < 0) err = 'No puede ser negativo.';
      c.f.setError(err); if (err) { ok = false; continue; }
      const unit = c.unitSel ? c.unitSel.value : i.unit || ''; const factor = c.unitSel ? i.units.find(([s]) => s === unit)[1] : 1;
      values[key] = raw * factor; shown.push({ label: i.label, value: plain(raw), unit });
    }
    return ok ? { values, shown } : null;
  }

  async function calculate() {
    const read = readValues(); if (!read) { out.replaceChildren(alert('err', 'Revisa los campos marcados para poder calcular.')); last = null; return; }
    const results = outputs.map((o) => { let v; try { v = evaluate(o.expr, read.values); } catch { v = NaN; } return { o, v }; });
    if (results.some((r) => !Number.isFinite(r.v))) { out.replaceChildren(alert('err', def.invalid_message || 'No se puede calcular con estos valores. Revisa los datos ingresados.')); last = null; return; }
    const rows = results.map(({ o, v }) => ({ label: o.label, value: fmt(v, o.decimals ?? 4), unit: o.unit || '' }));
    last = { rows, text: rows.map((r) => `${r.label} = ${r.value}${r.unit ? ' ' + r.unit : ''}`).join('\n') };
    const converted = inputs.some((i) => i.units && controls[i.key].unitSel.value !== i.units[0][0]);
    out.replaceChildren(h('div', { class: 'stack' },
      h('section', { class: 'result-panel', 'aria-live': 'polite' }, h('header', null, 'Resultado', h('span', { class: 'row' }, button('Copiar', { size: 'sm', icon: 'copy', onClick: async () => toast((await copyText(last.text)) ? 'Resultado copiado' : 'No se pudo copiar', 'ok', { force: true }) }))),
        rows.map((r) => h('div', { class: 'result-row' }, h('span', null, r.label), h('span', { class: 'result-value' }, r.value, r.unit && h('small', null, r.unit))))),
      h('section', { class: 'result-panel' }, h('header', null, 'Procedimiento'),
        h('div', { class: 'proc' }, results.flatMap(({ o, v }) => [o.formula && h('span', { class: 'f' }, o.formula), h('span', null, `${o.key} = ${substitute(o.expr, read.values, (n) => plain(n, 5))} = ${fmt(v, o.decimals ?? 4)}${o.unit ? ' ' + o.unit : ''}`)]),
          converted && h('span', { class: 'f' }, 'Nota: los valores se convirtieron a unidades base antes de calcular.')))));
    if (state.user) { try { await api.addHistory({ tool_id: tool.id, tool_name: tool.name, inputs: read.shown, result: rows }); loadHistory(); } catch { /* el cálculo ya se mostró */ } }
    else out.append(h('p', { class: 'muted small', style: 'margin-top:10px' }, 'Inicia sesión para guardar tus cálculos en el historial.'));
  }
  function clearAll() { Object.values(controls).forEach((c) => { c.num.value = ''; c.f.setError(''); }); out.replaceChildren(placeholder()); last = null; controls[inputs[0]?.key]?.num.focus(); }

  const hist = h('div');
  async function loadHistory() {
    if (!state.user) return hist.replaceChildren();
    try {
      const rows = (await api.history({ tool_id: tool.id, limit: 5 })); if (!rows.length) return hist.replaceChildren();
      hist.replaceChildren(h('h3', { style: 'margin-top:26px' }, 'Últimos cálculos de esta herramienta'), h('div', { class: 'stack' }, rows.map((r) => h('div', { class: 'card' }, h('div', { class: 'row row-between' }, h('span', { class: 'muted small' }, timeAgo(r.created_at)),
        h('span', { class: 'small muted' }, summary(r.inputs))), h('div', { class: 'mono-num', style: 'margin-top:6px;color:var(--wine)' }, summary(r.result))))), h('p', null, h('a', { href: '#/mi-espacio/historial' }, 'Ver historial completo')));
    } catch { /* secundario */ }
  }
  loadHistory();
  form.append(h('div', { class: 'row' }, button('Calcular', { variant: 'primary', type: 'submit', icon: 'check' }), button('Limpiar', { icon: 'undo', onClick: clearAll })));
  return h('div', null, notice && h('div', { style: 'margin-bottom:16px' }, notice),
    h('div', { class: 'tool-layout' }, h('div', { class: 'card' }, h('h3', null, 'Datos'), form), out), hist);
}
