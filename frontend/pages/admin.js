// Panel de administración. Es genérico: se dibuja a partir de GET /api/admin/schema.
// La SEGURIDAD real está en el backend (cada endpoint exige rol ADMIN); aquí solo se oculta lo que no corresponde.
import { h } from '../utils/dom.js';
import { card, button, breadcrumbs, pageHead, field, input, textarea, select, modal, confirmDialog, toast, table, emptyState, errorState, alert, badge } from '../components/ui.js';
import { debounce } from '../utils/dom.js';
import { api } from '../services/api.js';
import { isAdmin } from '../utils/store.js';
import { fmtDate } from '../utils/format.js';
import { asyncView } from './common.js';

const SECTIONS = [['resumen', 'Resumen'], ['categories', 'Categorías'], ['tools', 'Herramientas'], ['formulas', 'Fórmulas'], ['formula_variables', 'Variables'], ['units', 'Unidades'], ['materials', 'Materiales'], ['users', 'Usuarios'], ['history', 'Historial'], ['favorites', 'Favoritos'], ['logs', 'Logs'], ['settings', 'Configuración']];
const show = (v) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'Sí' : 'No') : /^\d{4}-\d\d-\d\dT/.test(String(v)) ? fmtDate(v) : typeof v === 'object' ? JSON.stringify(v) : String(v));

export function adminPage({ params }) {
  const sec = params.section || 'resumen';
  const body = !isAdmin() ? emptyState('Acceso restringido', 'Esta sección es solo para administradores.') : sec === 'resumen' ? overview() : resourceView(sec);
  return h('div', null, breadcrumbs([{ label: 'Inicio', href: '/' }, { label: 'Administración', href: '/admin' }, { label: SECTIONS.find((s) => s[0] === sec)?.[1] || sec }]), pageHead('Administración', 'Contenido, usuarios y estado del sistema.'),
    h('nav', { class: 'admin-nav', 'aria-label': 'Secciones de administración' }, SECTIONS.map(([k, l]) => h('a', { class: `chip ${k === sec ? 'active' : ''}`, href: `#/admin/${k}` }, l))), body);
}

function overview() {
  return asyncView(() => Promise.all([api.admin.stats(), api.admin.status()]), ([s, st]) => {
    const max = Math.max(1, ...s.per_day.map((d) => d.total)); const labels = { users: 'Usuarios', categories: 'Categorías', tools: 'Herramientas', formulas: 'Fórmulas', materials: 'Materiales', units: 'Unidades', notes: 'Notas', favorites: 'Favoritos', calculations: 'Cálculos' };
    const up = st.uptime_seconds; const upText = up > 3600 ? `${Math.floor(up / 3600)} h ${Math.floor((up % 3600) / 60)} min` : `${Math.floor(up / 60)} min`;
    return h('div', { class: 'stack' }, h('div', { class: 'grid grid-3' }, Object.entries(labels).map(([k, l]) => card([h('div', { class: 'stat' }, h('b', null, s.counts[k]), h('span', null, l))]))),
      h('div', { class: 'grid grid-2', style: 'grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))' },
        card([h('h3', null, 'Cálculos en los últimos 14 días'), h('div', { class: 'bars', role: 'img', 'aria-label': 'Cálculos por día' }, s.per_day.map((d) => h('div', { style: `height:${(d.total / max) * 100}%`, title: `${d.day}: ${d.total}` })))]),
        card([h('h3', null, 'Herramientas más usadas'), s.top_tools.length ? h('ol', { style: 'padding-left:20px;margin:0' }, s.top_tools.map((t) => h('li', null, `${t.tool_name} — ${t.uses}`))) : h('p', { class: 'muted' }, 'Aún no hay datos.')])),
      card([h('h3', null, 'Estado del sistema'), h('div', { class: 'grid grid-3' }, [['API', st.api], ['Base de datos', st.database], ['PostgreSQL', st.postgres], ['Python', st.python], ['Entorno', st.environment], ['Versión', st.version], ['Tiempo activo', upText], ['Eventos 24 h', st.log_events_24h], ['Registro abierto', st.registration_enabled ? 'Sí' : 'No']].map(([k, v]) => h('div', { class: 'stat' }, h('b', { style: 'font-size:1.05rem' }, String(v)), h('span', null, k)))), h('p', { class: 'muted small', style: 'margin-top:12px' }, `Orígenes CORS permitidos: ${st.allowed_origins.join(', ')}`)]));
  });
}

