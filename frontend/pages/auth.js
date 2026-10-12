// Inicio de sesión y registro.
import { h } from '../utils/dom.js';
import { card, button, field, input, toast, alert } from '../components/ui.js';
import { login, register } from '../services/session.js';
import { api } from '../services/api.js';
import { navigate } from '../utils/router.js';
import { brand } from '../components/layout.js';

export function loginPage() {
  let mode = 'login'; const root = h('div', { class: 'auth-box' });
  const draw = (registration = true) => {
    const email = input({ type: 'email', autocomplete: 'email', required: true }), pass = input({ type: 'password', autocomplete: mode === 'login' ? 'current-password' : 'new-password' }), name = input({ autocomplete: 'name' });
    const fe = field('Correo', email), fp = field('Contraseña', pass, { hint: mode === 'register' ? 'Mínimo 8 caracteres.' : undefined }), fnm = field('Nombre', name); const err = h('div'); const btn = button(mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta', { variant: 'primary', type: 'submit' });
    const form = h('form', { class: 'stack', novalidate: true, onSubmit: async (e) => {
      e.preventDefault(); err.replaceChildren(); fe.setError(''); fp.setError('');
      if (!email.value.trim()) return fe.setError('Ingresa tu correo.'); if (!pass.value) return fp.setError('Ingresa tu contraseña.');
      btn.disabled = true;
      try { mode === 'login' ? await login(email.value.trim(), pass.value) : await register({ email: email.value.trim(), password: pass.value, full_name: name.value }); toast(mode === 'login' ? 'Sesión iniciada' : 'Cuenta creada'); navigate('/'); }
      catch (ex) { err.replaceChildren(alert('err', ex.message)); btn.disabled = false; } } }, mode === 'register' && fnm, fe, fp, err, btn);
    root.replaceChildren(h('div', { style: 'display:flex;justify-content:center;margin-bottom:18px' }, brand()), card([h('h2', null, mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'), form,
      registration && h('p', { class: 'muted small', style: 'margin:16px 0 0' }, mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? ', h('a', { href: '#/login', onClick: (e) => { e.preventDefault(); mode = mode === 'login' ? 'register' : 'login'; draw(registration); } }, mode === 'login' ? 'Crear una' : 'Iniciar sesión'))]));
  };
  draw(); api.publicSettings().then((s) => { if (!s.registration_enabled) { mode = 'login'; draw(false); } }).catch(() => {});
  return root;
}
