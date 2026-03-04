"""Aggregated community statistics."""

from __future__ import annotations

from fastapi import APIRouter

from database import get_db
from models import MostTradedSymbol, StatsResponse

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
async def get_stats() -> StatsResponse:
    """Return aggregated dashboard statistics."""
    async with get_db() as db:
        # Unique agents that sent a heartbeat in the last 24 hours
        row = await db.execute_fetchall(
            """
            SELECT COUNT(DISTINCT session_id) AS cnt
            FROM heartbeats
            WHERE created_at >= datetime('now', '-24 hours')
            """
        )
        agents_online_24h: int = row[0][0] if row else 0

        # Total trades
        row = await db.execute_fetchall("SELECT COUNT(*) FROM trades")
        total_trades: int = row[0][0] if row else 0

        # Average PnL percentage (only where net_pnl_pct is not null)
        row = await db.execute_fetchall(
            "SELECT AVG(net_pnl_pct) FROM trades WHERE net_pnl_pct IS NOT NULL"
        )
        avg_pnl_pct = round(row[0][0], 4) if row and row[0][0] is not None else None

        # Success rate: % of trades with positive PnL
        row = await db.execute_fetchall(
            """
            SELECT
                COUNT(CASE WHEN net_pnl_pct > 0 THEN 1 END) AS wins,
                COUNT(*) AS total
            FROM trades
            WHERE net_pnl_pct IS NOT NULL
            """
        )
        if row and row[0][1] > 0:
            success_rate = round(row[0][0] / row[0][1] * 100, 2)
        else:
            success_rate = None

        # Top 5 most traded symbols
        rows = await db.execute_fetchall(
            """
            SELECT symbol, COUNT(*) AS cnt
            FROM trades
            GROUP BY symbol
            ORDER BY cnt DESC
            LIMIT 5
            """
        )
        most_traded = [MostTradedSymbol(symbol=r[0], count=r[1]) for r in rows]

        # Testnet percentage based on heartbeats in last 24h
        row = await db.execute_fetchall(
            """
            SELECT
                COUNT(CASE WHEN environment = 'testnet' THEN 1 END) AS testnet,
                COUNT(*) AS total
            FROM heartbeats
            WHERE created_at >= datetime('now', '-24 hours')
            """
        )
        if row and row[0][1] > 0:
            testnet_pct = round(row[0][0] / row[0][1] * 100, 2)
        else:
            testnet_pct = None

    return StatsResponse(
        agents_online_24h=agents_online_24h,
        total_trades=total_trades,
        avg_pnl_pct=avg_pnl_pct,
        success_rate=success_rate,
        most_traded_symbols=most_traded,
        testnet_pct=testnet_pct,
    )
