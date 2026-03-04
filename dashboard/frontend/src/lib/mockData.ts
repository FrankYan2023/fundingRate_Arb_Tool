import type { FundingRate, Stats, YieldDataPoint, AgentActivity } from "./api";

export const mockStats: Stats = {
  agentsLive: 12,
  fundingCollectedToday: 4_827.53,
  fundingCollectedChange: 14.2,
  avgNetYield: 0.0347,
  avgNetYieldAPY: 42.6,
  activePositions: 38,
};

export const mockFundingRates: FundingRate[] = [
  { symbol: "BNBUSDT", fundingRate: 0.0082, estNetYield: 0.0071, apy: 86.4, basis: 0.12, nextFunding: 5823, openInterest: 482_000_000, signal: "ARB" },
  { symbol: "SOLUSDT", fundingRate: 0.0061, estNetYield: 0.0049, apy: 59.7, basis: 0.09, nextFunding: 5823, openInterest: 1_240_000_000, signal: "ARB" },
  { symbol: "ETHUSDT", fundingRate: 0.0045, estNetYield: 0.0034, apy: 41.4, basis: 0.07, nextFunding: 5823, openInterest: 8_920_000_000, signal: "ARB" },
  { symbol: "BTCUSDT", fundingRate: 0.0038, estNetYield: 0.0028, apy: 34.1, basis: 0.05, nextFunding: 5823, openInterest: 15_400_000_000, signal: "WATCH" },
  { symbol: "DOGEUSDT", fundingRate: 0.0091, estNetYield: 0.0078, apy: 95.0, basis: 0.15, nextFunding: 5823, openInterest: 320_000_000, signal: "ARB" },
  { symbol: "ARBUSDT", fundingRate: 0.0033, estNetYield: 0.0022, apy: 26.8, basis: 0.04, nextFunding: 5823, openInterest: 180_000_000, signal: "WATCH" },
  { symbol: "AVAXUSDT", fundingRate: 0.0055, estNetYield: 0.0043, apy: 52.4, basis: 0.08, nextFunding: 5823, openInterest: 290_000_000, signal: "ARB" },
  { symbol: "LINKUSDT", fundingRate: 0.0028, estNetYield: 0.0017, apy: 20.7, basis: 0.03, nextFunding: 5823, openInterest: 410_000_000, signal: "NONE" },
  { symbol: "SUIUSDT", fundingRate: 0.0073, estNetYield: 0.0061, apy: 74.3, basis: 0.11, nextFunding: 5823, openInterest: 520_000_000, signal: "ARB" },
  { symbol: "WIFUSDT", fundingRate: 0.0120, estNetYield: 0.0105, apy: 127.9, basis: 0.22, nextFunding: 5823, openInterest: 95_000_000, signal: "ARB" },
  { symbol: "PEPEUSDT", fundingRate: 0.0098, estNetYield: 0.0084, apy: 102.3, basis: 0.18, nextFunding: 5823, openInterest: 150_000_000, signal: "ARB" },
  { symbol: "APTUSDT", fundingRate: 0.0041, estNetYield: 0.0030, apy: 36.5, basis: 0.06, nextFunding: 5823, openInterest: 270_000_000, signal: "WATCH" },
  { symbol: "OPUSDT", fundingRate: 0.0019, estNetYield: 0.0009, apy: 11.0, basis: 0.02, nextFunding: 5823, openInterest: 210_000_000, signal: "NONE" },
  { symbol: "MATICUSDT", fundingRate: 0.0015, estNetYield: 0.0005, apy: 6.1, basis: 0.01, nextFunding: 5823, openInterest: 340_000_000, signal: "NONE" },
  { symbol: "TIAUSDT", fundingRate: 0.0067, estNetYield: 0.0055, apy: 67.0, basis: 0.10, nextFunding: 5823, openInterest: 130_000_000, signal: "ARB" },
];

export const mockYieldHistory: YieldDataPoint[] = [
  { date: "Feb 27", yield: 3.2 },
  { date: "Feb 28", yield: 3.8 },
  { date: "Mar 1", yield: 2.9 },
  { date: "Mar 2", yield: 4.1 },
  { date: "Mar 3", yield: 3.6 },
  { date: "Mar 4", yield: 4.8 },
  { date: "Mar 5", yield: 4.2 },
];

export const mockAgentActivity: AgentActivity[] = [
  { time: "00:00", heartbeats: 11 },
  { time: "02:00", heartbeats: 10 },
  { time: "04:00", heartbeats: 12 },
  { time: "06:00", heartbeats: 11 },
  { time: "08:00", heartbeats: 12 },
  { time: "10:00", heartbeats: 12 },
  { time: "12:00", heartbeats: 11 },
  { time: "14:00", heartbeats: 12 },
  { time: "16:00", heartbeats: 10 },
  { time: "18:00", heartbeats: 12 },
  { time: "20:00", heartbeats: 11 },
  { time: "22:00", heartbeats: 12 },
];

export const mockActivityFeed = [
  { id: 1, time: "14:32:08", agent: "Agent-07", action: "Opened short DOGEUSDT perp", detail: "Size: $12,400" },
  { id: 2, time: "14:31:55", agent: "Agent-03", action: "Collected funding BNBUSDT", detail: "+$18.42 USDT" },
  { id: 3, time: "14:31:22", agent: "Agent-11", action: "Hedged spot SOL position", detail: "Delta neutral confirmed" },
  { id: 4, time: "14:30:48", agent: "Agent-01", action: "Closed ETHUSDT arb cycle", detail: "Net P&L: +$32.17" },
  { id: 5, time: "14:30:15", agent: "Agent-09", action: "Scanning WIFUSDT rate spike", detail: "Rate: +0.120%" },
  { id: 6, time: "14:29:33", agent: "Agent-05", action: "Rebalanced SUIUSDT hedge", detail: "Slippage: 0.02%" },
  { id: 7, time: "14:28:41", agent: "Agent-02", action: "New signal: PEPEUSDT ARB", detail: "Est. yield: 0.084%" },
  { id: 8, time: "14:27:59", agent: "Agent-08", action: "Funding collected BTCUSDT", detail: "+$45.89 USDT" },
];
