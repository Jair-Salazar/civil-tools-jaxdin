"""Datos personales de cada usuaria: notas, favoritos e historial. Todas las rutas exigen sesión
y SIEMPRE filtran por g.user["id"], así nadie puede leer ni tocar datos de otra persona."""
import json
from flask import Blueprint, jsonify, request, g
from psycopg2.extras import Json
from ..auth.decorators import login_required
from ..db import fetch_all, fetch_one, execute
from ..schemas import validators as v
from ..utils.errors import AppError

bp = Blueprint("user", __name__, url_prefix="/api")

# ------------------------------- NOTAS -------------------------------
@bp.get("/notes")
@login_required
def list_notes():
    where, params = ["user_id = %s"], [g.user["id"]]
    if request.args.get("q"):
        where.append("(title ILIKE %s OR content ILIKE %s)"); params += [v.like(request.args["q"])] * 2
    if request.args.get("category"):
        where.append("category = %s"); params.append(request.args["category"])
    if request.args.get("favorite") == "1":
        where.append("is_favorite")
    return jsonify(fetch_all(f"SELECT * FROM notes WHERE {' AND '.join(where)} ORDER BY is_favorite DESC, updated_at DESC", params))


def _note_fields(data):
    return (v.text(data, "title", "El título", max_len=150), v.text(data, "content", "El contenido", required=False, max_len=20000),
            v.text(data, "category", "La categoría", required=False, max_len=60, default="General") or "General",
            bool(data.get("is_favorite", False)))


@bp.post("/notes")
@login_required
def create_note():
    title, content, cat, fav = _note_fields(v.json_body())
    row = execute("INSERT INTO notes (user_id,title,content,category,is_favorite) VALUES (%s,%s,%s,%s,%s) RETURNING *",
                  (g.user["id"], title, content, cat, fav))
    return jsonify(row), 201


@bp.put("/notes/<int:nid>")
@login_required
def update_note(nid):
    title, content, cat, fav = _note_fields(v.json_body())
    row = execute("UPDATE notes SET title=%s, content=%s, category=%s, is_favorite=%s, updated_at=now() "
                  "WHERE id=%s AND user_id=%s RETURNING *", (title, content, cat, fav, nid, g.user["id"]))
    if not row:
        raise AppError("Nota no encontrada.", 404, "not_found")
    return jsonify(row)


@bp.delete("/notes/<int:nid>")
@login_required
def delete_note(nid):
    if not execute("DELETE FROM notes WHERE id=%s AND user_id=%s RETURNING id", (nid, g.user["id"])):
        raise AppError("Nota no encontrada.", 404, "not_found")
    return jsonify({"ok": True})

# ----------------------------- FAVORITOS -----------------------------
FAV_SQL = """
    SELECT f.id, f.item_type, f.item_id, f.created_at,
           COALESCE(t.name, fo.name, m.name) AS name,
           COALESCE(t.description, fo.description, m.description) AS description,
           c.slug AS category_slug, t.slug AS tool_slug
    FROM favorites f
    LEFT JOIN tools t     ON f.item_type = 'tool'     AND t.id  = f.item_id
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN formulas fo ON f.item_type = 'formula'  AND fo.id = f.item_id
    LEFT JOIN materials m ON f.item_type = 'material' AND m.id  = f.item_id
    WHERE f.user_id = %s
"""
FAV_TABLES = {"tool": "tools", "formula": "formulas", "material": "materials"}


@bp.get("/favorites")
@login_required
def list_favorites():
    return jsonify(fetch_all(FAV_SQL + " ORDER BY f.created_at DESC", (g.user["id"],)))


@bp.post("/favorites")
@login_required
def add_favorite():
    data = v.json_body()
    kind = data.get("item_type")
    if kind not in FAV_TABLES:
        raise AppError("Tipo de favorito inválido.", 400, "validation")
    item_id = v.positive_int(data.get("item_id"))
    # El nombre de tabla sale de un diccionario fijo (no del usuario), por eso es seguro formatearlo.
    if not fetch_one(f"SELECT id FROM {FAV_TABLES[kind]} WHERE id = %s", (item_id,)):
        raise AppError("El elemento no existe.", 404, "not_found")
    execute("INSERT INTO favorites (user_id,item_type,item_id) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING", (g.user["id"], kind, item_id))
    row = fetch_one("SELECT id, item_type, item_id FROM favorites WHERE user_id=%s AND item_type=%s AND item_id=%s", (g.user["id"], kind, item_id))
    return jsonify(row), 201


