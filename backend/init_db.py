"""
Alternativa a pgAdmin: ejecuta database/schema.sql y database/seed.sql contra DATABASE_URL.
Uso:   python init_db.py            (recrea tablas y carga datos de demostración)
       python init_db.py --no-seed  (solo tablas vacías)
"""
import sys
from pathlib import Path
import psycopg2
from config.settings import Settings

root = Path(__file__).resolve().parent.parent / "database"
files = ["schema.sql"] + ([] if "--no-seed" in sys.argv else ["seed.sql"])
conn = psycopg2.connect(Settings.DATABASE_URL)
try:
    with conn.cursor() as cur:
        for name in files:
            print(f"Ejecutando {name} ...")
            cur.execute((root / name).read_text(encoding="utf-8"))
    conn.commit()
    print("✔ Base de datos lista.")
finally:
    conn.close()
