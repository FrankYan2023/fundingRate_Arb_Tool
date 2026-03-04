import { useState, useEffect, useCallback } from "react";
import type { Stats } from "../lib/api";
import { mockStats } from "../lib/mockData";

const POLL_INTERVAL = 30_000;

interface BackendStats {
  agents_online_24h: number;
  total_trades: number;
  avg_pnl_pct: number | null;
  success_rate: number | null;
  most_traded_symbols: { symbol: string; count: number }[];
  testnet_pct: number | null;
}

function transformStats(s: BackendStats): Stats {
  return {
    agentsLive: s.agents_online_24h || mockStats.agentsLive,
    fundingCollectedToday: mockStats.fundingCollectedToday, // no backend source yet
    fundingCollectedChange: mockStats.fundingCollectedChange,
    avgNetYield: s.avg_pnl_pct != null ? s.avg_pnl_pct / 100 : mockStats.avgNetYield,
    avgNetYieldAPY: s.avg_pnl_pct != null ? s.avg_pnl_pct * 3 * 365 / 100 : mockStats.avgNetYieldAPY,
    activePositions: s.total_trades || mockStats.activePositions,
  };
}

export function useStats() {
  const [data, setData] = useState<Stats>(mockStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stats");
      if (res.ok) {
        const json = await res.json();
        if (json && typeof json.agents_online_24h === "number") {
          setData(transformStats(json));
          setError(null);
        } else {
          setData(mockStats);
        }
      } else {
        setData(mockStats);
      }
    } catch {
      setData(mockStats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { data, loading, error, refetch: fetchStats };
}
