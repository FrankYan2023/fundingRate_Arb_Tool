import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync, writeFileSync } from "fs";

const STORE_PATH = "/tmp/agent_sessions.json";
const ONE_HOUR = 60 * 60 * 1000;

interface SessionData {
  lastSeen: number;
  env: string;
  state?: string;
  symbol?: string;
}

function loadSessions(): Record<string, SessionData> {
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveSessions(sessions: Record<string, SessionData>) {
  writeFileSync(STORE_PATH, JSON.stringify(sessions));
}

function cleanSessions(sessions: Record<string, SessionData>) {
  const cutoff = Date.now() - ONE_HOUR;
  for (const id of Object.keys(sessions)) {
    if (sessions[id].lastSeen < cutoff) delete sessions[id];
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const sessions = loadSessions();
  cleanSessions(sessions);

  // POST = heartbeat
  if (req.method === "POST") {
    const { session_id, environment, state, symbol, version } = req.body || {};

    if (!session_id || typeof session_id !== "string") {
      return res.status(400).json({ error: "session_id required" });
    }

    sessions[session_id] = {
      lastSeen: Date.now(),
      env: environment || "unknown",
      state,
      symbol,
    };

    saveSessions(sessions);

    return res.status(200).json({
      status: "ok",
      received: { session_id, environment, state, symbol, version },
      agents_online: Object.keys(sessions).length,
    });
  }

  // GET = stats
  const active = Object.values(sessions);
  const testnetCount = active.filter(s => s.env === "testnet").length;

  saveSessions(sessions);

  return res.status(200).json({
    agents_online_24h: active.length,
    total_agents_ever: active.length,
    total_trades: 0,
    avg_pnl_pct: null,
    success_rate: null,
    most_traded_symbols: [],
    testnet_pct: active.length > 0 ? (testnetCount / active.length) * 100 : 100,
  });
}
