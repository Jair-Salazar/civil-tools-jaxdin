"""
Panel de administración — TODAS las rutas exigen @admin_required (rol ADMIN comprobado en la base de datos).
Aunque alguien conozca la URL /admin o adivine estos endpoints, sin un token de ADMIN recibe 401/403.
"""
import json, platform, time
from flask import Blueprint, jsonify, request, g
from psycopg2 import sql
from psycopg2.extras import Json
from config.settings import Settings
from ..auth.decorators import admin_required, _load_user
from ..auth.security import hash_password
from ..db import fetch_all, fetch_one, execute, ping, cursor
from ..schemas import validators as v
from ..schemas.resources import RESOURCES, SPECIAL
from ..utils.audit import log_action
from ..utils.errors import AppError

bp = Blueprint("admin", __name__, url_prefix="/api/admin")
STARTED = time.time()


@bp.before_request
def _guard_all():
    """Red de seguridad extra: cualquier ruta nueva de este blueprint queda protegida por defecto."""
    if request.method == "OPTIONS":
        return None
    g.user = _load_user(True)
    if g.user["role"] != "ADMIN":
        raise AppError("No tienes permisos para esta acción.", 403, "forbidden")


@bp.get("/schema")
@admin_required
def schema():
    return jsonify({"resources": RESOURCES, "special": SPECIAL})

# ------------------------- Validación genérica -------------------------
def coerce(field, value):
    t, name, label = field["type"], field["name"], field["label"]
    empty = value is None or (isinstance(value, str) and value.strip() == "")
    err = lambda msg: AppError(f"{label}: {msg}", 400, "validation", {name: msg})
    if empty:
        if field.get("required"):
            raise err("es obligatorio")
        if t in ("int", "float"):
            return field.get("default")
        return None if t == "ref" else ("" if t in ("text", "longtext") else field.get("default"))
    if t in ("text", "longtext", "select"):
        if not isinstance(value, str):
            raise err("debe ser texto")
        value = value.strip()
        if len(value) > (20000 if t == "longtext" else 500):
            raise err("es demasiado largo")
        if t == "select" and value not in field["options"]:
            raise err("valor no permitido")
        if field.get("slug") and not v.SLUG_RE.match(value):
            raise err("usa solo minúsculas, números y guiones")
        return value
    if t in ("int", "ref"):
        try:
            return int(value)
        except (TypeError, ValueError):
            raise err("debe ser un número entero")
    if t == "float":
        try:
            f = float(value)
        except (TypeError, ValueError):
            raise err("debe ser un número")
        if field.get("nonzero") and f == 0:
            raise err("no puede ser cero")
        return f
    if t == "bool":
        if not isinstance(value, bool):
            raise err("debe ser verdadero o falso")
        return value
    if t == "json":
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except ValueError:
                raise err("no es un JSON válido")
        if len(json.dumps(value)) > 100000:
            raise err("es demasiado grande")
        return Json(value)
    raise err("tipo no soportado")


def clean_payload(res, data):
    cfg = RESOURCES[res]
    out = {}
    for f in cfg["fields"]:
        if f["name"] in data:
            out[f["name"]] = coerce(f, data[f["name"]])
        elif f.get("required") and "default" not in f:
            raise AppError(f"{f['label']}: es obligatorio", 400, "validation", {f["name"]: "es obligatorio"})
    if res == "tools":
        raw = data.get("definition", {})
        if isinstance(raw, str):
            raw = json.loads(raw) if raw.strip() else {}
        v.validate_tool_definition(raw, out.get("kind", "calculator"))
    return out


def get_cfg(res):
    if res not in RESOURCES:
        raise AppError("Recurso no encontrado.", 404, "not_found")
    return RESOURCES[res]

