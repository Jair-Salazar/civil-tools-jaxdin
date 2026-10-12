// Preferencias de la usuaria (solo opciones personales; NADA técnico del sistema).
import { h } from '../utils/dom.js';
import { card, button, breadcrumbs, pageHead, switchEl, confirmDialog, toast, field, input } from '../components/ui.js';
import { state } from '../utils/store.js';
import { api } from '../services/api.js';
import { savePrefs, logout } from '../services/session.js';
import { navigate } from '../utils/router.js';

export function preferencesPage() {
  const row = (title, desc, control) => h('div', { class: 'pref-row' }, h('div', null, h('b', null, title), h('p', null, desc)), control);
  const seg = (opts, cur, onPick) => { const b = h('div', { class: 'seg' }); const draw = (c) => b.replaceChildren(...opts.map(([v, l]) => h('button', { type: 'button', class: c === v ? 'on' : '', onClick: () => { onPick(v); draw(v); } }, l))); draw(cur); return b; };
  const dec = h('select', { class: 'select', style: 'width:auto', 'aria-label': 'Decimales', onChange: (e) => savePrefs({ calcDecimals: +e.target.value }) }, [2, 3, 4, 6, 8].map((n) => h('option', { value: n }, `${n} decimales`))); dec.value = state.prefs.calcDecimals;
  const cur = input({ type: 'password', autocomplete: 'current-password' }), nw = input({ type: 'password', autocomplete: 'new-password' }); const fc = field('Contraseña actual', cur), fn = field('Nueva contraseña', nw, { hint: 'Mínimo 8 caracteres.' });
  const account = state.user ? card([h('h3', null, 'Cuenta'), h('p', { class: 'muted' }, state.user.email), h('div', { class: 'stack', style: 'max-width:340px' }, fc, fn,
    button('Cambiar contraseña', { onClick: async () => { fc.setError(''); fn.setError(''); try { await api.changePassword({ current: cur.value, new: nw.value }); toast('Contraseña actualizada'); cur.value = nw.value = ''; } catch (e) { (e.fields?.current ? fc : fn).setError(e.message); } } })),
    h('div', { style: 'margin-top:16px' }, button('Cerrar sesión', { icon: 'logout', onClick: () => { logout(); navigate('/'); } }))]) : null;
  return h('div', null, breadcrumbs([{ label: 'Inicio', href: '/' }, { label: 'Preferencias' }]), pageHead('Preferencias', 'Personaliza la apariencia y el comportamiento de la aplicación.'),
    h('div', { class: 'stack', style: 'max-width:760px' },
      card([h('h3', null, 'Apariencia'), row('Tema', 'Claro u oscuro; se recuerda en este dispositivo.', seg([['light', '☀ Claro'], ['dark', '🌙 Oscuro']], state.prefs.theme, (v) => savePrefs({ theme: v }))),
        row('Animación de inicio', 'La pequeña escena que aparece al abrir o recargar la aplicación.', switchEl(state.prefs.bootAnimation, (v) => { savePrefs({ bootAnimation: v }); localStorage.setItem('ct_boot', v ? 'on' : 'off'); toast(v ? 'Animación activada' : 'Animación desactivada'); }, 'Animación de inicio')),
        row('Menú lateral contraído', 'Muestra solo los iconos en pantallas grandes.', switchEl(state.prefs.sidebarCollapsed, (v) => savePrefs({ sidebarCollapsed: v }), 'Menú contraído'))]),
      card([h('h3', null, 'Notificaciones'), row('Avisos en pantalla', 'Mensajes breves al guardar, copiar o eliminar. Los errores siempre se muestran.', switchEl(state.prefs.notifications, (v) => savePrefs({ notifications: v }), 'Avisos'))]),
      card([h('h3', null, 'Calculadora'), row('Modo angular', 'Unidad para sin, cos y tan.', seg([['deg', 'Grados'], ['rad', 'Radianes']], state.prefs.calcAngle, (v) => savePrefs({ calcAngle: v }))), row('Precisión', 'Decimales mostrados en los resultados.', dec)]),
      card([h('h3', null, 'Datos'), row('Historial de cálculos', 'Elimina todos los cálculos guardados en tu cuenta.', button('Limpiar historial', { variant: 'danger', icon: 'trash', onClick: async () => { if (!state.user) return toast('Inicia sesión para administrar tu historial.', 'err'); if (await confirmDialog({ title: 'Limpiar historial', message: 'Se eliminarán todos tus cálculos guardados.', confirmLabel: 'Limpiar todo' })) { try { await api.clearHistory(); toast('Historial limpio'); } catch (e) { toast(e.message, 'err'); } } } }))]), account));
}
