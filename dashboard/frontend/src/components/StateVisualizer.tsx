import { useState } from "react";

const states = [
  { id: "IDLE", label: "IDLE" },
  { id: "SCANNING", label: "SCANNING" },
  { id: "FOUND", label: "FOUND" },
  { id: "EXECUTING", label: "EXECUTING" },
  { id: "HOLDING", label: "HOLDING" },
  { id: "EXIT", label: "EXIT" },
  { id: "SETTLING", label: "SETTLING" },
];

export default function StateVisualizer() {
  const [activeState] = useState("SCANNING");

  return (
    <div className="border-2 border-border p-8 md:p-12">
      <h3 className="text-xl font-bold uppercase tracking-tighter text-foreground mb-8">
        STATE MACHINE
      </h3>

      <div className="overflow-x-auto">
        <div className="flex flex-wrap items-center gap-y-4">
          {states.map((state, i) => {
            const isActive = state.id === activeState;
            return (
              <div key={state.id} className="flex items-center">
                <div
                  className={`border-2 px-4 py-3 min-w-[120px] ${
                    isActive
                      ? "border-accent bg-accent/10"
                      : "border-border"
                  }`}
                >
                  <div
                    className={`font-mono text-[2rem] font-bold leading-none ${
                      isActive ? "text-accent" : "text-muted"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div
                    className={`text-[10px] uppercase tracking-widest mt-1 ${
                      isActive ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    {state.label}
                  </div>
                </div>
                {i < states.length - 1 && (
                  <span className="text-2xl text-muted-foreground mx-2 shrink-0">
                    &rarr;
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
