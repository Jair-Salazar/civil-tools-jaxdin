# API REST — resumen

Base: `http://127.0.0.1:5000/api`. Errores: `{"error":{"code","message","fields?"}}`. Autenticación: `Authorization: Bearer <token>`.

| Público | |
|---|---|
| GET `/health` · `/settings/public` | estado / ajustes visibles |
| GET `/categories` · `/tools?category=&q=` · `/tools/:id` | catálogo |
| GET `/formulas?category=&q=&tool_id=&featured=1` · `/formulas/:id` | fórmulas (detalle con variables) |
| GET `/units` · `/materials?q=&category=` · `/materials/:id` | unidades y materiales |
| GET `/search?q=` | búsqueda global agrupada (incluye notas si hay sesión) |
| POST `/auth/login` · `/auth/register` | devuelve `{token, user}` |

| Con sesión (USER o ADMIN) | |
|---|---|
| GET `/auth/me` · PUT `/auth/preferences` · PUT `/auth/password` | cuenta |
| GET/POST `/notes` · PUT/DELETE `/notes/:id` | notas (`?q=&category=&favorite=1`) |
| GET/POST `/favorites` · DELETE `/favorites/:id` | `{item_type: tool|formula|material, item_id}` |
| GET/POST `/history` · DELETE `/history/:id` · DELETE `/history` | historial (`?tool_id=&limit=`) |
| GET `/me/stats` | estadísticas personales |

| Solo ADMIN (`/admin/...`) | |
|---|---|
| GET `/schema` | descripción de recursos para el panel |
| GET/POST `/resources/:res` · PUT/DELETE `/resources/:res/:id` | `categories, tools, formulas, formula_variables, units, materials, settings` |
| GET `/resources/{users,history,favorites,logs}` · DELETE `/resources/{history,favorites,logs}/:id` | lectura y borrado |
| POST `/users` · PUT/DELETE `/users/:id` | usuarios y roles |
| GET `/stats` · `/status` | estadísticas y estado del sistema |

Listados admin: `?q=&page=&limit=&f_<campo>=valor`.
