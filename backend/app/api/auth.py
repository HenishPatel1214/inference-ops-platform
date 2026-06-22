from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models import UserAccount
from app.schemas import TokenResponse, UserRead
from app.services.security import hash_password, require_api_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(UserAccount).where(UserAccount.email == payload.email))
    if user is None:
        user = UserAccount(
            email=payload.email,
            display_name=payload.email.split("@")[0],
            hashed_password=hash_password(payload.password),
        )
        db.add(user)
        db.commit()
    elif not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=get_settings().api_token)


@router.get("/me", response_model=UserRead, dependencies=[Depends(require_api_token)])
def me(db: Session = Depends(get_db)) -> UserRead:
    user = db.scalar(select(UserAccount).order_by(UserAccount.id))
    if user is None:
        user = UserAccount(
            email="demo@local.dev",
            display_name="Demo Operator",
            hashed_password=hash_password("demo"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
