# Despliegue

## 1. PostgreSQL en la nube
Crea una base gestionada (Neon, Supabase, Render, Railway…). Copia la cadena de conexión y ejecuta `schema.sql` y `seed.sql` (desde pgAdmin conectando al servidor remoto, o `python init_db.py` con `DATABASE_URL` apuntando a él).

## 2. Backend (ejemplo: Render / Railway)
- Raíz del servicio: `backend` · Build: `pip install -r requirements.txt` · Start: `gunicorn run:app`
- Variables de entorno: `APP_ENV=production`, `SECRET_KEY` (larga y aleatoria), `DATABASE_URL`, `CORS_ORIGINS=https://TUUSUARIO.github.io`, `ALLOW_REGISTRATION=true|false`.
- Crea el admin una vez en producción: ejecuta `python create_admin.py` en la consola del servicio (con `ADMIN_EMAIL`/`ADMIN_PASSWORD` temporales).
- Verifica `https://TU-API/api/health`.

## 3. Frontend en GitHub Pages
1. Edita `frontend/config.js`: `API_URL: 'https://TU-API/api'`.
2. Sube el repositorio. En GitHub: Settings → Pages → *Deploy from a branch* → carpeta `/frontend` (si no te deja elegir `/frontend`, copia su contenido a `/docs` o usa una rama `gh-pages`).
3. La app queda en `https://TUUSUARIO.github.io/NOMBRE-REPO/`. Todas las rutas son relativas y la navegación usa `#`, así que no hay problemas de subcarpeta.
4. Agrega ese origen (`https://TUUSUARIO.github.io`, sin ruta final) a `CORS_ORIGINS` del backend.

## 4. Lista de verificación
HTTPS en ambos lados · `.env` fuera de Git · `SECRET_KEY` única · contraseña de admin fuerte · copias de seguridad de la base.
