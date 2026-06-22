import hashlib
import hmac

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, hashed_password: str) -> bool:
    return hmac.compare_digest(hash_password(password), hashed_password)


def require_api_token(
    authorization: HTTPAuthorizationCredentials | None = Depends(bearer),
    x_api_key: str | None = Header(default=None),
) -> str:
    settings = get_settings()
    if not settings.auth_enabled:
        return "auth-disabled"
    candidate = x_api_key or (authorization.credentials if authorization else None)
    if candidate and hmac.compare_digest(candidate, settings.api_token):
        return candidate
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Valid API token required",
    )
