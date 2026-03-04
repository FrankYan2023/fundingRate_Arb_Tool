import { useState, useMemo, useEffect } from "react";
import Marquee from "react-fast-marquee";
import { useFundingRates } from "../hooks/useFundingRates";
import type { FundingRate } from "../lib/api";

type SortKey = "fundingRate" | "apy" | "symbol";
type SignalFilter = "ALL" | "ARB" | "WATCH" | "NONE";

const SIGNAL_LABELS: Record<SignalFilter, string> = {
  ALL: "全部",
  ARB: "套利",
  WATCH: "观察",
  NONE: "无信号",
};

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function useCountdown(rates: FundingRate[]) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  void tick;
  return rates;
}

export default function Scanner() {
  const { data: fundingRates, loading } = useFundingRates();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("fundingRate");
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("ALL");

  useCountdown(fundingRates);

  const signalCounts = useMemo(() => {
    const counts = { ALL: fundingRates.length, ARB: 0, WATCH: 0, NONE: 0 };
    for (const r of fundingRates) {
      counts[r.signal]++;
    }
    return counts;
  }, [fundingRates]);

  const maxAbsRate = useMemo(() => {
    if (fundingRates.length === 0) return 0.001;
    return Math.max(...fundingRates.map((r) => Math.abs(r.fundingRate)), 0.0001);
  }, [fundingRates]);

  const filteredData = useMemo(() => {
    let filtered = [...fundingRates];

    if (search) {
      const q = search.toUpperCase();
      filtered = filtered.filter((r) => r.symbol.toUpperCase().includes(q));
    }

    if (signalFilter !== "ALL") {
      filtered = filtered.filter((r) => r.signal === signalFilter);
    }

    filtered.sort((a, b) => {
      switch (sortKey) {
        case "symbol":
          return a.symbol.localeCompare(b.symbol);
        case "fundingRate":
          return Math.abs(b.fundingRate) - Math.abs(a.fundingRate);
        case "apy":
          return b.apy - a.apy;
        default:
          return 0;
      }
    });

    return filtered;
  }, [fundingRates, search, sortKey, signalFilter]);

  const formatRate = (rate: number) => {
    const pct = (rate * 100).toFixed(4);
    return rate >= 0 ? `+${pct}%` : `${pct}%`;
  };

  const formatPct = (val: number) => `${val.toFixed(2)}%`;

  const splitSymbol = (sym: string) => {
    const parts = sym.split(/(?=USDT$|\/USDT$)/);
    if (parts.length === 2) return { base: parts[0], quote: parts[1] };
    if (sym.endsWith("USDT")) return { base: sym.slice(0, -4), quote: "/USDT" };
    return { base: sym, quote: "" };
  };

  return (
    <div className="space-y-0">
      {/* 页面标题 */}
      <div className="relative overflow-hidden pb-6" style={{ borderBottom: "2px solid #3F3F46" }}>
        <span
          className="absolute select-none pointer-events-none"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12rem",
            fontWeight: 700,
            color: "rgba(39, 39, 42, 0.3)",
            top: "-2rem",
            right: 0,
            lineHeight: 1,
          }}
        >
          {fundingRates.length}
        </span>

        <h1
          className="font-bold uppercase tracking-tighter leading-[0.9]"
          style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}
        >
          费率扫描
        </h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest mt-2 relative z-10">
          全部 USDT-M 永续合约
          {loading && (
            <span style={{ color: "#DFE104", marginLeft: "1rem" }} className="animate-pulse">
              刷新中...
            </span>
          )}
        </p>
      </div>

      {/* 筛选栏 */}
      <div
        className="py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
        style={{ borderBottom: "2px solid #3F3F46" }}
      >
        <input
          type="text"
          placeholder="搜索交易对..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-0 border-b-2 border-border text-foreground text-lg uppercase tracking-wide h-12 w-80 outline-none font-sans transition-colors focus:border-accent"
        />

        <div className="flex items-center gap-3 flex-wrap">
          {(["ALL", "ARB", "WATCH", "NONE"] as SignalFilter[]).map((filter) => {
            const isActive = signalFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setSignalFilter(filter)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  isActive
                    ? "bg-accent text-background border-2 border-accent"
                    : "bg-transparent text-muted-foreground border-2 border-border hover:text-foreground"
                }`}
              >
                {SIGNAL_LABELS[filter]} {signalCounts[filter]}
              </button>
            );
          })}

          <div className="w-[2px] h-6 bg-border mx-1" />

          {(
            [
              ["fundingRate", "费率"],
              ["apy", "年化"],
              ["symbol", "名称"],
            ] as [SortKey, string][]
          ).map(([key, label]) => {
            const isActive = sortKey === key;
            return (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-all bg-transparent ${
                  isActive
                    ? "text-accent border-2 border-accent"
                    : "text-muted-foreground border-2 border-transparent"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 数据表格 */}
      <div>
        {/* 表头 */}
        <div
          className="grid items-center py-4"
          style={{
            gridTemplateColumns: "2fr 1.2fr 2fr 1fr 1fr 1fr 1.2fr 1fr",
            borderBottom: "2px solid #3F3F46",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#A1A1AA",
            fontWeight: 700,
          }}
        >
          <span>交易对</span>
          <span>费率/8H</span>
          <span>费率条</span>
          <span>净收益</span>
          <span>年化</span>
          <span>基差</span>
          <span>下次结算</span>
          <span>信号</span>
        </div>

        {/* 空状态 */}
        {filteredData.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm uppercase tracking-widest">
            没有匹配的交易对
          </div>
        )}

        {/* 数据行 */}
        {filteredData.map((row) => {
          const { base, quote } = splitSymbol(row.symbol);
          const isPositive = row.fundingRate >= 0;
          const rateColor = isPositive ? "#0ECB81" : "#F6465D";
          const barColor =
            row.signal === "ARB" ? "#DFE104" : row.signal === "WATCH" ? (isPositive ? "#0ECB81" : "#F6465D") : "#A1A1AA";
          const barWidth = Math.min((Math.abs(row.fundingRate) / maxAbsRate) * 100, 100);

          return (
            <div
              key={row.symbol}
              className="grid items-center py-4 group transition-colors hover:bg-accent/5"
              style={{
                gridTemplateColumns: "2fr 1.2fr 2fr 1fr 1fr 1fr 1.2fr 1fr",
                borderBottom: "1px solid rgba(63, 63, 70, 0.5)",
              }}
            >
              {/* 交易对 */}
              <span>
                <span className="font-bold text-lg uppercase tracking-tight">{base}</span>
                <span className="text-muted-foreground">{quote}</span>
              </span>

              {/* 费率 */}
              <span
                className="font-mono text-lg font-bold"
                style={{ color: rateColor }}
              >
                {formatRate(row.fundingRate)}
              </span>

              {/* 费率条 */}
              <div className="pr-4">
                <div style={{ height: "4px", backgroundColor: "#27272A", width: "100%" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${barWidth}%`,
                      backgroundColor: barColor,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>

              {/* 净收益 */}
              <span className="font-mono text-base text-muted-foreground">
                {formatRate(row.estNetYield)}
              </span>

              {/* 年化 */}
              <span className="font-mono text-base font-bold">
                {formatPct(row.apy)}
              </span>

              {/* 基差 */}
              <span className="font-mono text-sm text-muted-foreground">
                {formatPct(row.basis)}
              </span>

              {/* 下次结算 */}
              <span className="font-mono text-sm text-muted-foreground">
                {formatCountdown(Math.max(0, row.nextFunding))}
              </span>

              {/* 信号 */}
              <span>
                {row.signal === "ARB" && (
                  <span className="bg-accent text-background px-3 py-1 text-xs uppercase tracking-widest font-bold inline-block">
                    套利
                  </span>
                )}
                {row.signal === "WATCH" && (
                  <span className="border-2 border-border text-muted-foreground px-3 py-1 text-xs uppercase tracking-widest font-bold inline-block">
                    观察
                  </span>
                )}
                {row.signal === "NONE" && (
                  <span className="text-muted-foreground/50 text-xs uppercase tracking-widest font-bold">
                    —
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* 底部滚动条 */}
      <div className="mt-8">
        <Marquee speed={60} style={{ backgroundColor: "#DFE104" }}>
          <span
            style={{
              color: "#09090B",
              fontWeight: 700,
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "0.75rem 2rem",
              display: "inline-block",
            }}
          >
            资金费率套利 — 现货做多 + 永续做空 — 每 8 小时收取一次 — DELTA 中性收益 —&nbsp;
          </span>
        </Marquee>
      </div>
    </div>
  );
}
