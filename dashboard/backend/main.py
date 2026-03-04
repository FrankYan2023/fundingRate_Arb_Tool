"""FundingArb Agent Dashboard -- FastAPI backend."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routes import auth, funding_rates, stats, telemetry

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("fundingarb")


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup and shutdown hooks."""
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database ready.")
    yield
    logger.info("Shutting down.")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="FundingArb Agent Dashboard",
    description="Backend API for the FundingArb community dashboard",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(funding_rates.router)
app.include_router(telemetry.router)
app.include_router(stats.router)
app.include_router(auth.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# WebSocket: live funding rate broadcast
# ---------------------------------------------------------------------------

BINANCE_WS_URL = "wss://fstream.binance.com/ws/!markPrice@arr@1s"


class ConnectionManager:
    """Manages active WebSocket connections for live rate broadcasting."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)
        logger.info("WebSocket client connected. Total: %d", len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.remove(ws)
        logger.info("WebSocket client disconnected. Total: %d", len(self._connections))

    async def broadcast(self, message: str) -> None:
        stale: list[WebSocket] = []
        for conn in self._connections:
            try:
                await conn.send_text(message)
            except Exception:
                stale.append(conn)
        for conn in stale:
            self._connections.remove(conn)


manager = ConnectionManager()

# Background task reference so it is not garbage-collected
_ws_relay_task: asyncio.Task | None = None


async def _relay_binance_ws() -> None:
    """Connect to Binance WebSocket and relay markPrice to all dashboard clients."""
    while True:
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream("GET", BINANCE_WS_URL) as _:
                    pass  # httpx does not natively support WS; fall back below
        except Exception:
            pass

        # Use a raw websocket approach via asyncio for the Binance stream.
        # We keep this simple: periodically fetch and push cached data.
        try:
            from routes.funding_rates import _fetch_all, _parse_item

            while True:
                if manager._connections:
                    try:
                        raw_data = await _fetch_all()
                        items = [_parse_item(r) for r in raw_data[:20]]  # top 20
                        payload = json.dumps(
                            [item.model_dump() for item in items],
                            default=str,
                        )
                        await manager.broadcast(payload)
                    except Exception as exc:
                        logger.warning("WS relay fetch error: %s", exc)
                await asyncio.sleep(5)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error("WS relay loop error: %s, restarting in 5s", exc)
            await asyncio.sleep(5)


@app.websocket("/ws/funding-rates")
async def ws_funding_rates(ws: WebSocket) -> None:
    """WebSocket endpoint for live funding rate updates."""
    global _ws_relay_task

    await manager.connect(ws)

    # Start the relay background task if not already running
    if _ws_relay_task is None or _ws_relay_task.done():
        _ws_relay_task = asyncio.create_task(_relay_binance_ws())

    try:
        while True:
            # Keep the connection alive; ignore client messages
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
