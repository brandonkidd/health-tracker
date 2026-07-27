import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`hc-card ${className}`}>{children}</section>;
}

export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="hc-section-header">
      <div>
        {eyebrow && <div className="hc-eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

/** A card that collapses to its header row; used for the Log today sections. */
export function CollapsibleCard({
  eyebrow,
  title,
  action,
  className = "",
  defaultOpen = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className={`hc-card hc-collapsible ${className}`} open={defaultOpen || undefined}>
      <summary>
        <div className="hc-section-header">
          <div>
            {eyebrow && <div className="hc-eyebrow">{eyebrow}</div>}
            <h2>{title}</h2>
          </div>
          {action && (
            <span
              className="hc-collapsible-action"
              onClick={(event) => {
                // Header buttons (e.g. Clear meals) shouldn't toggle the card.
                event.preventDefault();
              }}
            >
              {action}
            </span>
          )}
          <span className="hc-collapse-chevron" aria-hidden="true">
            ›
          </span>
        </div>
      </summary>
      <div className="hc-collapsible-body">{children}</div>
    </details>
  );
}

export function ProgressMetric({
  label,
  value,
  target,
  unit,
  tone = "default",
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  tone?: "default" | "green" | "blue";
}) {
  const percentage = Math.min(100, Math.round((value / target) * 100));
  return (
    <div className={`hc-metric hc-metric-${tone}`}>
      <div className="hc-metric-top">
        <span>{label}</span>
        <strong>
          {Math.round(value)}
          <small>{unit}</small>
        </strong>
      </div>
      <div className="hc-progress">
        <span style={{ width: `${percentage}%` }} />
      </div>
      <small>{percentage}% of {target}{unit}</small>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="hc-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="hc-empty">{children}</div>;
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "watch" | "follow";
}) {
  return <span className={`hc-badge hc-badge-${tone}`}>{children}</span>;
}
