import { mockActivityFeed } from "../lib/mockData";

export default function LiveFeed() {
  return (
    <div className="border-2 border-border p-8 md:p-12">
      <div className="flex items-center gap-3 mb-8">
        <h3 className="text-xl font-bold uppercase tracking-tighter text-foreground">
          AGENT ACTIVITY
        </h3>
        <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
      </div>

      <div className="space-y-0">
        {mockActivityFeed.map((item) => (
          <div
            key={item.id}
            className="border-b border-border/30 py-4 group hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-center gap-4 mb-1">
              <span className="font-mono text-sm text-muted-foreground/60 shrink-0">
                {item.time}
              </span>
              <span className="font-mono text-sm text-accent font-bold uppercase">
                {item.agent}
              </span>
            </div>
            <div className="ml-0">
              <span className="text-base text-foreground uppercase tracking-tight font-medium block">
                {item.action}
              </span>
              <span className="text-sm text-muted-foreground block mt-0.5">
                {item.detail}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
