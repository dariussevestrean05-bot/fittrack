// FitTrack Phase 4 – components/CheckinPagination.tsx
// Fix für fitX.js Z.1322: safe.slice(0,6) ohne Sort + ohne Pagination.
// Neu: ts-desc Sort + pageSize 12 + "Mehr laden".

import { useMemo, useState } from "react";

export interface Checkin {
  id: string;
  ts: number | string;
  photo?: string;
}

interface Props {
  checkins: Checkin[];
  onRemove?: (id: string) => void;
  pageSize?: number;
}

function tsOf(c: Checkin): number {
  const t = Number((c as any)?.ts);
  if (Number.isFinite(t)) return t;
  const d = new Date((c as any)?.ts as any).getTime();
  return Number.isFinite(d) ? d : 0;
}

export function CheckinPagination({ checkins, onRemove, pageSize = 12 }: Props) {
  const [visible, setVisible] = useState(pageSize);

  const sorted = useMemo(() => {
    const safe = Array.isArray(checkins) ? checkins.filter(Boolean) : [];
    return [...safe].sort((a, b) => tsOf(b) - tsOf(a)); // ts desc
  }, [checkins]);

  const shown = sorted.slice(0, visible);
  const hasMore = visible < sorted.length;

  if (!sorted.length) {
    return <div className="empty-hint">Noch keine Nachweise. Checke dein erstes Training mit Foto ein.</div>;
  }

  return (
    <div>
      <div className="checkin-grid">
        {shown.map((c) => (
          <div key={c.id} className="checkin-item">
            {c.photo && <img src={c.photo} alt="Gym-Nachweis" className="checkin-thumb" />}
            <div className="row-sub">
              {tsOf(c) ? new Date(tsOf(c)).toLocaleDateString("de-DE") : "–"}
            </div>
            {onRemove && (
              <button className="icon-btn-ghost" onClick={() => onRemove(c.id)} aria-label="Nachweis löschen">
                Löschen
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="row-sub" style={{ marginTop: 8 }}>
        {shown.length} von {sorted.length} Nachweisen
      </div>
      {hasMore && (
        <button className="link-btn" onClick={() => setVisible((v) => v + pageSize)}>
          Mehr laden ({sorted.length - visible} weitere)
        </button>
      )}
    </div>
  );
}
