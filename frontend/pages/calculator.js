// Calculadora científica con evaluador propio (sin eval) e historial.
import { h } from '../utils/dom.js';
import { button, toast, emptyState } from '../components/ui.js';
import { evaluate } from '../utils/expr.js';
import { fmt } from '../utils/format.js';
import { state } from '../utils/store.js';
import { api } from '../services/api.js';
import { savePrefs } from '../services/session.js';
import { copyText } from '../utils/dom.js';

export function renderCalculator(tool) {
  const disp = h('input', { type: 'text', inputmode: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: '0', 'aria-label': 'Expresión' }), out = h('div', { class: 'calc-out', 'aria-live': 'polite' }, '0');
  let ans = 0, history = [], mode = state.prefs.calcAngle;
  const histBox = h('div', { class: 'stack' }); const modeBtn = h('div', { class: 'seg', role: 'group', 'aria-label': 'Modo angular' });
  const drawMode = () => modeBtn.replaceChildren(...['deg', 'rad'].map((m) => h('button', { type: 'button', class: mode === m ? 'on' : '', onClick: () => { mode = m; savePrefs({ calcAngle: m }); drawMode(); } }, m === 'deg' ? 'Grados' : 'Radianes'))); drawMode();
  const insert = (t) => { const s = disp.selectionStart ?? disp.value.length, e = disp.selectionEnd ?? s; disp.setRangeText(t, s, e, 'end'); disp.focus(); };
  function calc() {
    const src = disp.value.trim(); if (!src) return;
    try {
      const v = evaluate(src, { ans }, { angle: mode, decimalComma: true });
      if (!Number.isFinite(v)) throw new Error('El resultado no está definido (división por cero o dominio inválido).');
      ans = v; const text = fmt(v, state.prefs.calcDecimals); out.textContent = text; out.classList.remove('err'); pushHistory(src, text);
    } catch (e) { out.textContent = '—'; toast(e.message.includes('Variable desconocida') || e.message.includes('Función') ? e.message : (e.message.includes('definido') ? e.message : 'Expresión no válida. Revisa paréntesis y operadores.'), 'err'); }
  }
  async function pushHistory(expr, result) {
    history.unshift({ expr, result }); history = history.slice(0, 20); drawHistory();
    if (state.user) { try { await api.addHistory({ tool_id: tool.id, tool_name: tool.name, inputs: [{ label: 'Expresión', value: expr, unit: '' }], result: [{ label: 'Resultado', value: result, unit: '' }] }); } catch { /* local sigue */ } }
  }
  function drawHistory() {
    histBox.replaceChildren(...(history.length ? history.map((r) => h('button', { class: 'card', style: 'text-align:left;cursor:pointer', onClick: () => { disp.value = r.expr; disp.focus(); } }, h('div', { class: 'mono small muted' }, r.expr), h('div', { class: 'mono-num', style: 'color:var(--wine);font-size:1.1rem' }, '= ' + r.result))) : [emptyState('Aún no hay operaciones', 'Los cálculos de esta sesión aparecerán aquí.')]));
  }
  const K = (label, text, cls = '', fn) => h('button', { type: 'button', class: `key ${cls}`, onClick: fn || (() => insert(text ?? label)), 'aria-label': label }, label);
  const keys = [K('sin', 'sin(', 'fn'), K('cos', 'cos(', 'fn'), K('tan', 'tan(', 'fn'), K('log', 'log(', 'fn'), K('ln', 'ln(', 'fn'),
    K('√', 'sqrt(', 'fn'), K('x²', '^2', 'fn'), K('xʸ', '^', 'fn'), K('π', 'pi', 'fn'), K('e', 'e', 'fn'),
    K('(', '(', 'op'), K(')', ')', 'op'), K('%', '%', 'op'), K('Ans', 'ans', 'fn'), K('⌫', '', 'op', () => { disp.value = disp.value.slice(0, -1); disp.focus(); }),
    K('7'), K('8'), K('9'), K('÷', '/', 'op'), K('C', '', 'op', () => { disp.value = ''; out.textContent = '0'; disp.focus(); }),
    K('4'), K('5'), K('6'), K('×', '*', 'op'), K('−', '-', 'op'), K('1'), K('2'), K('3'), K('+', '+', 'op'), K('=', '', 'eq', calc), K('0'), K('.', '.'), K(',', ';', 'fn'), K('abs', 'abs(', 'fn'), K('n!', '!', 'fn')];
  disp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); calc(); } });
  drawHistory();
  return h('div', { class: 'calc' }, h('div', null, h('div', { class: 'calc-display' }, disp, out), h('div', { class: 'row row-between', style: 'margin-top:10px' }, modeBtn, button('Copiar', { size: 'sm', icon: 'copy', onClick: async () => toast((await copyText(out.textContent)) ? 'Resultado copiado' : 'No se pudo copiar', 'ok', { force: true }) })), h('div', { class: 'keypad' }, keys),
    h('p', { class: 'muted small' }, 'Usa “;” para separar argumentos, p. ej. max(2;7). Escribe con el teclado o con los botones.')),
    h('div', null, h('h3', null, 'Historial'), histBox, history.length ? null : null));
}
