import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { mockYieldHistory } from "../lib/mockData";

const periods = ["7D", "30D", "ALL"] as const;

export default function YieldChart() {
  const [activePeriod, setActivePeriod] = useState<string>("7D");

  return (
    <div className="border-2 border-border p-8 md:p-12">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold uppercase tracking-tighter text-foreground">
          YIELD PERFORMANCE
        </h3>
        <div className="flex items-center gap-4">
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className={`text-xs uppercase tracking-widest pb-1 transition-colors ${
                activePeriod === period
                  ? "text-accent border-b-2 border-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="h-48 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockYieldHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="yieldGradientBrutalist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DFE104" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#DFE104" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#3F3F46" strokeDasharray="none" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#A1A1AA", fontSize: 12, fontFamily: "JetBrains Mono" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#A1A1AA", fontSize: 12, fontFamily: "JetBrains Mono" }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#09090B",
                border: "2px solid #3F3F46",
                borderRadius: "0px",
                fontFamily: "JetBrains Mono",
                fontSize: "12px",
                color: "#DFE104",
              }}
              formatter={(value: number) => [`${value}%`, "YIELD"]}
              labelStyle={{ color: "#A1A1AA", fontFamily: "JetBrains Mono" }}
            />
            <Area
              type="monotone"
              dataKey="yield"
              stroke="#DFE104"
              strokeWidth={2}
              fill="url(#yieldGradientBrutalist)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
