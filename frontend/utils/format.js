// Formateo de números: nunca devuelve "NaN", "undefined" o "null" al usuario.
export function fmt(n, decimals = 4) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  if (n !== 0 && (Math.abs(n) >= 1e12 || Math.abs(n) < 1e-9)) return n.toExponential(4).replace('.', ',');
  const s = Number(n.toFixed(decimals)).toString();
  return s.replace('.', ',');
}
export const plain = (n, d = 6) => (Number.isFinite(n) ? String(Number(n.toFixed(d))) : '');
export function parseNum(s) {
  if (s === null || s === undefined) return NaN;
  const t = String(s).trim().replace(',', '.');
  if (t === '' || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return NaN;
  return parseFloat(t);
}
export function fmtDate(iso) {
  const d = new Date(iso); if (isNaN(d)) return '—';
  return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function timeAgo(iso) {
  const d = new Date(iso); if (isNaN(d)) return '';
  const m = Math.round((Date.now() - d) / 60000);
  if (m < 1) return 'ahora'; if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  const days = Math.round(h / 24); return days < 30 ? `hace ${days} d` : fmtDate(iso);
}
export const safe = (v, fallback = '—') => (v === null || v === undefined || v === '' || (typeof v === 'number' && !Number.isFinite(v)) ? fallback : v);