function resourceView(res) {
  const root = h('div');
  const run = async () => {
    let schema; try { schema = await api.admin.schema(); } catch (e) { return root.replaceChildren(errorState(e, run)); }
    const cfg = schema.resources[res], sp = schema.special[res]; if (!cfg && !sp) return root.replaceChildren(emptyState('Sección no encontrada', 'Elige otra del menú.'));
    const cols = (cfg?.list_columns || sp.list_columns); const label = cfg?.label || sp.label; let q = '', page = 1, filters = {}; const list = h('div'), pager = h('div', { class: 'pager' });
    const search = input({ type: 'search', placeholder: `Buscar en ${label.toLowerCase()}…`, 'aria-label': 'Buscar' });
    const filterSelects = [];
    async function load() {
      list.replaceChildren(h('div', { class: 'loading' }, h('div', { class: 'spinner' })));
      try {
        const data = await api.admin.list(res, { q, page, limit: 25, ...Object.fromEntries(Object.entries(filters).map(([k, v]) => [`f_${k}`, v])) });
        const canEdit = !!cfg || sp?.kind === 'users';
        list.replaceChildren(table([...cols.map((c) => ({ label: c, render: (r) => h('span', { class: 'truncate', style: 'display:inline-block', title: show(r[c]) }, show(r[c])) })),
          { label: '', cls: 'actions', render: (r) => h('span', null, canEdit && button('', { variant: 'ghost', size: 'sm', icon: 'edit', tip: 'Editar', ariaLabel: 'Editar', onClick: () => (sp?.kind === 'users' ? editUser(r) : editRow(r)) }),
            button('', { variant: 'ghost', size: 'sm', icon: 'trash', tip: 'Eliminar', ariaLabel: 'Eliminar', onClick: () => remove(r) })) }], data.rows, { empty: emptyState('Sin registros', 'No hay datos que coincidan.') }));
        const pages = Math.max(1, Math.ceil(data.total / data.limit));
        pager.replaceChildren(h('span', { class: 'muted small' }, `${data.total} registros · página ${data.page} de ${pages}`), h('span', { class: 'row' }, button('Anterior', { size: 'sm', disabled: page <= 1, onClick: () => { page--; load(); } }), button('Siguiente', { size: 'sm', disabled: page >= pages, onClick: () => { page++; load(); } })));
      } catch (e) { list.replaceChildren(errorState(e, load)); pager.replaceChildren(); }
    }
    async function remove(r) {
      if (!(await confirmDialog({ message: `¿Eliminar el registro #${r.id}? Puede afectar datos relacionados.` }))) return;
      try { sp?.kind === 'users' ? await api.admin.deleteUser(r.id) : await api.admin.remove(res, r.id); toast('Registro eliminado'); load(); } catch (e) { toast(e.message, 'err'); }
    }
    async function refOptions(f) { const d = await api.admin.list(f.ref, { limit: 200 }); return [['', '— ninguna —'], ...d.rows.map((r) => [r.id, `${r.name || r.key || r.symbol || r.id}`])]; }
    async function editRow(row) {
      const inputs = {}, fields = []; const isNew = !row;
      for (const f of cfg.fields) {
        let el, val = row ? row[f.name] : f.default;
        if (f.type === 'bool') { el = h('input', { type: 'checkbox' }); el.checked = !!val; el.read = () => el.checked; fields.push(h('label', { class: 'check' }, el, f.label)); inputs[f.name] = { el }; continue; }
        if (f.type === 'longtext') { el = textarea({ rows: 3 }); el.value = val ?? ''; el.read = () => el.value; }
        else if (f.type === 'json') { el = textarea({ class: 'textarea json-area' }); el.value = JSON.stringify(val ?? f.default ?? {}, null, 2); el.read = () => el.value; }
        else if (f.type === 'select') { el = select(f.options, val ?? f.options[0]); el.read = () => el.value; }
        else if (f.type === 'ref') { el = select(await refOptions(f), val ?? ''); el.read = () => el.value; }
        else { el = input({ type: ['int', 'float'].includes(f.type) ? 'text' : 'text', inputmode: ['int', 'float'].includes(f.type) ? 'decimal' : undefined }); el.value = val ?? ''; el.read = () => el.value; }
        const fl = field(f.label + (f.required ? ' *' : ''), el, { hint: f.help }); inputs[f.name] = { el, fl }; fields.push(fl);
        if (f.template !== undefined && f.type === 'json') fields.push(button('Insertar plantilla', { size: 'sm', onClick: () => { el.value = JSON.stringify(f.template, null, 2); } }));
      }
      modal({ title: isNew ? `Nuevo: ${label}` : `Editar #${row.id}`, wide: true, body: h('div', { class: 'stack' }, fields),
        footer: (close) => [button('Cancelar', { onClick: close }), button('Guardar', { variant: 'primary', onClick: async () => {
          const payload = {}; for (const f of cfg.fields) { const v = inputs[f.name].el.read ? inputs[f.name].el.read() : inputs[f.name].el.checked; payload[f.name] = f.type === 'bool' ? v : (f.type === 'json' ? v : v === '' ? null : v); }
          Object.values(inputs).forEach((i) => i.fl?.setError(''));
          try { isNew ? await api.admin.create(res, payload) : await api.admin.update(res, row.id, payload); toast('Guardado'); close(); load(); }
          catch (e) { Object.entries(e.fields || {}).forEach(([k, m]) => inputs[k]?.fl?.setError(m)); toast(e.message, 'err'); } } })] });
    }
    function editUser(row) {
      const email = input({ type: 'email', value: row?.email || '', disabled: !!row }), nm = input({ value: row?.full_name || '' }), role = select(['USER', 'ADMIN'], row?.role || 'USER'), act = h('input', { type: 'checkbox' }), pw = input({ type: 'password', autocomplete: 'new-password' }); act.checked = row ? row.is_active : true;
      modal({ title: row ? `Editar usuario #${row.id}` : 'Nuevo usuario', body: h('div', { class: 'stack' }, field('Correo', email), field('Nombre', nm), field('Rol', role), h('label', { class: 'check' }, act, 'Cuenta activa'), field(row ? 'Nueva contraseña (opcional)' : 'Contraseña', pw, { hint: 'Mínimo 8 caracteres.' })),
        footer: (close) => [button('Cancelar', { onClick: close }), button('Guardar', { variant: 'primary', onClick: async () => { try { row ? await api.admin.updateUser(row.id, { full_name: nm.value, role: role.value, is_active: act.checked, password: pw.value || undefined }) : await api.admin.createUser({ email: email.value, full_name: nm.value, role: role.value, password: pw.value }); toast('Guardado'); close(); load(); } catch (e) { toast(e.message, 'err'); } } })] });
    }
    search.addEventListener('input', debounce(() => { q = search.value.trim(); page = 1; load(); }));
    const tb = h('div', { class: 'toolbar' }, h('div', { class: 'search' }, search));
    for (const fname of cfg?.filters || []) { const f = cfg.fields.find((x) => x.name === fname); if (f?.ref) { const s = select(await refOptions(f).catch(() => [['', '—']]), ''); s.setAttribute('aria-label', `Filtrar por ${f.label}`); s.addEventListener('change', () => { filters[fname] = s.value; page = 1; load(); }); tb.append(s); } }
    if (cfg || sp?.kind === 'users') tb.append(button('Nuevo', { variant: 'primary', icon: 'plus', onClick: () => (sp?.kind === 'users' ? editUser() : editRow()) }));
    root.replaceChildren(h('h2', null, label), res === 'tools' ? alert('info', 'En el campo “definición” se describen las entradas y fórmulas de cada herramienta (ver docs/AGREGAR_CONTENIDO.md). El frontend las dibuja automáticamente.') : null, tb, list, pager); load();
  };
  run(); return root;
}
