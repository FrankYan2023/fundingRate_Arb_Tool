"""Telemetry ingestion: heartbeats and trade reports from agents."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from database import get_db
from models import (
    HeartbeatRequest,
    HeartbeatResponse,
    TradeRequest,
    TradeResponse,
)

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])


@router.post("/heartbeat", response_model=HeartbeatResponse)
async def receive_heartbeat(payload: HeartbeatRequest) -> HeartbeatResponse:
    """Record an agent heartbeat."""
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO heartbeats (session_id, environment, active_positions)
            VALUES (?, ?, ?)
            """,
            (payload.session_id, payload.environment, payload.active_positions),
        )
        await db.commit()
    return HeartbeatResponse(session_id=payload.session_id)


@router.post("/trade", response_model=TradeResponse)
async def receive_trade(payload: TradeRequest) -> TradeResponse:
    """Record a completed trade report."""
    async with get_db() as db:
        cursor = await db.execute(
            """
            INSERT INTO trades (session_id, symbol, net_pnl_pct, hold_periods, exit_reason, environment)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                payload.session_id,
                payload.symbol.upper(),
                payload.net_pnl_pct,
                payload.hold_periods,
                payload.exit_reason,
                payload.environment,
            ),
        )
        await db.commit()
        trade_id = cursor.lastrowid

    if trade_id is None:
        raise HTTPException(status_code=500, detail="Failed to insert trade")

    return TradeResponse(trade_id=trade_id)
