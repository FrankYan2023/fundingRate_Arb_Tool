"""Async SQLite database layer using aiosqlite."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import aiosqlite


def _resolve_sqlite_path() -> str:
    """Resolve SQLite path with Railway volume support.

    Priority:
    1) SQLITE_PATH (plain file path)
    2) DATABASE_URL (sqlite:///... form)
    3) /data/fundingarb.db (Railway volume common mount)
    4) ./fundingarb.db
    """
    sqlite_path = os.getenv("SQLITE_PATH")
    if sqlite_path:
        return sqlite_path

    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url.startswith("sqlite:///"):
        return database_url.replace("sqlite:///", "", 1)

    if Path("/data").exists():
        return "/data/fundingarb.db"

    return "./fundingarb.db"


DATABASE_PATH = _resolve_sqlite_path()

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS heartbeats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    environment TEXT NOT NULL,
    active_positions INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    net_pnl_pct REAL,
    hold_periods INTEGER,
    exit_reason TEXT,
    environment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    api_token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    tier TEXT DEFAULT 'free',
    tg_chat_id TEXT,
    tg_bot_token TEXT
);

CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_heartbeats_session ON heartbeats(session_id);
CREATE INDEX IF NOT EXISTS idx_heartbeats_created ON heartbeats(created_at);
CREATE INDEX IF NOT EXISTS idx_trades_session ON trades(session_id);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_api_token ON users(api_token);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp);
"""


async def init_db() -> None:
    """Create tables and indices if they do not already exist."""
    Path(DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.executescript(_SCHEMA_SQL)
        await db.commit()


@asynccontextmanager
async def get_db() -> AsyncIterator[aiosqlite.Connection]:
    """Yield an aiosqlite connection with row_factory set to Row."""
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
