interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
}

export default function StatCard({ label, value, subtitle, accent = false }: StatCardProps) {
  return (
    <div className="border-2 border-border p-8 group hover:bg-accent transition-colors duration-300">
      <span
        className={`font-mono text-[3rem] md:text-[4rem] font-bold leading-none block group-hover:text-accent-foreground ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </span>
      <span className="text-xs uppercase tracking-widest text-muted-foreground mt-2 block group-hover:text-accent-foreground/70">
        {label}
      </span>
      {subtitle && (
        <span className="text-sm text-muted-foreground/50 mt-1 block group-hover:text-accent-foreground/50">
          {subtitle}
        </span>
      )}
    </div>
  );
}
