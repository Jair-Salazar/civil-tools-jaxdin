"""
Crea (o actualiza) la cuenta ADMIN. Uso:   python create_admin.py
Lee ADMIN_EMAIL de .env; la contraseña se toma de ADMIN_PASSWORD o se pide por teclado (no se muestra).
"""
import os, sys, getpass
from config.settings import Settings
from app.db import init_pool, fetch_one, execute
from app.auth.security import hash_password
from app.schemas.validators import EMAIL_RE

email = (os.getenv("ADMIN_EMAIL") or input("Correo del administrador: ")).strip().lower()
if not EMAIL_RE.match(email):
    sys.exit("Correo inválido.")
password = os.getenv("ADMIN_PASSWORD") or getpass.getpass("Contraseña (mínimo 8 caracteres): ")
if len(password) < 8:
    sys.exit("La contraseña debe tener al menos 8 caracteres.")

init_pool(Settings.DATABASE_URL)
if fetch_one("SELECT id FROM users WHERE lower(email) = %s", (email,)):
    execute("UPDATE users SET password_hash=%s, role='ADMIN', is_active=TRUE WHERE lower(email)=%s RETURNING id", (hash_password(password), email))
    print(f"✔ Cuenta existente actualizada como ADMIN: {email}")
else:
    execute("INSERT INTO users (email, password_hash, full_name, role) VALUES (%s,%s,'Administrador','ADMIN') RETURNING id", (email, hash_password(password)))
    print(f"✔ Administrador creado: {email}")
