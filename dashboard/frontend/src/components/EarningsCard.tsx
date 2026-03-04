export default function EarningsCard() {
  return (
    <div className="border-2 border-border p-8 md:p-12">
      <h3 className="text-xl font-bold uppercase tracking-tighter text-foreground">
        EARNINGS
      </h3>

      <div className="mt-4">
        <span className="font-mono text-[4rem] md:text-[6rem] font-bold leading-none text-accent">
          $48,271
        </span>
        <span className="text-2xl font-mono text-muted-foreground">.53 USDT</span>
      </div>

      <div className="flex items-start mt-8">
        <div className="border-r-2 border-border px-6 first:pl-0">
          <span className="font-mono text-2xl font-bold text-green block">72%</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 block">
            PROFIT
          </span>
        </div>
        <div className="border-r-2 border-border px-6">
          <span className="font-mono text-2xl font-bold text-accent block">18%</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 block">
            FEES
          </span>
        </div>
        <div className="px-6">
          <span className="font-mono text-2xl font-bold text-red block">10%</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 block">
            SLIPPAGE
          </span>
        </div>
      </div>
    </div>
  );
}
