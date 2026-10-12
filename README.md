# CIVIL TOOLS — JAXDIN

Aplicación web de herramientas para Ingeniería Civil: cálculos, biblioteca de fórmulas y materiales, conversor de unidades, calculadora científica, notas, favoritos, historial y un panel de administración privado.

> "CIVIL TOOLS" es la identidad funcional; "JAXDIN" es la marca secundaria.

## Arquitectura

```text
GitHub Pages  (frontend: HTML + CSS + JavaScript, sin build)
      │  fetch() · JSON · Authorization: Bearer <token>
      ▼
REST API  (Flask, /api/...)      ← autenticación JWT, roles ADMIN/USER, validación, CORS
      │  SQL parametrizado (psycopg2)
      ▼
PostgreSQL 17
```

El frontend es estático e independiente: solo conoce la URL de la API (`frontend/config.js`). La navegación usa rutas con `#` (`#/herramientas/topografia/pendiente`), por eso funciona en GitHub Pages sin configuración y sin errores 404 al recargar.

**Idea central: el contenido es dato, no código.** Categorías, herramientas, fórmulas, unidades y materiales viven en PostgreSQL. Cada herramienta de cálculo se describe con un JSON (`tools.definition`) y el frontend dibuja el formulario, calcula y muestra el procedimiento automáticamente. Para agregar una herramienta no se toca el frontend: se crea desde `/admin`.

## Estructura

```text
civil-tools-jaxdin/
├── frontend/
│   ├── index.html · app.js · config.js · manifest.webmanifest · sw.js
│   ├── styles/       tokens (colores, modo oscuro), base, layout, components, pages, loader
│   ├── components/   ui.js (botones, modales, toasts…), layout.js (header/sidebar/footer), icons.js
│   ├── pages/        dashboard, tools, runner, converter, calculator, library, myspace, preferences, auth, admin, search
│   ├── services/     api.js (TODA la comunicación con el backend), session.js (login, favoritos)
│   ├── utils/        router.js (hash), expr.js (evaluador seguro, sin eval), store.js, format.js, dom.js
│   ├── animations/   loader.js (escenas pixel art originales)
│   └── tests/        expr.test.mjs
├── backend/
│   ├── run.py · create_admin.py · init_db.py · requirements.txt · .env.example
│   ├── config/settings.py       variables de entorno
│   ├── app/
│   │   ├── __init__.py          fábrica de la app (CORS, blueprints, errores)
│   │   ├── db.py                pool de conexiones + fetch_all / fetch_one / execute
│   │   ├── auth/                security.py (hash, JWT) · decorators.py (@login_required, @admin_required)
│   │   ├── routes/              system, auth, catalog, user, search, admin
│   │   ├── schemas/             validators.py · resources.py (qué tablas se administran)
│   │   └── utils/               errors.py · audit.py
│   └── tests/
├── database/   schema.sql · seed.sql · generate_seed.py
└── docs/       API.md · AGREGAR_CONTENIDO.md · DEPLOY.md
```

## Instalación en tu PC (Windows + VS Code + pgAdmin 17)

### 1. Base de datos (pgAdmin)
1. Abre pgAdmin → clic derecho en **Databases → Create → Database…** → nombre `civil_tools`.
2. Clic derecho sobre `civil_tools` → **Query Tool**.
3. Abre `database/schema.sql` (icono de carpeta), ejecuta con **F5**. Crea todas las tablas.
4. Abre `database/seed.sql`, ejecuta con **F5**. Carga 8 categorías, 46 herramientas, 9 fórmulas, 6 materiales y 73 unidades de demostración.

> Alternativa por terminal: `python init_db.py` (después de configurar `.env`).

### 2. Backend (VS Code, terminal en la carpeta `backend`)
```powershell
python -m venv .venv
.venv\Scripts\activate                 # en Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env                 # en Mac/Linux: cp .env.example .env
```
Edita `backend/.env`:
- `DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/civil_tools`
- `SECRET_KEY=` genera una con `python -c "import secrets; print(secrets.token_hex(32))"`
- `ADMIN_EMAIL=` tu correo de administrador.

