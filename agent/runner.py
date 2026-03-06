#!/usr/bin/env python3
"""FundingArb execution agent (safe MVP).

MVP scope (safe by default):
- Scan Binance futures funding rates
- Rank arbitrage candidates by estimated net yield
- Send heartbeat to dashboard telemetry endpoint
- NO ORDER EXECUTION in this version

This keeps behavior aligned with MASTER_SKILL startup/scan/telemetry flow
without taking trading actions yet.
"""

from __future__ import annotations

import os
import time
import uuid
from dataclasses import dataclass
from typing import Any

import requests


@dataclass
class Config:
    pepper_api_url: str = os.getenv("PEPPER_API_URL", "http://127.0.0.1:18000")
    environment: str = os.getenv("ARB_ENVIRONMENT", "testnet").lower()  # testnet|mainnet
    scan_interval_sec: int = int(os.getenv("SCAN_INTERVAL_SEC", "300"))
    entry_threshold: float = float(os.getenv("ENTRY_THRESHOLD", "0.0005"))
    min_24h_volume_usdt: float = float(os.getenv("MIN_24H_VOLUME_USDT", "10000000"))
    top_candidates: int = int(os.getenv("TOP_CANDIDATES", "5"))
    min_hold_periods: int = int(os.getenv("MIN_HOLD_PERIODS", "3"))
    # fee defaults from MASTER_SKILL
    spot_taker_fee: float = float(os.getenv("SPOT_TAKER_FEE", "0.001"))
    futures_taker_fee: float = float(os.getenv("FUTURES_TAKER_FEE", "0.0004"))

    @property
    def binance_futures_base(self) -> str:
        if self.environment == "mainnet":
            return "https://fapi.binance.com"
        return "https://testnet.binancefuture.com"


SESSION_ID = str(uuid.uuid4())


def _assert_env(cfg: Config) -> None:
    if cfg.environment not in {"testnet", "mainnet"}:
        raise ValueError("ARB_ENVIRONMENT must be testnet or mainnet")

    # hard safety gate for mainnet
    if cfg.environment == "mainnet":
        confirm = os.getenv("CONFIRM_MAINNET", "").strip().lower()
        if confirm not in {"confirm mainnet", "确认主网"}:
            raise RuntimeError(
                "Mainnet blocked. Set CONFIRM_MAINNET='CONFIRM MAINNET' (or '确认主网') to continue."
            )


def _get(url: str, params: dict[str, Any] | None = None, timeout: int = 15) -> Any:
    r = requests.get(url, params=params, timeout=timeout)
    r.raise_for_status()
    return r.json()


def fetch_candidates(cfg: Config) -> list[dict[str, Any]]:
    premium = _get(f"{cfg.binance_futures_base}/fapi/v1/premiumIndex")
    tickers = _get(f"{cfg.binance_futures_base}/fapi/v1/ticker/24hr")
    tmap = {str(t.get("symbol")): t for t in tickers}

    round_trip_fee = (cfg.spot_taker_fee + cfg.futures_taker_fee) * 2

    picks: list[dict[str, Any]] = []
    for row in premium:
        symbol = str(row.get("symbol", ""))
        if not symbol.endswith("USDT"):
            continue

        rate = float(row.get("lastFundingRate", 0.0) or 0.0)
        if rate < cfg.entry_threshold:
            continue

        ticker = tmap.get(symbol, {})
        quote_vol = float(ticker.get("quoteVolume", 0.0) or 0.0)
        if quote_vol < cfg.min_24h_volume_usdt:
            continue

        mark = float(row.get("markPrice", 0.0) or 0.0)
        index = float(row.get("indexPrice", 0.0) or 0.0)
        basis_pct = abs((mark - index) / index) if index > 0 else 0.0

        est_net_yield = rate * cfg.min_hold_periods - round_trip_fee - basis_pct

        picks.append(
            {
                "symbol": symbol,
                "funding_rate": rate,
                "mark_price": mark,
                "index_price": index,
                "quote_volume": quote_vol,
                "basis_pct": basis_pct * 100,
                "est_net_yield": est_net_yield,
            }
        )

    picks.sort(key=lambda x: x["est_net_yield"], reverse=True)
    return picks[: cfg.top_candidates]


def send_heartbeat(cfg: Config, active_positions: int = 0) -> None:
    payload = {
        "session_id": SESSION_ID,
        "environment": cfg.environment,
        "active_positions": active_positions,
    }
    url = f"{cfg.pepper_api_url.rstrip('/')}/api/telemetry/heartbeat"
    r = requests.post(url, json=payload, timeout=10)
    r.raise_for_status()


def run() -> None:
    cfg = Config()
    _assert_env(cfg)

    print(f"[agent] session={SESSION_ID}")
    print(f"[agent] env={cfg.environment} base={cfg.binance_futures_base}")
    print("[agent] mode=scan-only (no order execution)")

    while True:
        try:
            send_heartbeat(cfg, active_positions=0)
            candidates = fetch_candidates(cfg)

            if candidates:
                top = candidates[0]
                print(
                    "[scan] top="
                    f"{top['symbol']} fr={top['funding_rate']:.6f} "
                    f"vol={top['quote_volume']:.0f} net={top['est_net_yield']:.6f}"
                )
            else:
                print("[scan] no candidate passed threshold")

        except Exception as e:
            print(f"[error] {e}")

        time.sleep(cfg.scan_interval_sec)


if __name__ == "__main__":
    run()
