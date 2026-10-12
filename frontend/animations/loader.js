// Pantalla de carga con pequeñas escenas pixel art ORIGINALES (dibujadas con canvas, sin imágenes externas).
// Inspiración: aventura pirata — un barco con bandera de casco de obra, una brújula tipo "Log Pose" que
// encuentra su rumbo, y una capitana con casco corriendo por la cubierta. No hay material protegido.
const W = 160, H = 90;
const SKY = ['#2d2838', '#47354a', '#6b4455', '#98545f', '#c98a8a', '#e8c2b0'];
const SEA = ['#3b4a63', '#2f3b52', '#252f45'];

function Painter(ctx) {
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const sprite = (rows, x, y, pal, s = 1) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) rect(x + i * s, y + j * s, s, s, pal[ch]); }));
  const sky = (h) => SKY.forEach((c, i) => rect(0, (i * h) / SKY.length, W, Math.ceil(h / SKY.length) + 1, c));
  const waves = (t, y0, speed) => {
    rect(0, y0, W, H - y0, SEA[0]);
    for (let y = y0 + 2, r = 0; y < H; y += 3, r++) {
      rect(0, y, W, 1, SEA[1 + (r % 2)]);
      for (let x = -16; x < W; x += 16) rect(((x - t * speed * (1 + r * 0.4)) % (W + 16) + W + 16) % (W + 16) - 8, y, 5, 1, '#6c7da0');
    }
  };
  return { rect, sprite, sky, waves };
}

const SKULL = ['.XXXXX.', 'XX.X.XX', 'XXXXXXX', '.XXXXX.', '.X.X.X.'];
const HAT = ['..YYY..', '.YYYYY.', 'YYYYYYY'];
const RUN = [
  ['....HHHH....', '...HHHHHH...', '.HHHHHHHHHH.', '...kssssssk.', '...ksdssdsk.', '....ssssss..', '...rrrrrrr..', '..wwwwwwwww.', '..wwwwwwwww.', '..wwwwwwwww.', '...bbbbbbb..', '...bbb.bbb..', '...bbb..bbb.', '..nnn....nn.'],
  ['....HHHH....', '...HHHHHH...', '.HHHHHHHHHH.', '...kssssssk.', '...ksdssdsk.', '....ssssss..', '...rrrrrrr..', '..wwwwwwwww.', '..wwwwwwwww.', '..wwwwwwwww.', '...bbbbbbb..', '...bbb.bbb..', '..bbb...bbb.', '.nnn.....nn.'],
];
const PAL = { H: '#e8b84a', k: '#3b2b3a', s: '#f0c9a4', d: '#2a2530', r: '#c46b78', w: '#f1e6d6', b: '#3f4d6b', n: '#2a2530' };

function gull(P, x, y, t) { const up = Math.floor(t * 6) % 2; P.rect(x, y + up, 2, 1, '#f1e6d6'); P.rect(x + 2, y + 1 - up, 2, 1, '#f1e6d6'); P.rect(x + 4, y + up, 2, 1, '#f1e6d6'); }

