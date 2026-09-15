// FitTrack Phase 5 – SystemFeedback Samples (kopierfertig, ohne Emoji, ohne Hex)
// Klassenvertraege aus ../styles/components.css. Farben nur via tokens.css-Vars.
// A11y: Sheet = dialog/modal + Escape + Fokus-Rueckgabe, Snackbar = role="status",
// ErrorBanner = role="alert", Skeletons = aria-hidden + sr-only Live-Text.

import React, { useEffect, useRef } from "react";
import { AlertTriangle, Check, Trash2, X, type LucideIcon } from "lucide-react";

// ---------- 1) DeleteConfirmSheet (Bottom-Sheet statt sofort loeschen) ----------

export function DeleteConfirmSheet(props: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { open, title, description, confirmLabel = "Löschen", onConfirm, onClose } = props;
  const confirmRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (prevFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="sheet-backdrop"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-sheet-title"
        aria-describedby={description ? "delete-sheet-desc" : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="empty-state-illustration" aria-hidden="true">
            <Trash2 size={28} />
          </span>
          <h2 id="delete-sheet-title" style={{ font: "var(--font-h2)", color: "var(--text-primary)" }}>
            {title}
          </h2>
        </div>
        {description && (
          <p id="delete-sheet-desc" style={{ font: "var(--font-body)", color: "var(--text-secondary)" }}>
            {description}
          </p>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="primary-btn"
            onClick={onClose}
            style={{ flex: 1, background: "var(--surface-2)", color: "var(--text-primary)", minHeight: "var(--touch-min)" }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            ref={confirmRef}
            className="primary-btn"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{ flex: 1, background: "var(--danger)", color: "var(--danger-contrast)", minHeight: "var(--touch-min)" }}
          >
            <Trash2 size={16} aria-hidden="true" /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- 2) UndoSnackbar (5s, role="status") ----------

export function UndoSnackbar(props: { message: string; onUndo: () => void; onDone: () => void }) {
  const { message, onUndo, onDone } = props;
  const timer = useRef<number | null>(null);

  useEffect(() => {
    timer.current = window.setTimeout(onDone, 5000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [onDone]);

  return (
    <div
      className="undo-snackbar"
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
        width: "calc(100% - 32px)",
        maxWidth: 448,
        zIndex: 210,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 12px 12px 16px",
      }}
    >
      <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
        <Check size={16} aria-hidden="true" color="var(--success)" />
        {message}
      </span>
      <button
        type="button"
        className="link-btn"
        style={{ minHeight: "var(--touch-min)", minWidth: "var(--touch-min)", padding: "8px 12px" }}
        onClick={() => {
          if (timer.current) window.clearTimeout(timer.current);
          onUndo();
          onDone();
        }}
      >
        Rückgängig
      </button>
    </div>
  );
}

// ---------- 3) SkeletonCards (Ladezustand, aria-hidden + sr-only) ----------

export function SkeletonCards({ count = 3, label = "Wird geladen" }: { count?: number; label?: string }) {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        {label} …
      </span>
      <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div style={{ height: 14, width: "55%", borderRadius: 7, background: "var(--surface-2)" }} />
            <div style={{ height: 10, width: "35%", borderRadius: 5, background: "var(--surface-2)", marginTop: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- 4) EmptyState (72px Lucide-Kreis + Headline + CTA, ohne Emoji) ----------

export function EmptyState(props: {
  icon: LucideIcon;
  headline: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  const { icon: Icon, headline, body, ctaLabel, onCta } = props;
  return (
    <div
      style={{
        border: "1.5px dashed var(--border-strong)",
        borderRadius: "var(--radius-20)",
        padding: "var(--space-24) var(--space-16)",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span className="empty-state-illustration" aria-hidden="true">
        <Icon size={32} />
      </span>
      <h2 style={{ font: "var(--font-h2)", color: "var(--text-primary)" }}>{headline}</h2>
      {body && <p style={{ font: "var(--font-body)", color: "var(--text-secondary)", maxWidth: 320 }}>{body}</p>}
      {ctaLabel && onCta && (
        <button
          type="button"
          className="primary-btn"
          onClick={onCta}
          style={{ minHeight: "var(--touch-min)", padding: "12px 18px", background: "var(--accent)", color: "var(--accent-contrast)" }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

// ---------- 5) ErrorBanner (role="alert") ----------

export function ErrorBanner(props: { message: string; onDismiss?: () => void }) {
  const { message, onDismiss } = props;
  if (!message) return null;
  return (
    <div
      className="error-banner"
      role="alert"
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <AlertTriangle size={16} aria-hidden="true" />
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="icon-btn-ghost"
          aria-label="Fehlermeldung schließen"
          onClick={onDismiss}
          style={{ color: "inherit" }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
