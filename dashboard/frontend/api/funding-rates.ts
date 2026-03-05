import type { VercelRequest, VercelResponse } from "@vercel/node";

const BINANCE_FUTURES = "https://fapi.binance.com";

// Fee constants matching MASTER_SKILL.md
const SPOT_TAKER_FEE = 0.001;
const FUTURES_TAKER_FEE = 0.0004;
const ROUND_TRIP_FEE = (SPOT_TAKER_FEE + FUTURES_TAKER_FEE) * 2;
const MIN_HOLD_PERIODS = 3;

interface PremiumIndex {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  try {
    const response = await fetch(`${BINANCE_FUTURES}/fapi/v1/premiumIndex`);
    if (!response.ok) {
      return res.status(502).json({ error: "Binance API error" });
    }

    const raw: PremiumIndex[] = await response.json();

    const data = raw
      .filter((r) => r.symbol.endsWith("USDT"))
      .map((r) => {
        const rate = parseFloat(r.lastFundingRate);
        const markPrice = parseFloat(r.markPrice);
        const indexPrice = parseFloat(r.indexPrice);
        const basis = indexPrice > 0 ? ((markPrice - indexPrice) / indexPrice) * 100 : 0;
        const annualized = Math.abs(rate) * 3 * 365 * 100;
        const netYield = (Math.abs(rate) * MIN_HOLD_PERIODS - ROUND_TRIP_FEE - Math.abs(basis) / 100) * 100;

        return {
          symbol: r.symbol,
          mark_price: markPrice,
          index_price: indexPrice,
          last_funding_rate: rate,
          next_funding_time: r.nextFundingTime,
          annualized_rate_pct: annualized,
          net_yield_after_fees_pct: netYield,
        };
      })
      .sort((a, b) => Math.abs(b.last_funding_rate) - Math.abs(a.last_funding_rate));

    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch funding rates" });
  }
}
