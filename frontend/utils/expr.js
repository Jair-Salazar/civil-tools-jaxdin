// Evaluador matemático SEGURO (sin eval). Analizador recursivo descendente.
// Gramática:  expr := term (('+'|'-') term)*   term := unary (('*'|'/') unary)*
//             unary := '-' unary | power   power := postfix ('^' unary)?   postfix := primary '%'*
//             primary := número | constante | variable | función '(' args ')' | '(' expr ')'

const CONSTS = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI, phi: (1 + Math.sqrt(5)) / 2, g: 9.80665 };

export function makeFunctions(angle = 'rad') {
  const toRad = (x) => (angle === 'deg' ? (x * Math.PI) / 180 : x);
  const fromRad = (x) => (angle === 'deg' ? (x * 180) / Math.PI : x);
  return {
    sin: (x) => Math.sin(toRad(x)), cos: (x) => Math.cos(toRad(x)), tan: (x) => Math.tan(toRad(x)),
    asin: (x) => fromRad(Math.asin(x)), acos: (x) => fromRad(Math.acos(x)), atan: (x) => fromRad(Math.atan(x)),
    atan2: (y, x) => fromRad(Math.atan2(y, x)),
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round,
    log: Math.log10, ln: Math.log, log2: Math.log2, pow: Math.pow, min: Math.min, max: Math.max,
    rad: (x) => (x * Math.PI) / 180, deg: (x) => (x * 180) / Math.PI,
    mod: (a, b) => a - b * Math.floor(a / b), fact: (n) => (Number.isInteger(n) && n >= 0 && n <= 170 ? factorial(n) : NaN),
  };
}
const factorial = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };

function tokenize(src, decimalComma) {
  const tokens = []; let i = 0;
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi').replace(/√/g, 'sqrt');
  const src2 = decimalComma ? s.replace(/,/g, '.') : s;
  while (i < src2.length) {
    const c = src2[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src2.slice(i));
    if (num) { tokens.push({ t: 'num', v: parseFloat(num[0]) }); i += num[0].length; continue; }
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src2.slice(i));
    if (id) { tokens.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
    if ('+-*/^()%!'.includes(c) || c === ';') { tokens.push({ t: c }); i++; continue; }
    if (c === ',') { tokens.push({ t: ';' }); i++; continue; }
    throw new Error(`Carácter no válido: "${c}"`);
  }
  return tokens;
}

// decimalComma=true (calculadora): "2,5" es 2.5 y los argumentos se separan con ";".
export function evaluate(src, vars = {}, { angle = 'rad', decimalComma = false } = {}) {
  const tokens = tokenize(String(src), decimalComma); const funcs = makeFunctions(angle); let p = 0;
  const peek = () => tokens[p]; const take = (t) => { if (peek() && peek().t === t) return tokens[p++]; return null; };
  const need = (t) => { if (!take(t)) throw new Error('Expresión incompleta'); };

  function expr() { let v = term(); for (;;) { if (take('+')) v += term(); else if (take('-')) v -= term(); else return v; } }
  function term() {
    let v = unary();
    for (;;) {
      if (take('*')) v *= unary();
      else if (take('/')) v /= unary();
      else if (peek() && (peek().t === 'num' || peek().t === '(' || peek().t === 'id') && implicitOk()) v *= unary(); // 2pi, 2(3)
      else return v;
    }
  }
  function implicitOk() { return p > 0 && (tokens[p - 1].t === 'num' || tokens[p - 1].t === ')') && peek().t !== 'num'; }
  function unary() { if (take('-')) return -unary(); if (take('+')) return unary(); return power(); }
  function power() { const b = postfix(); return take('^') ? Math.pow(b, unary()) : b; }
  function postfix() { let v = primary(); for (;;) { if (take('%')) v /= 100; else if (take('!')) v = funcs.fact(v); else return v; } }
  function primary() {
    const tk = peek(); if (!tk) throw new Error('Expresión incompleta');
    if (take('num')) return tk.v;
    if (take('(')) { const v = expr(); need(')'); return v; }
    if (take('id')) {
      const name = tk.v;
      if (peek() && peek().t === '(') {
        take('('); const args = [];
        if (!take(')')) { do { args.push(expr()); } while (take(';')); need(')'); }
        const fn = funcs[name]; if (!fn) throw new Error(`Función desconocida: ${name}`);
        return fn(...args);
      }
      if (Object.prototype.hasOwnProperty.call(vars, name)) return vars[name];
      if (Object.prototype.hasOwnProperty.call(CONSTS, name)) return CONSTS[name];
      throw new Error(`Variable desconocida: ${name}`);
    }
    throw new Error('Expresión no válida');
  }
  const result = expr();
  if (p < tokens.length) throw new Error('Expresión no válida');
  return result;
}

// Sustituye variables por sus valores para mostrar el procedimiento: "b*h" → "2.5 * 4"
export function substitute(src, vars, fmt = String) {
  return String(src).replace(/[A-Za-z_][A-Za-z0-9_]*(?!\s*\()/g, (m) => (m in vars ? `(${fmt(vars[m])})` : m))
    .replace(/\*/g, ' · ').replace(/\^/g, '^');
}
