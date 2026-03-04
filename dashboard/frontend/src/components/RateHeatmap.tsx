import type { FundingRate } from "../lib/api";

interface RateHeatmapProps {
  data: FundingRate[];
  compact?: boolean;
}

function SignalBadge({ signal }: { signal: FundingRate["signal"] }) {
  if (signal === "ARB") {
    return (
      <span className="inline-block text-[10px] uppercase tracking-widest font-bold bg-accent/10 text-accent px-2 py-0.5 group-hover:bg-accent-foreground/20 group-hover:text-accent-foreground">
        ARB
      </span>
    );
  }
  if (signal === "WATCH") {
    return (
      <span className="inline-block text-[10px] uppercase tracking-widest font-bold border-2 border-border text-muted-foreground px-2 py-0.5 group-hover:text-accent-foreground">
        WATCH
      </span>
    );
  }
  return (
    <span className="inline-block text-[10px] uppercase tracking-widest text-muted-foreground/30">
      NONE
    </span>
  );
}

export default function RateHeatmap({ data, compact = false }: RateHeatmapProps) {
  const displayData = compact ? data.slice(0, 8) : data;

  if (compact) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        {displayData.map((item) => {
          const isPositive = item.fundingRate > 0;
          return (
            <div
              key={item.symbol}
              className="bg-background p-6 md:p-8 group hover:bg-accent transition-colors duration-300 relative"
            >
              <div className="text-xl font-bold uppercase tracking-tight group-hover:text-accent-foreground">
                {item.symbol.replace("USDT", "")}
              </div>
              <div
                className={`font-mono text-[2.5rem] md:text-[3rem] font-bold leading-none mt-2 group-hover:text-accent-foreground ${
                  isPositive ? "text-green" : "text-red"
                }`}
              >
                {isPositive ? "+" : ""}
                {(item.fundingRate * 100).toFixed(4)}%
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-accent-foreground/60 mt-1">
                RATE/8H
              </div>
              <div className="font-mono text-sm text-muted-foreground group-hover:text-accent-foreground/70 mt-3">
                {item.apy.toFixed(1)}% APY
              </div>
              <div className="mt-3">
                <SignalBadge signal={item.signal} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Non-compact: simple list view
  return (
    <div className="divide-y divide-border">
      {displayData.map((item) => {
        const isPositive = item.fundingRate > 0;
        return (
          <div
            key={item.symbol}
            className="flex items-center justify-between py-4 px-4 group hover:bg-accent transition-colors duration-300"
          >
            <div className="font-bold uppercase tracking-tight group-hover:text-accent-foreground">
              {item.symbol.replace("USDT", "")}
            </div>
            <div
              className={`font-mono font-bold group-hover:text-accent-foreground ${
                isPositive ? "text-green" : "text-red"
              }`}
            >
              {isPositive ? "+" : ""}
              {(item.fundingRate * 100).toFixed(4)}%
            </div>
            <div className="font-mono text-sm text-muted-foreground group-hover:text-accent-foreground/70">
              {item.apy.toFixed(1)}% APY
            </div>
            <SignalBadge signal={item.signal} />
          </div>
        );
      })}
    </div>
  );
}
