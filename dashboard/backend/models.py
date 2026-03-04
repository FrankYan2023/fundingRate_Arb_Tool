"""Pydantic models for request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Telemetry
# ---------------------------------------------------------------------------

class HeartbeatRequest(BaseModel):
    session_id: str = Field(..., description="UUID-formatted session identifier")
    environment: str = Field(..., description="'testnet' or 'mainnet'")
    active_positions: int = Field(default=0, ge=0)

    @field_validator("session_id")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        try:
            uuid.UUID(v)
        except ValueError:
            raise ValueError("session_id must be a valid UUID")
        return v

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        if v not in ("testnet", "mainnet"):
            raise ValueError("environment must be 'testnet' or 'mainnet'")
        return v


class HeartbeatResponse(BaseModel):
    status: str = "ok"
    session_id: str


class TradeRequest(BaseModel):
    session_id: str = Field(..., description="UUID-formatted session identifier")
    symbol: str = Field(..., min_length=1, max_length=20)
    net_pnl_pct: Optional[float] = None
    hold_periods: Optional[int] = Field(default=None, ge=0)
    exit_reason: Optional[str] = None
    environment: Optional[str] = None

    @field_validator("session_id")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        try:
            uuid.UUID(v)
        except ValueError:
            raise ValueError("session_id must be a valid UUID")
        return v


class TradeResponse(BaseModel):
    status: str = "ok"
    trade_id: int


# ---------------------------------------------------------------------------
# Funding rates
# ---------------------------------------------------------------------------

class FundingRateItem(BaseModel):
    symbol: str
    mark_price: float
    index_price: float
    last_funding_rate: float
    next_funding_time: int
    annualized_rate_pct: float = Field(
        ..., description="Annualized funding rate in percent (rate * 3 * 365 * 100)"
    )
    net_yield_after_fees_pct: float = Field(
        ..., description="Annualized rate minus estimated 0.1% round-trip fees"
    )


class FundingRatesResponse(BaseModel):
    count: int
    cached: bool
    data: list[FundingRateItem]


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

class MostTradedSymbol(BaseModel):
    symbol: str
    count: int


class StatsResponse(BaseModel):
    agents_online_24h: int
    total_trades: int
    avg_pnl_pct: Optional[float]
    success_rate: Optional[float] = Field(
        None, description="Percentage of trades with positive PnL"
    )
    most_traded_symbols: list[MostTradedSymbol]
    testnet_pct: Optional[float] = Field(
        None, description="Percentage of heartbeats from testnet"
    )


# ---------------------------------------------------------------------------
# Auth / API Token
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, description="User email address")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v.lower().strip()


class RegisterResponse(BaseModel):
    status: str = "ok"
    email: str
    api_token: str
    tier: str = "free"


class UserInfoResponse(BaseModel):
    id: int
    email: str
    api_token: str
    tier: str
    tg_chat_id: Optional[str] = None
    tg_bot_token: Optional[str] = None
    created_at: Optional[datetime] = None


class RegenerateTokenResponse(BaseModel):
    status: str = "ok"
    api_token: str


class TelegramConfigRequest(BaseModel):
    tg_bot_token: str = Field(..., min_length=1, description="Telegram bot token")
    tg_chat_id: str = Field(..., min_length=1, description="Telegram chat ID for push notifications")


class TelegramConfigResponse(BaseModel):
    status: str = "ok"
    tg_chat_id: str
    tg_bot_token: str
