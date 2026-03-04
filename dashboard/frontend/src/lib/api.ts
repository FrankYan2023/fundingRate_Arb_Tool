const BASE_URL = "/api";

async function fetchJSON<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface FundingRate {
  symbol: string;
  fundingRate: number;
  estNetYield: number;
  apy: number;
  basis: number;
  nextFunding: number; // seconds until next funding
  openInterest: number;
  signal: "ARB" | "WATCH" | "NONE";
}

export interface Stats {
  agentsLive: number;
  fundingCollectedToday: number;
  fundingCollectedChange: number;
  avgNetYield: number;
  avgNetYieldAPY: number;
  activePositions: number;
}

export interface YieldDataPoint {
  date: string;
  yield: number;
}

export interface AgentActivity {
  time: string;
  heartbeats: number;
}

export const api = {
  getFundingRates: () => fetchJSON<FundingRate[]>("/funding-rates"),
  getStats: () => fetchJSON<Stats>("/stats"),
  getYieldHistory: () => fetchJSON<YieldDataPoint[]>("/yield-history"),
  getAgentActivity: () => fetchJSON<AgentActivity[]>("/agent-activity"),
};
