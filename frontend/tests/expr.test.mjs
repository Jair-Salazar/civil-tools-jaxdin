// Ejecutar:  node --test frontend/tests      (Node 18+)
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, substitute } from '../utils/expr.js';
import { fmt, parseNum } from '../utils/format.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('aritmética y precedencia', () => {
  assert.equal(evaluate('2+3*4'), 14);
  assert.equal(evaluate('(2+3)*4'), 20);
  assert.equal(evaluate('-2^2'), -4);
  assert.equal(evaluate('2^3^2'), 512);
  assert.equal(evaluate('10/4'), 2.5);
});
test('porcentaje, raíz, factorial y multiplicación implícita', () => {
  assert.equal(evaluate('50%'), 0.5);
  assert.equal(evaluate('200*15%'), 30);
  assert.equal(evaluate('sqrt(16)'), 4);
  assert.equal(evaluate('5!'), 120);
  close(evaluate('2pi'), 2 * Math.PI);
});
test('trigonometría en grados y radianes', () => {
  close(evaluate('sin(30)', {}, { angle: 'deg' }), 0.5);
  close(evaluate('cos(pi)', {}, { angle: 'rad' }), -1);
  close(evaluate('deg(atan(1))'), 45);
  close(evaluate('mod(deg(atan2(-1,-1)),360)'), 225);
});
test('variables y funciones de herramientas', () => {
  assert.equal(evaluate('b*h/2', { b: 4, h: 3 }), 6);
  close(evaluate('(1/n)*R^(2/3)*S^(1/2)', { n: 0.013, R: 0.1, S: 0.005 }), 1.1719, 1e-3);
  assert.equal(evaluate('1e3+1'), 1001);
});
test('coma decimal en la calculadora', () => {
  assert.equal(evaluate('2,5*2', {}, { decimalComma: true }), 5);
  assert.equal(evaluate('max(2;7)', {}, { decimalComma: true }), 7);
});
test('seguridad: no ejecuta código ni acepta basura', () => {
  assert.throws(() => evaluate('alert(1)'));
  assert.throws(() => evaluate('constructor'));
  assert.throws(() => evaluate('process.exit()'));
  assert.throws(() => evaluate('1+'));
  assert.throws(() => evaluate('2 3'));
  assert.throws(() => evaluate('"a"'));
});
test('división por cero y raíz negativa no rompen (resultan no finitos)', () => {
  assert.ok(!Number.isFinite(evaluate('1/0')));
  assert.ok(Number.isNaN(evaluate('sqrt(-1)')));
});
test('formato: nunca NaN/undefined/null', () => {
  assert.equal(fmt(NaN), '—'); assert.equal(fmt(undefined), '—'); assert.equal(fmt(null), '—'); assert.equal(fmt(Infinity), '—');
  assert.equal(fmt(1.5), '1,5'); assert.equal(fmt(0.30000000000000004, 4), '0,3');
  assert.ok(Number.isNaN(parseNum('')) && Number.isNaN(parseNum('abc'))); assert.equal(parseNum('2,5'), 2.5);
});
test('substitute muestra el procedimiento', () => {
  assert.equal(substitute('b*h', { b: 2, h: 3 }), '(2) · (3)');
});
