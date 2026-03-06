#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import hmac
import os
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, ROUND_DOWN
from typing import Any

import requests


@dataclass
class Config:
    env: str = os.getenv("ARB_ENVIRONMENT", "testnet").lower()  # testnet|mainnet
    api_key: str = os.getenv("BINANCE_API_KEY", "")
    secret_key: str = os.getenv("BINANCE_SECRET_KEY", "")
    recv_window: int = int(os.getenv("RECV_WINDOW", "5000"))

    # Dashboard telemetry
    pepper_api_url: str = os.getenv("PEPPER_API_URL", "http://127.0.0.1:18000")
    pepper_api_token: str = os.getenv("PEPPER_API_TOKEN", "")

    # Strategy defaults from MASTER_SKILL.md
    entry_threshold: float = float(os.getenv("ENTRY_THRESHOLD", "0.0005"))
    exit_threshold: float = float(os.getenv("EXIT_THRESHOLD", "0.0001"))
    max_concurrent_positions: int = int(os.getenv("MAX_CONCURRENT_POSITIONS", "3"))
    leverage: int = int(os.getenv("LEVERAGE", "1"))
    max_capital_pct: float = float(os.getenv("MAX_CAPITAL_PCT", "0.20"))
    max_position_usdt: float = float(os.getenv("MAX_POSITION_USDT", "10000"))
    min_position_usdt: float = float(os.getenv("MIN_POSITION_USDT", "100"))
    min_24h_volume_usdt: float = float(os.getenv("MIN_24H_VOLUME_USDT", "10000000"))
    top_candidates: int = int(os.getenv("TOP_CANDIDATES", "5"))
    min_hold_periods: int = int(os.getenv("MIN_HOLD_PERIODS", "3"))

    stop_loss_pct: float = float(os.getenv("STOP_LOSS_PCT", "-0.015"))
    take_profit_pct: float = float(os.getenv("TAKE_PROFIT_PCT", "0.02"))
    monitoring_interval: int = int(os.getenv("MONITORING_INTERVAL", "1800"))

    spot_taker_fee: float = float(os.getenv("SPOT_TAKER_FEE", "0.001"))
    futures_taker_fee: float = float(os.getenv("FUTURES_TAKER_FEE", "0.0004"))

    @property
    def spot_base(self) -> str:
        return "https://api.binance.com" if self.env == "mainnet" else "https://testnet.binance.vision"

    @property
    def futures_base(self) -> str:
        return "https://fapi.binance.com" if self.env == "mainnet" else "https://testnet.binancefuture.com"


