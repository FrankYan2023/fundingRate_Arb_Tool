import { useState, useEffect, useCallback } from "react";
import type { FundingRate } from "../lib/api";
import { mockFundingRates } from "../lib/mockData";

const POLL_INTERVAL = 30_000;

// Thresholds matching MASTER_SKILL.md
const ARB_THRESHOLD = 0.0005;
const WATCH_THRESHOLD = 0.0001;

interface BackendRate {
  symbol: string;
  mark_price: number;
  index_price: number;
  last_funding_rate: number;
  next_funding_time: number;
  annualized_rate_pct: number;
  net_yield_after_fees_pct: number;
}

function transformRate(r: BackendRate): FundingRate {
  const absRate = Math.abs(r.last_funding_rate);
  const signal: FundingRate["signal"] =
    absRate >= ARB_THRESHOLD ? "ARB" : absRate >= WATCH_THRESHOLD ? "WATCH" : "NONE";

  const nowMs = Date.now();
  const nextFundingSec = Math.max(0, Math.floor((r.next_funding_time - nowMs) / 1000));
  const basis = r.index_price > 0 ? ((r.mark_price - r.index_price) / r.index_price) * 100 : 0;

  return {
    symbol: r.symbol,
    fundingRate: r.last_funding_rate,
    estNetYield: r.net_yield_after_fees_pct / 100 / (3 * 365), // back to per-8h decimal
    apy: Math.abs(r.annualized_rate_pct),
    basis: Math.abs(basis),
    nextFunding: nextFundingSec,
    openInterest: 0, // not returned by backend yet
    signal,
  };
}

export function useFundingRates() {
  const [data, setData] = useState<FundingRate[]>(mockFundingRates);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/funding-rates");
      if (res.ok) {
        const json = await res.json();
        const rates: BackendRate[] = json.data ?? json.rates ?? json;
        if (Array.isArray(rates) && rates.length > 0) {
          const transformed = rates.map(transformRate);
          // Sort by absolute funding rate descending
          transformed.sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate));
          setData(transformed);
          setError(null);
        } else {
          setData(mockFundingRates);
        }
      } else {
        setData(mockFundingRates);
      }
    } catch {
      setData(mockFundingRates);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchRates]);

  return { data, loading, error, refetch: fetchRates };
}
