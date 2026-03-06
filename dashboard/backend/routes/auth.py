"""API Token self-registration auth system (no password, email + auto-token)."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Header, HTTPException

from database import get_db
from models import (
    RegisterRequest,
    RegisterResponse,
    RegenerateTokenResponse,
    TelegramConfigRequest,
    TelegramConfigResponse,
    UserInfoResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _generate_token() -> str:
    """Generate a hex API token (like Binance testnet style)."""
    return uuid.uuid4().hex


async def _get_user_by_token(token: str):
    """Look up a user row by API token. Raises 401 if not found."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT * FROM users WHERE api_token = ?",
            (token,),
        )
        if not rows:
            raise HTTPException(status_code=401, detail="Invalid API token")
        return rows[0]


async def _log_usage(user_id: int, endpoint: str) -> None:
    """Record an API usage entry."""
    async with get_db() as db:
        await db.execute(
            "INSERT INTO api_usage (user_id, endpoint, timestamp) VALUES (?, ?, ?)",
            (user_id, endpoint, datetime.utcnow().isoformat()),
        )
        await db.commit()


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------

@router.post("/register", response_model=RegisterResponse)
async def register(payload: RegisterRequest) -> RegisterResponse:
    """Register with an email address. Returns an auto-generated API token."""
    token = _generate_token()
    async with get_db() as db:
        # Check if email already registered
        existing = await db.execute_fetchall(
            "SELECT id FROM users WHERE email = ?",
            (payload.email,),
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail="Email already registered. Use /auth/me with your token or /auth/regenerate.",
            )

        await db.execute(
            """
            INSERT INTO users (email, api_token, created_at, tier)
            VALUES (?, ?, ?, 'free')
            """,
            (payload.email, token, datetime.utcnow().isoformat()),
        )
        await db.commit()

    return RegisterResponse(
        email=payload.email,
        api_token=token,
    )


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserInfoResponse)
async def me(x_api_token: str = Header(..., alias="X-API-Token")) -> UserInfoResponse:
    """Return current user info. Requires X-API-Token header."""
    user = await _get_user_by_token(x_api_token)
    await _log_usage(user["id"], "/auth/me")

    return UserInfoResponse(
        id=user["id"],
        email=user["email"],
        api_token=user["api_token"],
        tier=user["tier"],
        tg_chat_id=user["tg_chat_id"],
        tg_bot_token=user["tg_bot_token"],
        created_at=user["created_at"],
    )


# ---------------------------------------------------------------------------
# POST /auth/regenerate
# ---------------------------------------------------------------------------

@router.post("/regenerate", response_model=RegenerateTokenResponse)
async def regenerate_token(
    x_api_token: str = Header(..., alias="X-API-Token"),
) -> RegenerateTokenResponse:
    """Regenerate the API token. Old token becomes invalid immediately."""
    user = await _get_user_by_token(x_api_token)
    new_token = _generate_token()

    async with get_db() as db:
        await db.execute(
            "UPDATE users SET api_token = ? WHERE id = ?",
            (new_token, user["id"]),
        )
        await db.commit()

    await _log_usage(user["id"], "/auth/regenerate")

    return RegenerateTokenResponse(api_token=new_token)


# ---------------------------------------------------------------------------
# POST /auth/telegram
# ---------------------------------------------------------------------------

@router.post("/telegram", response_model=TelegramConfigResponse)
async def configure_telegram(
    payload: TelegramConfigRequest,
    x_api_token: str = Header(..., alias="X-API-Token"),
) -> TelegramConfigResponse:
    """Save Telegram bot token and chat ID for push notifications."""
    user = await _get_user_by_token(x_api_token)

    async with get_db() as db:
        await db.execute(
            "UPDATE users SET tg_bot_token = ?, tg_chat_id = ? WHERE id = ?",
            (payload.tg_bot_token, payload.tg_chat_id, user["id"]),
        )
        await db.commit()

    await _log_usage(user["id"], "/auth/telegram")

    return TelegramConfigResponse(
        tg_chat_id=payload.tg_chat_id,
        tg_bot_token=payload.tg_bot_token,
    )