# ------------------------------ CRUD genérico ------------------------------
SPECIAL_SQL = {
    "users": ("SELECT id, email, full_name, role, is_active, created_at, last_login_at FROM users", ["email", "full_name"], "id"),
    "history": ("SELECT h.id, u.email, h.tool_name, h.inputs, h.result, h.created_at FROM calculation_history h LEFT JOIN users u ON u.id = h.user_id",
                ["u.email", "h.tool_name"], "h.id DESC"),
    "favorites": ("SELECT f.id, u.email, f.item_type, f.item_id, f.created_at FROM favorites f LEFT JOIN users u ON u.id = f.user_id",
                  ["u.email", "f.item_type"], "f.id DESC"),
    "logs": ("SELECT a.id, a.created_at, u.email, a.action, a.entity, a.entity_id, a.detail, a.ip FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id",
             ["u.email", "a.action", "a.entity"], "a.id DESC"),
}


@bp.get("/resources/<res>")
def list_rows(res):
    limit, offset = v.page_params(25, 200)
    q = request.args.get("q", "").strip()
    where, params = [], []
    if res in SPECIAL_SQL:
        base, search_cols, order = SPECIAL_SQL[res]
        order_sql = order
    else:
        cfg = get_cfg(res)
        base, search_cols, order_sql = f'SELECT * FROM "{cfg["table"]}"', cfg["search"], cfg["order"]
        for f in cfg["filters"]:                       # filtros f_<campo>=valor, solo campos declarados
            val = request.args.get(f"f_{f}")
            if val not in (None, ""):
                where.append(f'"{f}"::text = %s'); params.append(val)
    if q:
        where.append("(" + " OR ".join(f"{c}::text ILIKE %s" for c in search_cols) + ")")
        params += [v.like(q)] * len(search_cols)
    wh = (" WHERE " + " AND ".join(where)) if where else ""
    total = fetch_one(f"SELECT count(*) AS n FROM ({base}{wh}) AS x", params)["n"]
    rows = fetch_all(f"{base}{wh} ORDER BY {order_sql} LIMIT %s OFFSET %s", params + [limit, offset])
    return jsonify({"rows": rows, "total": total, "page": offset // limit + 1, "limit": limit})


@bp.post("/resources/<res>")
def create_row(res):
    cfg = get_cfg(res)
    data = clean_payload(res, v.json_body())
    cols = list(data.keys())
    query = sql.SQL("INSERT INTO {} ({}) VALUES ({}) RETURNING *").format(
        sql.Identifier(cfg["table"]), sql.SQL(", ").join(map(sql.Identifier, cols)), sql.SQL(", ").join(sql.Placeholder() * len(cols)))
    with cursor() as cur:
        cur.execute(query, [data[c] for c in cols])
        row = cur.fetchone()
    log_action("create", res, row["id"])
    return jsonify(row), 201


@bp.put("/resources/<res>/<int:rid>")
def update_row(res, rid):
    cfg = get_cfg(res)
    data = clean_payload(res, v.json_body())
    if not data:
        raise AppError("No hay cambios para guardar.", 400, "validation")
    cols = list(data.keys())
    query = sql.SQL("UPDATE {} SET {} WHERE id = %s RETURNING *").format(
        sql.Identifier(cfg["table"]), sql.SQL(", ").join(sql.SQL("{} = %s").format(sql.Identifier(c)) for c in cols))
    with cursor() as cur:
        cur.execute(query, [data[c] for c in cols] + [rid])
        row = cur.fetchone()
    if not row:
        raise AppError("Registro no encontrado.", 404, "not_found")
    log_action("update", res, rid)
    return jsonify(row)


@bp.delete("/resources/<res>/<int:rid>")
def delete_row(res, rid):
    tables = {k: c["table"] for k, c in RESOURCES.items()}
    tables.update({"history": "calculation_history", "favorites": "favorites", "logs": "audit_logs"})
    if res not in tables:
        raise AppError("Recurso no encontrado.", 404, "not_found")
    row = execute(sql.SQL("DELETE FROM {} WHERE id = %s RETURNING id").format(sql.Identifier(tables[res])), (rid,))
    if not row:
        raise AppError("Registro no encontrado.", 404, "not_found")
    log_action("delete", res, rid)
    return jsonify({"ok": True})

# -------------------------------- Usuarios --------------------------------
def _admins_count():
    return fetch_one("SELECT count(*) AS n FROM users WHERE role='ADMIN' AND is_active")["n"]


@bp.post("/users")
def create_user():
    data = v.json_body()
    role = data.get("role", "USER")
    if role not in ("ADMIN", "USER"):
        raise AppError("Rol inválido.", 400, "validation")
    row = execute("INSERT INTO users (email,password_hash,full_name,role) VALUES (%s,%s,%s,%s) RETURNING id,email,full_name,role,is_active",
                  (v.email(data), hash_password(v.password(data)), v.text(data, "full_name", "El nombre", required=False, max_len=100), role))
    log_action("create", "users", row["id"], {"role": role})
    return jsonify(row), 201


@bp.put("/users/<int:uid>")
def update_user(uid):
    data = v.json_body()
    user = fetch_one("SELECT * FROM users WHERE id=%s", (uid,))
    if not user:
        raise AppError("Usuario no encontrado.", 404, "not_found")
    role = data.get("role", user["role"])
    active = bool(data.get("is_active", user["is_active"]))
    if role not in ("ADMIN", "USER"):
        raise AppError("Rol inválido.", 400, "validation")
    if user["role"] == "ADMIN" and (role != "ADMIN" or not active) and _admins_count() <= 1:
        raise AppError("Debe existir al menos un administrador activo.", 400, "last_admin")
    if uid == g.user["id"] and not active:
        raise AppError("No puedes desactivar tu propia cuenta.", 400, "validation")
    name = v.text(data, "full_name", "El nombre", required=False, max_len=100, default=user["full_name"])
    execute("UPDATE users SET role=%s, is_active=%s, full_name=%s WHERE id=%s RETURNING id", (role, active, name, uid))
    if data.get("password"):
        execute("UPDATE users SET password_hash=%s WHERE id=%s RETURNING id", (hash_password(v.password(data)), uid))
    log_action("update", "users", uid, {"role": role, "is_active": active})
    return jsonify({"ok": True})


@bp.delete("/users/<int:uid>")
def delete_user(uid):
    user = fetch_one("SELECT role FROM users WHERE id=%s", (uid,))
    if not user:
        raise AppError("Usuario no encontrado.", 404, "not_found")
    if uid == g.user["id"]:
        raise AppError("No puedes eliminar tu propia cuenta.", 400, "validation")
    if user["role"] == "ADMIN" and _admins_count() <= 1:
        raise AppError("Debe existir al menos un administrador activo.", 400, "last_admin")
    execute("DELETE FROM users WHERE id=%s RETURNING id", (uid,))
    log_action("delete", "users", uid)
    return jsonify({"ok": True})

# --------------------------- Estadísticas y estado ---------------------------
@bp.get("/stats")
def stats():
    counts = fetch_one("""SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM categories) AS categories,
        (SELECT count(*) FROM tools) AS tools, (SELECT count(*) FROM formulas) AS formulas, (SELECT count(*) FROM materials) AS materials,
        (SELECT count(*) FROM units) AS units, (SELECT count(*) FROM notes) AS notes, (SELECT count(*) FROM favorites) AS favorites,
        (SELECT count(*) FROM calculation_history) AS calculations""")
    per_day = fetch_all("""SELECT d::date AS day, count(h.id) AS total FROM generate_series(current_date - 13, current_date, interval '1 day') d
        LEFT JOIN calculation_history h ON h.created_at::date = d::date GROUP BY d ORDER BY d""")
    top = fetch_all("SELECT tool_name, count(*) AS uses FROM calculation_history GROUP BY tool_name ORDER BY uses DESC LIMIT 6")
    return jsonify({"counts": counts, "per_day": per_day, "top_tools": top})


@bp.get("/status")
def status():
    info = ping()
    recent = fetch_one("SELECT count(*) AS n FROM audit_logs WHERE created_at > now() - interval '24 hours'")["n"]
    return jsonify({"api": "ok", "database": "ok", "postgres": info["version"].split(",")[0], "server_time": info["now"],
                    "python": platform.python_version(), "environment": Settings.ENV, "version": Settings.APP_VERSION,
                    "uptime_seconds": int(time.time() - STARTED), "allowed_origins": Settings.CORS_ORIGINS,
                    "registration_enabled": Settings.ALLOW_REGISTRATION, "log_events_24h": recent})
