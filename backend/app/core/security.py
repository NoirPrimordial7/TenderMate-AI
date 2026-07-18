import base64
import hashlib
import hmac
import secrets
import struct
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote
from uuid import UUID, uuid4

import jwt
from cryptography.fernet import Fernet, InvalidToken
from pwdlib import PasswordHash

from app.core.config import get_settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, password_hash_value: str) -> bool:
    try:
        return password_hash.verify(plain_password, password_hash_value)
    except Exception:
        return False


def create_access_token(
    user_id: UUID,
    email: str,
    role: str,
    session_id: UUID,
    *,
    mfa_verified: bool,
    authenticated_at: datetime,
) -> str:
    settings = get_settings()
    if not settings.jwt_secret_key:
        raise RuntimeError("JWT_SECRET_KEY is required for authentication.")

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "sid": str(session_id),
        "purpose": "access",
        "mfa": mfa_verified,
        "auth_time": int(authenticated_at.timestamp()),
        "jti": str(uuid4()),
        "exp": expires_at,
    }

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.jwt_secret_key:
        raise RuntimeError("JWT_SECRET_KEY is required for authentication.")

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("purpose", "access") != "access":
            raise ValueError("Invalid token purpose.")
        return payload
    except jwt.PyJWTError as exc:
        raise ValueError("Invalid or expired access token.") from exc


def create_purpose_token(user_id: UUID, purpose: str, expires_minutes: int) -> str:
    settings = get_settings()
    if not settings.jwt_secret_key:
        raise RuntimeError("JWT_SECRET_KEY is required for authentication.")
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "purpose": purpose,
        "jti": str(uuid4()),
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_purpose_token(token: str, expected_purpose: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise ValueError("Invalid or expired security challenge.") from exc
    if payload.get("purpose") != expected_purpose:
        raise ValueError("Invalid security challenge purpose.")
    return payload


def generate_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def totp_code(secret: str, timestamp: float | None = None, period: int = 30) -> str:
    moment = datetime.now(timezone.utc).timestamp() if timestamp is None else timestamp
    counter = int(moment // period)
    padded = secret + "=" * ((8 - len(secret) % 8) % 8)
    key = base64.b32decode(padded, casefold=True)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{binary % 1_000_000:06d}"


def verify_totp(secret: str, code: str, timestamp: float | None = None, window: int = 1) -> bool:
    if not code.isdigit() or len(code) != 6:
        return False
    moment = datetime.now(timezone.utc).timestamp() if timestamp is None else timestamp
    return any(
        hmac.compare_digest(totp_code(secret, moment + offset * 30), code)
        for offset in range(-window, window + 1)
    )


def build_totp_uri(secret: str, email: str, issuer: str = "NividaIQ") -> str:
    label = quote(f"{issuer}:{email}")
    return f"otpauth://totp/{label}?secret={secret}&issuer={quote(issuer)}&algorithm=SHA1&digits=6&period=30"


def encrypt_mfa_secret(secret: str, encryption_key: str) -> str:
    if not encryption_key:
        raise RuntimeError("MFA_ENCRYPTION_KEY is required before MFA can be enabled.")
    try:
        return Fernet(encryption_key.encode("ascii")).encrypt(secret.encode("ascii")).decode("ascii")
    except (ValueError, TypeError) as exc:
        raise RuntimeError("MFA_ENCRYPTION_KEY must be a valid Fernet key.") from exc


def decrypt_mfa_secret(ciphertext: str, encryption_key: str) -> str:
    try:
        return Fernet(encryption_key.encode("ascii")).decrypt(ciphertext.encode("ascii")).decode("ascii")
    except (InvalidToken, ValueError, TypeError) as exc:
        raise RuntimeError("Stored MFA factor could not be decrypted.") from exc


def generate_recovery_codes(count: int = 10) -> list[str]:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return ["".join(secrets.choice(alphabet) for _ in range(12)) for _ in range(count)]


def hash_security_token(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
