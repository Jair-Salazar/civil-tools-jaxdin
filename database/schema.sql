-- =====================================================================
-- CIVIL TOOLS — JAXDIN · Esquema de base de datos (PostgreSQL 17)
-- Ejecutar en pgAdmin: Query Tool sobre la base "civil_tools".
-- Es seguro volver a ejecutarlo: BORRA y recrea todas las tablas.
-- =====================================================================

DROP TABLE IF EXISTS audit_logs, site_settings, calculation_history, favorites, notes,
    materials, units, formula_variables, formulas, tools, categories, users CASCADE;

-- Usuarios y roles ------------------------------------------------------
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    full_name     TEXT        NOT NULL DEFAULT '',
    role          TEXT        NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    preferences   JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

-- Contenido: categoría -> herramientas -> fórmulas -> variables -----------
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    slug        TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    icon        TEXT    NOT NULL DEFAULT 'ruler',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tools (
    id               SERIAL PRIMARY KEY,
    category_id      INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    slug             TEXT    NOT NULL,
    name             TEXT    NOT NULL,
    description      TEXT    NOT NULL DEFAULT '',
    kind             TEXT    NOT NULL DEFAULT 'calculator'
                     CHECK (kind IN ('calculator', 'converter', 'scientific')),
    definition       JSONB   NOT NULL DEFAULT '{}'::jsonb,   -- inputs / outputs / fórmulas
    educational_only BOOLEAN NOT NULL DEFAULT FALSE,          -- muestra aviso de uso referencial
    sort_order       INTEGER NOT NULL DEFAULT 0,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (category_id, slug)
);

CREATE TABLE formulas (
    id          SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    tool_id     INTEGER REFERENCES tools(id) ON DELETE SET NULL,
    slug        TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    expression  TEXT    NOT NULL,                 -- texto de la fórmula, p. ej. "V = A · h"
    description TEXT    NOT NULL DEFAULT '',
    explanation TEXT    NOT NULL DEFAULT '',
    example     TEXT    NOT NULL DEFAULT '',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE formula_variables (
    id          SERIAL PRIMARY KEY,
    formula_id  INTEGER NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
    symbol      TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    unit        TEXT    NOT NULL DEFAULT '',
    description TEXT    NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Unidades: valor_base = valor * factor + offset_value -------------------
CREATE TABLE units (
    id             SERIAL PRIMARY KEY,
    quantity       TEXT    NOT NULL,            -- clave: 'longitud', 'area', ...
    quantity_label TEXT    NOT NULL,            -- 'Longitud'
    symbol         TEXT    NOT NULL,
    name           TEXT    NOT NULL,
    factor         DOUBLE PRECISION NOT NULL CHECK (factor <> 0),
    offset_value   DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_base        BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    UNIQUE (quantity, symbol)
);

CREATE TABLE materials (
    id          SERIAL PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'General',
    description TEXT NOT NULL DEFAULT '',
    properties  JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { "Densidad": "2400 kg/m³", ... }
    notes       TEXT NOT NULL DEFAULT '',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- Datos de cada usuaria ----------------------------------------------------
CREATE TABLE notes (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL DEFAULT '',
    category    TEXT    NOT NULL DEFAULT 'General',
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notes_user_idx ON notes (user_id, updated_at DESC);

CREATE TABLE favorites (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type  TEXT    NOT NULL CHECK (item_type IN ('tool', 'formula', 'material')),
    item_id    INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, item_type, item_id)
);

CREATE TABLE calculation_history (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool_id    INTEGER REFERENCES tools(id) ON DELETE SET NULL,
    tool_name  TEXT    NOT NULL,
    inputs     JSONB   NOT NULL DEFAULT '[]'::jsonb,   -- [{label, value, unit}]
    result     JSONB   NOT NULL DEFAULT '[]'::jsonb,   -- [{label, value, unit}]
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX history_user_idx ON calculation_history (user_id, created_at DESC);

-- Sistema --------------------------------------------------------------------
CREATE TABLE site_settings (
    id          SERIAL PRIMARY KEY,
    key         TEXT  NOT NULL UNIQUE,
    value       JSONB NOT NULL DEFAULT 'null'::jsonb,
    description TEXT  NOT NULL DEFAULT ''
);

CREATE TABLE audit_logs (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action     TEXT NOT NULL,
    entity     TEXT NOT NULL DEFAULT '',
    entity_id  TEXT NOT NULL DEFAULT '',
    detail     JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip         TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_created_idx ON audit_logs (created_at DESC);