class BinanceClient:
    def __init__(self, cfg: Config):
        self.cfg = cfg

    @staticmethod
    def _ts() -> int:
        return int(time.time() * 1000)

    def _sign(self, params: dict[str, Any]) -> str:
        q = "&".join([f"{k}={params[k]}" for k in sorted(params.keys())])
        return hmac.new(self.cfg.secret_key.encode(), q.encode(), hashlib.sha256).hexdigest()

    def _headers(self) -> dict[str, str]:
        return {"X-MBX-APIKEY": self.cfg.api_key}

    def _req(self, method: str, base: str, path: str, params: dict[str, Any] | None = None, signed: bool = False) -> Any:
        params = params or {}
        if signed:
            params["timestamp"] = self._ts()
            params["recvWindow"] = self.cfg.recv_window
            params["signature"] = self._sign(params)
        r = requests.request(method, f"{base}{path}", params=params, headers=self._headers(), timeout=20)
        if r.status_code >= 400:
            raise RuntimeError(f"{method} {path} {r.status_code} {r.text[:300]}")
        return r.json()

    # connectivity
    def ping_spot(self):
        return self._req("GET", self.cfg.spot_base, "/api/v3/ping")

    def ping_futures(self):
        return self._req("GET", self.cfg.futures_base, "/fapi/v1/ping")

    # market
    def premium_index_all(self):
        return self._req("GET", self.cfg.futures_base, "/fapi/v1/premiumIndex")

    def ticker_24h_all(self):
        return self._req("GET", self.cfg.futures_base, "/fapi/v1/ticker/24hr")

    def depth(self, symbol: str, futures: bool, limit: int = 20):
        base = self.cfg.futures_base if futures else self.cfg.spot_base
        path = "/fapi/v1/depth" if futures else "/api/v3/depth"
        return self._req("GET", base, path, {"symbol": symbol, "limit": limit})

    def futures_exchange_info(self):
        return self._req("GET", self.cfg.futures_base, "/fapi/v1/exchangeInfo")

    def spot_exchange_info(self):
        return self._req("GET", self.cfg.spot_base, "/api/v3/exchangeInfo")

    # account
    def spot_account(self):
        return self._req("GET", self.cfg.spot_base, "/api/v3/account", signed=True)

    def futures_account(self):
        return self._req("GET", self.cfg.futures_base, "/fapi/v2/account", signed=True)

    def position_risk(self, symbol: str | None = None):
        p = {"symbol": symbol} if symbol else {}
        return self._req("GET", self.cfg.futures_base, "/fapi/v2/positionRisk", p, signed=True)

    # execution
    def set_leverage(self, symbol: str, leverage: int):
        return self._req("POST", self.cfg.futures_base, "/fapi/v1/leverage", {"symbol": symbol, "leverage": leverage}, signed=True)

    def set_margin_type_crossed(self, symbol: str):
        try:
            return self._req("POST", self.cfg.futures_base, "/fapi/v1/marginType", {"symbol": symbol, "marginType": "CROSSED"}, signed=True)
        except RuntimeError as e:
            if "-4046" in str(e):
                return {"msg": "No need to change margin type"}
            raise

    def futures_order(self, symbol: str, side: str, qty: str, reduce_only: bool = False):
        p = {
            "symbol": symbol,
            "side": side,
            "type": "MARKET",
            "quantity": qty,
        }
        if reduce_only:
            p["reduceOnly"] = "true"
        return self._req("POST", self.cfg.futures_base, "/fapi/v1/order", p, signed=True)

    def spot_order(self, symbol: str, side: str, qty: str):
        p = {
            "symbol": symbol,
            "side": side,
            "type": "MARKET",
            "quantity": qty,
        }
        return self._req("POST", self.cfg.spot_base, "/api/v3/order", p, signed=True)

    def funding_income(self, symbol: str, limit: int = 50):
        p = {"symbol": symbol, "incomeType": "FUNDING_FEE", "limit": limit}
        return self._req("GET", self.cfg.futures_base, "/fapi/v1/income", p, signed=True)


def quantize_step(qty: float, step: str) -> str:
    q = Decimal(str(qty))
    s = Decimal(step)
    if s <= 0:
        return f"{qty:.8f}"
    units = (q / s).quantize(Decimal("1"), rounding=ROUND_DOWN)
    out = units * s
    return format(out, "f")


def get_step_size(exchange_info: dict, symbol: str) -> str:
    for s in exchange_info.get("symbols", []):
        if s.get("symbol") == symbol:
            for f in s.get("filters", []):
                if f.get("filterType") == "LOT_SIZE":
                    return f.get("stepSize", "0.000001")
    return "0.000001"


def orderbook_slippage_pct(depth: dict, side: str, notional: float) -> float:
    # side=buy -> consume asks; side=sell -> consume bids
    levels = depth.get("asks", []) if side == "buy" else depth.get("bids", [])
    remain = notional
    if remain <= 0 or not levels:
        return 1.0

    first_px = float(levels[0][0])
    spent = 0.0
    got_qty = 0.0
    for px_s, qty_s in levels:
        px = float(px_s)
        qty = float(qty_s)
        lvl_notional = px * qty
        take = min(remain, lvl_notional)
        take_qty = take / px
        spent += take
        got_qty += take_qty
        remain -= take
        if remain <= 0:
            break

    if got_qty <= 0:
        return 1.0
    avg_px = spent / got_qty
    return abs(avg_px - first_px) / first_px


def send_heartbeat(cfg: Config, session_id: str, active_positions: int):
    url = f"{cfg.pepper_api_url.rstrip('/')}/api/telemetry/heartbeat"
    headers = {"X-API-Token": cfg.pepper_api_token} if cfg.pepper_api_token else {}
    payload = {"session_id": session_id, "environment": cfg.env, "active_positions": active_positions}
    requests.post(url, json=payload, headers=headers, timeout=10)


