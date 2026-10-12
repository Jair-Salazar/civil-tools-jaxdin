"""
Descripción de los recursos que se administran en /admin.

El panel es GENÉRICO: el backend publica esta descripción (GET /api/admin/schema) y el frontend
dibuja tablas y formularios a partir de ella. Para administrar una tabla nueva solo hay que
agregar una entrada aquí. Los nombres de tabla y columna salen SOLO de este archivo (lista blanca),
por eso es seguro usarlos para construir el SQL; los VALORES siempre van parametrizados.

Tipos de campo: text, longtext, int, float, bool, json, select, ref (llave foránea).
"""


def F(name, label, type="text", required=False, **kw):
    return {"name": name, "label": label, "type": type, "required": required, **kw}


TOOL_TEMPLATE = {
    "inputs": [{"key": "b", "label": "Base", "units": [["m", 1], ["cm", 0.01]], "default": 1, "positive": True}],
    "outputs": [{"key": "A", "label": "Área", "expr": "b*b", "unit": "m²", "decimals": 4, "formula": "A = b²"}],
}

RESOURCES = {
    "categories": {
        "label": "Categorías", "table": "categories", "search": ["name", "slug"], "order": "sort_order, id",
        "list_columns": ["id", "name", "slug", "sort_order", "is_active"], "filters": [],
        "fields": [F("slug", "Slug (URL)", required=True, slug=True, help="Minúsculas y guiones. Ej: topografia"),
                   F("name", "Nombre", required=True), F("description", "Descripción", "longtext"),
                   F("icon", "Icono", default="ruler", help="shapes, compass, cube, droplet, building, list, swap, calc, ruler…"),
                   F("sort_order", "Orden", "int", default=0), F("is_active", "Activa", "bool", default=True)],
    },
    "tools": {
        "label": "Herramientas", "table": "tools", "search": ["name", "slug"], "order": "category_id, sort_order, id",
        "list_columns": ["id", "name", "slug", "category_id", "kind", "is_active"], "filters": ["category_id", "kind"],
        "fields": [F("category_id", "Categoría", "ref", True, ref="categories"), F("slug", "Slug (URL)", required=True, slug=True),
                   F("name", "Nombre", required=True), F("description", "Descripción", "longtext"),
                   F("kind", "Tipo", "select", True, options=["calculator", "converter", "scientific"], default="calculator"),
                   F("definition", "Definición (JSON)", "json", default={}, template=TOOL_TEMPLATE,
                     help="Solo para tipo 'calculator': entradas, salidas y expresiones."),
                   F("educational_only", "Solo referencial / educativa", "bool", default=False),
                   F("sort_order", "Orden", "int", default=0), F("is_active", "Activa", "bool", default=True)],
    },
    "formulas": {
        "label": "Fórmulas", "table": "formulas", "search": ["name", "slug", "expression"], "order": "sort_order, id",
        "list_columns": ["id", "name", "expression", "category_id", "is_featured", "is_active"], "filters": ["category_id"],
        "fields": [F("category_id", "Categoría", "ref", True, ref="categories"), F("tool_id", "Herramienta relacionada", "ref", ref="tools"),
                   F("slug", "Slug", required=True, slug=True), F("name", "Nombre", required=True),
                   F("expression", "Fórmula (texto)", required=True, help="Ej: V = A · h"),
                   F("description", "Descripción", "longtext"), F("explanation", "Explicación", "longtext"), F("example", "Ejemplo", "longtext"),
                   F("is_featured", "Destacada", "bool", default=False), F("sort_order", "Orden", "int", default=0), F("is_active", "Activa", "bool", default=True)],
    },
    "formula_variables": {
        "label": "Variables", "table": "formula_variables", "search": ["symbol", "name"], "order": "formula_id, sort_order, id",
        "list_columns": ["id", "formula_id", "symbol", "name", "unit"], "filters": ["formula_id"],
        "fields": [F("formula_id", "Fórmula", "ref", True, ref="formulas"), F("symbol", "Símbolo", required=True), F("name", "Nombre", required=True),
                   F("unit", "Unidad"), F("description", "Descripción", "longtext"), F("sort_order", "Orden", "int", default=0)],
    },
    "units": {
        "label": "Unidades", "table": "units", "search": ["quantity_label", "symbol", "name"], "order": "quantity_label, sort_order, id",
        "list_columns": ["id", "quantity_label", "symbol", "name", "factor", "offset_value", "is_base"], "filters": ["quantity"],
        "fields": [F("quantity", "Clave de magnitud", required=True, slug=True, help="Ej: longitud, area, presion"),
                   F("quantity_label", "Nombre de magnitud", required=True), F("symbol", "Símbolo", required=True), F("name", "Nombre", required=True),
                   F("factor", "Factor a la unidad base", "float", True, nonzero=True, help="valor_base = valor × factor + desfase"),
                   F("offset_value", "Desfase", "float", default=0), F("is_base", "Es unidad base", "bool", default=False), F("sort_order", "Orden", "int", default=0)],
    },
    "materials": {
        "label": "Materiales", "table": "materials", "search": ["name", "slug", "category"], "order": "category, name",
        "list_columns": ["id", "name", "category", "is_active"], "filters": ["category"],
        "fields": [F("slug", "Slug", required=True, slug=True), F("name", "Nombre", required=True), F("category", "Categoría", default="General"),
                   F("description", "Descripción", "longtext"), F("properties", "Propiedades (JSON)", "json", default={},
                                                                  template={"Densidad": "2400 kg/m³"}, help='Pares "propiedad": "valor".'),
                   F("notes", "Notas", "longtext"), F("is_active", "Activo", "bool", default=True)],
    },
    "settings": {
        "label": "Configuración", "table": "site_settings", "search": ["key", "description"], "order": "key",
        "list_columns": ["id", "key", "value", "description"], "filters": [],
        "fields": [F("key", "Clave", required=True, slug=False), F("value", "Valor (JSON)", "json", True, default="", template=""),
                   F("description", "Descripción", "longtext")],
    },
}

# Vistas especiales (SQL propio en admin.py). Solo se describen para el frontend.
SPECIAL = {
    "users": {"label": "Usuarios", "list_columns": ["id", "email", "full_name", "role", "is_active", "last_login_at"], "kind": "users"},
    "history": {"label": "Historial", "list_columns": ["id", "email", "tool_name", "created_at"], "kind": "readonly"},
    "favorites": {"label": "Favoritos", "list_columns": ["id", "email", "item_type", "item_id", "created_at"], "kind": "readonly"},
    "logs": {"label": "Registros (logs)", "list_columns": ["id", "created_at", "email", "action", "entity", "entity_id", "ip"], "kind": "readonly"},
}
