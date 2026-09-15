import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

// FitTrack Phase 6 – Performance Sample: virtualisierte Workout-Historie
// Pfad-Ziel: ../fittrack/src/components/WorkoutHistory.virtualized.tsx
// Vorlage liegt in FitX/src/components/WorkoutHistory.virtualized.tsx
//
// Warum: fitX.js rendert aktuell ALLE Workouts gruppiert per <details>.
// Bei 1000 Workouts -> tausende DOM-Nodes -> Scroll-Jank, v.a. Low-End.
// Lösung: @tanstack/react-virtual, nur sichtbare Rows im DOM.
//
// Vorgaben Phase 6:
//   - overscan: 4
//   - estimateSize: 148 (px, entspricht .row-card + Margin auf Mobile)
//   - Install: npm i @tanstack/react-virtual
//
// Verwendung:
//   <WorkoutHistoryVirtualized workouts={workouts} onDelete={(id) => ...} />
// Fallback: bei < 50 Einträgen kann die alte gruppierte Liste bleiben.

export type WorkoutSet = { reps?: string; weight?: string };
export type Workout = {
  id: string;
  name?: string;
  ts: number;
  sets?: WorkoutSet[];
};

type Props = {
  workouts: Workout[];
  onDelete?: (id: string) => void;
};

function formatSets(sets?: WorkoutSet[]): string {
  if (!sets || !sets.length) return "keine Sätze";
  return sets.map((s) => `${s.reps || "-"}×${s.weight || "-"}kg`).join(", ");
}

export default function WorkoutHistoryVirtualized({ workouts, onDelete }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Neueste zuerst – einmalig sortieren, nicht im Virtualizer.
  const sorted: Workout[] = [...(workouts ?? [])]
    .filter((w) => w && w.ts != null)
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 148,
    overscan: 4,
  });

  if (!sorted.length) {
    return <div className="empty-hint">Noch keine Workouts. Tipp auf + und leg los.</div>;
  }

  return (
    <div
      ref={parentRef}
      style={{ height: "60vh", overflow: "auto", position: "relative" }}
      data-testid="workout-history-scroll"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const w = sorted[vi.index];
          return (
            <div
              key={w.id ?? vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
                paddingBottom: 8,
              }}
            >
              <div className="row-card card-in">
                <div style={{ flex: 1 }}>
                  <div className="row-title">
                    {w.name || "Workout"} ·{" "}
                    {new Date(w.ts).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </div>
                  <div className="row-sub">{formatSets(w.sets)}</div>
                </div>
                {onDelete && (
                  <button
                    className="icon-btn-ghost"
                    onClick={() => onDelete(w.id)}
                    aria-label={`${w.name || "Workout"} löschen`}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