def send_trade(cfg: Config, session_id: str, symbol: str, net_pnl_pct: float, hold_periods: int, exit_reason: str):
    url = f"{cfg.pepper_api_url.rstrip('/')}/api/telemetry/trade"
    headers = {"X-API-Token": cfg.pepper_api_token} if cfg.pepper_api_token else {}
    payload = {
        "session_id": session_id,
        "symbol": symbol,
        "net_pnl_pct": net_pnl_pct,
        "hold_periods": hold_periods,
        "exit_reason": exit_reason,
        "environment": cfg.env,
    }
    requests.post(url, json=payload, headers=headers, timeout=10)


def choose_candidate(cfg: Config, c: BinanceClient) -> dict[str, Any] | None:
    premium = c.premium_index_all()
    ticker = c.ticker_24h_all()
    tmap = {x.get("symbol"): x for x in ticker}

    fee_rt = (cfg.spot_taker_fee + cfg.futures_taker_fee) * 2
    picks: list[dict[str, Any]] = []
    for r in premium:
        symbol = str(r.get("symbol", ""))
        if not symbol.endswith("USDT"):
            continue
        fr = float(r.get("lastFundingRate", 0) or 0)
        if fr < cfg.entry_threshold:
            continue
        vol = float((tmap.get(symbol) or {}).get("quoteVolume", 0) or 0)
        if vol < cfg.min_24h_volume_usdt:
            continue
        mark = float(r.get("markPrice", 0) or 0)
        idx = float(r.get("indexPrice", 0) or 0)
        basis = abs((mark - idx) / idx) if idx > 0 else 0
        net = fr * cfg.min_hold_periods - fee_rt - basis
        picks.append({"symbol": symbol, "funding_rate": fr, "mark": mark, "index": idx, "net": net, "volume": vol})

    picks.sort(key=lambda x: x["net"], reverse=True)
    return picks[0] if picks else None


def free_spot_usdt(spot_acct: dict) -> float:
    for b in spot_acct.get("balances", []):
        if b.get("asset") == "USDT":
            return float(b.get("free", 0) or 0)
    return 0.0


def free_futures_usdt(fut_acct: dict) -> float:
    return float(fut_acct.get("availableBalance", 0) or 0)


def margin_ratio(fut_acct: dict) -> float:
    mb = float(fut_acct.get("totalMarginBalance", 0) or 0)
    mm = float(fut_acct.get("totalMaintMargin", 0) or 0)
    return (mm / mb) if mb > 0 else 0.0


def active_positions_count(pos: list[dict]) -> int:
    cnt = 0
    for p in pos:
        if abs(float(p.get("positionAmt", 0) or 0)) > 0:
            cnt += 1
    return cnt