Crea tu cuenta de administrador (te pedirá la contraseña sin mostrarla) y arranca:
```powershell
python create_admin.py
python run.py                          # API en http://127.0.0.1:5000
```
Comprueba: abre `http://127.0.0.1:5000/api/health` → `{"status":"ok", ...}`.

### 3. Frontend
En VS Code instala la extensión **Live Server**, clic derecho en `frontend/index.html` → **Open with Live Server** (normalmente `http://127.0.0.1:5500`). Esa dirección ya está permitida en `CORS_ORIGINS`. Si usas otro puerto, agrégalo en `.env` y reinicia el backend.

Alternativa: `cd frontend` y `python -m http.server 5500`.

### 4. Probar
- Entra a `#/login`, crea una cuenta de usuaria o inicia con tu cuenta ADMIN.
- Con la cuenta ADMIN aparece **Administración** en el menú (`#/admin`).

## Pruebas
```powershell
node --test frontend/tests/expr.test.mjs      # evaluador matemático (Node 18+)
cd backend ; pytest tests                     # validadores, hash y JWT (no necesita base de datos)
```

## Seguridad aplicada
- Contraseñas con hash (scrypt/Werkzeug); nunca en texto plano. JWT firmado con `SECRET_KEY` (expira, por defecto 12 h).
- **Autorización en el backend**: todo `/api/admin/*` exige rol ADMIN comprobado en la base de datos en cada petición (no solo en el token) y tiene un `before_request` que protege cualquier ruta nueva por defecto. Ocultar `/admin` en el frontend es solo comodidad.
- SQL siempre parametrizado; los nombres de tabla/columna del panel salen de una lista blanca (`schemas/resources.py`).
- Validación en frontend (comodidad) y backend (la que cuenta). CORS con lista blanca de orígenes.
- Límite de intentos de login (5 por 15 min por IP+correo). Mensaje idéntico para correo inexistente o contraseña errónea.
- El frontend nunca usa `innerHTML` (el helper `h()` crea nodos DOM) → sin XSS por contenido de usuario. La calculadora usa un analizador propio, sin `eval()`.
- `.env` en `.gitignore`; solo se sube `.env.example`.
- Pendiente para producción: HTTPS obligatorio, rate limiting con Redis si hay varios procesos, rotación de `SECRET_KEY`.

## Preferencias vs. Administración
- **Preferencias** (`#/preferencias`): tema, animación de inicio, avisos, calculadora, limpiar historial. Solo opciones personales.
- **Administración** (`#/admin`): contenido, usuarios, historial, logs, estadísticas y estado. Solo ADMIN.

## Documentación adicional
- `docs/AGREGAR_CONTENIDO.md` — cómo crear categorías, herramientas, fórmulas, unidades y materiales.
- `docs/API.md` — referencia de endpoints.
- `docs/DEPLOY.md` — GitHub Pages + backend + PostgreSQL en la nube.

## Easter egg de carga
Al abrir o recargar aparece una escena pixel art **original** (canvas, sin imágenes externas) con aire de aventura pirata; se elige al azar entre tres: un barco con bandera de casco de obra, una brújula tipo "Log Pose" que encuentra su rumbo, y una capitana con casco corriendo por la cubierta. Dura ~1,7 s y se puede desactivar en Preferencias → *Animación de inicio*. Respeta `prefers-reduced-motion`. Código: `frontend/animations/loader.js`.

## PWA / Android (preparado, no activado)
Ya incluye `manifest.webmanifest` y `sw.js`. Para activar el modo instalable pon `ENABLE_SW: true` en `frontend/config.js`. Más adelante la PWA puede empaquetarse como app Android (TWA/Bubblewrap o Capacitor).

## Mejoras futuras
Gráficos en el historial, exportar a PDF/Excel, plantillas de metrado por proyecto, más unidades y normas, notas con Markdown, recuperación de contraseña por correo, paginación en notas, pruebas de integración de la API.