@bp.delete("/favorites/<int:fid>")
@login_required
def remove_favorite(fid):
    execute("DELETE FROM favorites WHERE id=%s AND user_id=%s RETURNING id", (fid, g.user["id"]))
    return jsonify({"ok": True})

# ------------------------------ HISTORIAL ------------------------------
@bp.get("/history")
@login_required
def list_history():
    limit, offset = v.page_params(50, 200)
    where, params = ["user_id = %s"], [g.user["id"]]
    if request.args.get("tool_id"):
        where.append("tool_id = %s"); params.append(v.positive_int(request.args["tool_id"]))
    rows = fetch_all(f"SELECT * FROM calculation_history WHERE {' AND '.join(where)} ORDER BY created_at DESC LIMIT %s OFFSET %s",
                     params + [limit, offset])
    return jsonify(rows)


@bp.post("/history")
@login_required
def add_history():
    data = v.json_body()
    name = v.text(data, "tool_name", "El nombre de la herramienta", max_len=120)
    tool_id = data.get("tool_id")
    tool_id = v.positive_int(tool_id) if tool_id else None
    inputs, result = data.get("inputs", []), data.get("result", [])
    if not isinstance(inputs, list) or not isinstance(result, list) or len(json.dumps([inputs, result])) > 20000:
        raise AppError("Datos de historial inválidos.", 400, "validation")
    if tool_id and not fetch_one("SELECT id FROM tools WHERE id = %s", (tool_id,)):
        tool_id = None
    row = execute("INSERT INTO calculation_history (user_id,tool_id,tool_name,inputs,result) VALUES (%s,%s,%s,%s,%s) RETURNING *",
                  (g.user["id"], tool_id, name, Json(inputs), Json(result)))
    # Conserva solo los 500 más recientes por persona
    execute("DELETE FROM calculation_history WHERE user_id=%s AND id NOT IN "
            "(SELECT id FROM calculation_history WHERE user_id=%s ORDER BY created_at DESC LIMIT 500) RETURNING id",
            (g.user["id"], g.user["id"]))
    return jsonify(row), 201


@bp.delete("/history/<int:hid>")
@login_required
def delete_history(hid):
    execute("DELETE FROM calculation_history WHERE id=%s AND user_id=%s RETURNING id", (hid, g.user["id"]))
    return jsonify({"ok": True})


@bp.delete("/history")
@login_required
def clear_history():
    with_cursor = fetch_one("WITH d AS (DELETE FROM calculation_history WHERE user_id=%s RETURNING 1) SELECT count(*) AS n FROM d", (g.user["id"],))
    return jsonify({"ok": True, "deleted": with_cursor["n"]})

# ---------------------------- ESTADÍSTICAS ----------------------------
@bp.get("/me/stats")
@login_required
def my_stats():
    uid = g.user["id"]
    row = fetch_one("""
        SELECT (SELECT count(*) FROM notes WHERE user_id=%(u)s) AS notes,
               (SELECT count(*) FROM favorites WHERE user_id=%(u)s) AS favorites,
               (SELECT count(*) FROM calculation_history WHERE user_id=%(u)s) AS calculations,
               (SELECT count(*) FROM calculation_history WHERE user_id=%(u)s AND created_at > now() - interval '7 days') AS week,
               (SELECT count(DISTINCT tool_name) FROM calculation_history WHERE user_id=%(u)s) AS tools_used""", {"u": uid})
    row["top_tools"] = fetch_all("SELECT tool_name, tool_id, count(*) AS uses FROM calculation_history WHERE user_id=%s "
                                 "GROUP BY tool_name, tool_id ORDER BY uses DESC LIMIT 5", (uid,))
    return jsonify(row)