def main() -> None:
    cfg = Config()
    if not cfg.api_key or not cfg.secret_key:
        raise RuntimeError("BINANCE_API_KEY/BINANCE_SECRET_KEY required")

    if cfg.env == "mainnet":
        if os.getenv("CONFIRM_MAINNET", "").strip().lower() not in {"confirm mainnet", "确认主网"}:
            raise RuntimeError("mainnet requires CONFIRM_MAINNET='CONFIRM MAINNET' or '确认主网'")

    session_id = str(uuid.uuid4())
    c = BinanceClient(cfg)

    print(f"session_id={session_id}")
    print(f"environment={cfg.env}")

    # Startup connectivity checks
    c.ping_spot()
    c.ping_futures()
    c.spot_account()
    c.futures_account()
    print("startup checks: OK")

    send_heartbeat(cfg, session_id, active_positions=0)

    # Phase 1 Scan
    cand = choose_candidate(cfg, c)
    if not cand:
        print("no candidate found")
        return

    symbol = cand["symbol"]
    mark = float(cand["mark"])
    print(f"selected={symbol} funding={cand['funding_rate']:.6f} net={cand['net']:.6f}")

    # Phase 2 Sizing
    spot_acct = c.spot_account()
    fut_acct = c.futures_account()
    total_cap = free_spot_usdt(spot_acct) + free_futures_usdt(fut_acct)
    size_usdt = min(total_cap * cfg.max_capital_pct, cfg.max_position_usdt)

    # Phase 3 Risk checks
    if size_usdt < cfg.min_position_usdt:
        raise RuntimeError(f"position too small: {size_usdt:.2f}")
    if margin_ratio(fut_acct) >= 0.5:
        raise RuntimeError("margin ratio >= 50%, reject")

    pos_all = c.position_risk()
    if active_positions_count(pos_all) >= cfg.max_concurrent_positions:
        raise RuntimeError("max concurrent positions reached")

    # slippage checks
    spot_depth = c.depth(symbol, futures=False, limit=20)
    fut_depth = c.depth(symbol, futures=True, limit=20)
    if orderbook_slippage_pct(spot_depth, "buy", size_usdt) > 0.003:
        raise RuntimeError("spot slippage > 0.3%")
    if orderbook_slippage_pct(fut_depth, "sell", size_usdt) > 0.003:
        raise RuntimeError("futures slippage > 0.3%")

    # precision
    s_info = c.spot_exchange_info()
    f_info = c.futures_exchange_info()
    spot_step = get_step_size(s_info, symbol)
    fut_step = get_step_size(f_info, symbol)
    raw_qty = size_usdt / mark
    qty = quantize_step(float(raw_qty), spot_step)
    qty = quantize_step(float(qty), fut_step)
    if float(qty) <= 0:
        raise RuntimeError("calculated qty is zero")

    # Phase 5 Enter: futures short first, then spot buy
    c.set_leverage(symbol, cfg.leverage)
    c.set_margin_type_crossed(symbol)

    print(f"entering position qty={qty} usdt~{size_usdt:.2f}")
    fut_open = c.futures_order(symbol, side="SELL", qty=qty)
    time.sleep(0.5)
    try:
        spot_open = c.spot_order(symbol, side="BUY", qty=qty)
    except Exception as e:
        # emergency rollback futures leg
        c.futures_order(symbol, side="BUY", qty=qty, reduce_only=True)
        raise RuntimeError(f"spot leg failed, futures rolled back: {e}")

    print("entry done", fut_open.get("orderId"), spot_open.get("orderId"))

    # Phase 6 monitor and Phase 7/8 exit
    entry_spot = float(spot_open.get("fills", [{}])[0].get("price", mark) or mark)
    entry_fut = float(fut_open.get("avgPrice", mark) or mark)
    hold_periods = 0

    while True:
        time.sleep(cfg.monitoring_interval)
        hold_periods += 1

        send_heartbeat(cfg, session_id, active_positions=1)

        fr_now = 0.0
        for r in c.premium_index_all():
            if r.get("symbol") == symbol:
                fr_now = float(r.get("lastFundingRate", 0) or 0)
                break

        pr = c.position_risk(symbol)
        p = pr[0] if isinstance(pr, list) and pr else {}
        fut_unreal = float(p.get("unRealizedProfit", 0) or 0)

        # rough combined pnl
        mark_now = float(p.get("markPrice", entry_fut) or entry_fut)
        spot_pnl = (mark_now - entry_spot) / entry_spot
        fut_pnl = (entry_fut - mark_now) / entry_fut
        income = c.funding_income(symbol, limit=20)
        funding_sum = sum(float(x.get("income", 0) or 0) for x in income)
        net_pct = spot_pnl + fut_pnl  # funding omitted in pct simplification

        print(f"monitor symbol={symbol} fr={fr_now:.6f} net_pct={net_pct:.4f} fut_unreal={fut_unreal:.4f} funding={funding_sum:.4f}")

        # exits
        reason = None
        if fr_now < cfg.exit_threshold:
            reason = "funding_below_exit_threshold"
        elif net_pct <= cfg.stop_loss_pct:
            reason = "stop_loss"
        elif net_pct >= cfg.take_profit_pct:
            reason = "take_profit"
        elif margin_ratio(c.futures_account()) > 0.8:
            reason = "emergency_margin_ratio"

        if reason:
            # Exit order: spot sell first, then futures buy reduceOnly
            c.spot_order(symbol, side="SELL", qty=qty)
            c.futures_order(symbol, side="BUY", qty=qty, reduce_only=True)
            send_trade(cfg, session_id, symbol, net_pct * 100, hold_periods, reason)
            send_heartbeat(cfg, session_id, active_positions=0)
            print(f"closed reason={reason} net_pct={net_pct:.4f}")
            break


if __name__ == "__main__":
    main()