const SCENES = {
  barco(P, t) {
    P.sky(54);
    for (let i = 0; i < 9; i++) if ((Math.floor(t * 3) + i) % 4) P.rect((i * 37) % W, 3 + ((i * 11) % 22), 1, 1, '#f1e6d6');
    for (let y = -9; y <= 9; y++) { const w = Math.floor(Math.sqrt(81 - y * y)); P.rect(118 - w, 52 + y, 2 * w, 1, '#f3d9b1'); }
    P.waves(t, 52, 14);
    const bob = Math.sin(t * 3) * 1.5, x = 62, y = 60 + bob;
    for (let i = 0; i < 6; i++) P.rect(x + i, y + i, 38 - 2 * i, 1, i < 1 ? '#8a5a44' : '#6e4636');   // casco
    P.rect(x + 18, y - 34, 2, 34, '#4a3328');                                                            // mástil
    P.rect(x + 7, y - 26, 24, 20, '#f1e6d6'); P.rect(x + 7, y - 26, 24, 1, '#d9c7a3'); P.rect(x + 7, y - 7, 24, 1, '#d9c7a3');
    for (let i = 0; i < 12; i++) P.rect(x + 31 + i * 0.5, y - 10 - i, 1, 1 + i, '#e7d9c4');                // vela de proa
    const fx = x + 19, fy = y - 40, wv = Math.sin(t * 6) * 1;                                             // bandera graphite con casco de obra
    P.rect(fx, fy, 15, 13, '#2a2530'); P.rect(fx + 15, fy + 1 + wv, 2, 11, '#2a2530');
    P.sprite(HAT, fx + 4, fy + 1, { Y: '#e8b84a' }); P.sprite(SKULL, fx + 4, fy + 4, { X: '#f1e6d6' });
    gull(P, (150 - t * 14) % 190 + 10, 14, t); gull(P, (200 - t * 9) % 190 + 10, 24, t + 1);
  },
  brujula(P, t) {
    P.rect(0, 0, W, H, '#222b3d');
    for (let x = 0; x < W; x += 8) P.rect(x, 0, 1, H, '#2b3650'); for (let y = 0; y < H; y += 8) P.rect(0, y, W, 1, '#2b3650');
    const cx = 80, cy = 45;
    for (let a = 0; a < 360; a += 1.5) { const r = a * Math.PI / 180; P.rect(cx + Math.cos(r) * 33, cy + Math.sin(r) * 33, 1, 1, '#d9c7a3'); P.rect(cx + Math.cos(r) * 34, cy + Math.sin(r) * 34, 1, 1, '#a48f6c'); }
    for (let yy = -31; yy <= 31; yy++) { const w = Math.floor(Math.sqrt(31 * 31 - yy * yy)); P.rect(cx - w, cy + yy, 2 * w, 1, '#1b2231'); }
    for (let a = 0; a < 360; a += 30) { const r = a * Math.PI / 180, l = a % 90 === 0 ? 5 : 2; for (let k = 0; k < l; k++) P.rect(cx + Math.sin(r) * (30 - k), cy - Math.cos(r) * (30 - k), 1, 1, a === 0 ? '#d49ba4' : '#8f9ab3'); }
    const target = 40, ang = (target + 160 * Math.exp(-t * 1.6) * Math.sin(t * 9)) * Math.PI / 180;
    for (let k = -14; k <= 24; k += 0.5) { const w = k > 0; P.rect(cx + Math.sin(ang) * k, cy - Math.cos(ang) * k, w ? 2 : 1, w ? 2 : 1, w ? '#d49ba4' : '#e8e0d0'); }
    P.rect(cx - 1, cy - 1, 3, 3, '#e8b84a');
    if (t > 1.1) { const n = Math.min(8, Math.floor((t - 1.1) * 8)); for (let i = 0; i < n; i++) P.rect(104 + i * 5, 36 - i * 3, 2, 2, '#d9c7a3'); if (n >= 8) { P.rect(143, 7, 8, 3, '#7aa57f'); P.rect(145, 4, 4, 3, '#5b8a63'); } }
  },
  capitana(P, t) {
    P.sky(46);
    for (let i = 0; i < 3; i++) P.rect(((i * 70 - t * 6) % 200 + 200) % 200 - 20, 10 + i * 9, 18, 3, '#f1e6d6');
    const m = ((-t * 10) % 120 + 120) % 120 - 20;                                                   // isla en la lejanía
    for (let i = 0; i < 22; i++) P.rect(m + i, 44 - Math.min(i, 22 - i) * 0.9, 1, Math.min(i, 22 - i) * 0.9 + 1, '#3a4660');
    P.waves(t, 46, 18);
    P.rect(0, 66, W, 24, '#8a5a44'); P.rect(0, 66, W, 2, '#a8745a');
    for (let x = -((t * 48) % 24); x < W; x += 24) P.rect(x, 68, 1, 22, '#6e4636'); for (let y = 74; y < H; y += 8) P.rect(0, y, W, 1, '#6e4636');
    const f = Math.floor(t * 8) % 2, x = 62, y = 40 + (f ? 0 : -1);
    for (let i = 0; i < 7; i++) P.rect(x - 4 - i * 2, y + 12 + Math.sin(t * 14 + i) * 2 + i * 0.5, 3, 2, '#c46b78');   // bufanda al viento
    P.sprite(RUN[f], x, y, PAL, 2);
    gull(P, (170 - t * 16) % 200, 12, t);
  },
};

export function runBootLoader(canvas, { minMs = 1800, reduced = false } = {}) {
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const P = Painter(ctx), names = Object.keys(SCENES), scene = SCENES[names[Math.floor(Math.random() * names.length)]];
  const start = performance.now(); let raf;
  const frame = (now) => { scene(P, reduced ? 2.2 : (now - start) / 1000); if (!reduced) raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame);
  return { stop: () => cancelAnimationFrame(raf), minMs };
}
