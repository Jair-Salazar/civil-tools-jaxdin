"""Contraseñas (hash con scrypt vía Werkzeug) y tokens JWT firmados."""
import datetime as dt
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from config.settings import Settings


def hash_password(plain):
    return generate_password_hash(plain)          # incluye sal aleatoria; nunca se guarda la contraseña


def verify_password(plain, hashed):
    return check_password_hash(hashed, plain)


def create_token(user_id, role):
    now = dt.datetime.now(dt.timezone.utc)
    payload = {"sub": str(user_id), "role": role, "iat": now, "exp": now + dt.timedelta(hours=Settings.JWT_EXPIRES_HOURS)}
    return jwt.encode(payload, Settings.SECRET_KEY, algorithm="HS256")


def decode_token(token):
    """Devuelve el payload o lanza jwt.InvalidTokenError (expirado, alterado, etc.)."""
    return jwt.decode(token, Settings.SECRET_KEY, algorithms=["HS256"])
