"""
Acceso a PostgreSQL con un pool de conexiones.

Regla de oro: los valores SIEMPRE van como parámetros (%s), nunca pegados al texto SQL.
    fetch_all("SELECT * FROM tools WHERE id = %s", (5,))     ✔ seguro
    fetch_all(f"SELECT * FROM tools WHERE id = {x}")          ✘ inyección SQL
"""
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

_pool = None


def init_pool(dsn):
    global _pool
    _pool = ThreadedConnectionPool(1, 10, dsn)


@contextmanager
def cursor():
    """Entrega un cursor que devuelve filas como diccionarios. Hace commit o rollback solo."""
    conn = _pool.getconn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def fetch_all(sql, params=None):
    with cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def fetch_one(sql, params=None):
    with cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def execute(sql, params=None):
    """Ejecuta INSERT/UPDATE/DELETE. Si la consulta tiene RETURNING, devuelve esa fila."""
    with cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone() if cur.description else None


def ping():
    return fetch_one("SELECT version() AS version, now() AS now")
