"""Proxied Binance funding rate data with 30-second in-memory cache."""

from __future__ import annotations

import os
import time
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

from models import FundingRateItem, FundingRatesResponse

router = APIRouter(prefix="/api/funding-rates", tags=["funding-rates"])

BINANCE_BASE = os.getenv("BINANCE_FUTURES_BASE", "https://fapi.binance.com")
PREMIUM_INDEX_URL = f"{BINANCE_BASE}/fapi/v1/premiumIndex"

CACHE_TTL_SECONDS = 30
ESTIMATED_ROUND_TRIP_FEE_PCT = 0.10  # 0.1% total for open + close

_cache: dict[str, Any] = {"data": None, "ts": 0.0}


def _parse_item(raw: dict) -> FundingRateItem:
    """Convert a raw Binance premiumIndex entry into a typed model."""
    rate = float(raw.get("lastFundingRate", 0))
    annualized = rate * 3 * 365 * 100  # 3 funding periods/day, 365 days, in pct
    net_yield = annualized - ESTIMATED_ROUND_TRIP_FEE_PCT
    return FundingRateItem(
        symbol=raw["symbol"],
        mark_price=float(raw.get("markPrice", 0)),
        index_price=float(raw.get("indexPrice", 0)),
        last_funding_rate=rate,
        next_funding_time=int(raw.get("nextFundingTime", 0)),
        annualized_rate_pct=round(annualized, 4),
        net_yield_after_fees_pct=round(net_yield, 4),
    )


async def _fetch_all() -> list[dict]:
    """Fetch from Binance or return cached data."""
    now = time.monotonic()
    if _cache["data"] is not None and (now - _cache["ts"]) < CACHE_TTL_SECONDS:
        return _cache["data"]

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(PREMIUM_INDEX_URL)
        resp.raise_for_status()
        data = resp.json()

    _cache["data"] = data
    _cache["ts"] = now
    return data


@router.get("", response_model=FundingRatesResponse)
async def get_funding_rates() -> FundingRatesResponse:
    """Return all perpetual funding rates from Binance, cached for 30 seconds."""
    try:
        raw_data = await _fetch_all()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Binance API returned {exc.response.status_code}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to reach Binance API: {exc}",
        )

    items = [_parse_item(r) for r in raw_data]
    cached = _cache["data"] is not None and (time.monotonic() - _cache["ts"]) < CACHE_TTL_SECONDS
    return FundingRatesResponse(count=len(items), cached=cached, data=items)


@router.get("/{symbol}", response_model=FundingRateItem)
async def get_funding_rate_by_symbol(symbol: str) -> FundingRateItem:
    """Return funding rate for a single symbol (case-insensitive)."""
    try:
        raw_data = await _fetch_all()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Binance API returned {exc.response.status_code}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to reach Binance API: {exc}",
        )

    symbol_upper = symbol.upper()
    for entry in raw_data:
        if entry["symbol"] == symbol_upper:
            return _parse_item(entry)

    raise HTTPException(status_code=404, detail=f"Symbol '{symbol_upper}' not found")
