import Link from "next/link";
import type { ReactNode } from "react";
export function PageHeader({
  title,
  eyebrow = "BRAC University",
  description,
  home = "/app",
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  home?: string;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="page-panel__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      <Link className="page-panel__close" href={home} aria-label="Back to portal">
        ×
      </Link>
    </header>
  );
}
export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`demo-card stack ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state-card">
      <h2>{title}</h2>
      <div className="muted">{children}</div>
    </div>
  );
}
export function Metrics({ items }: { items: [string | number, string][] }) {
  return (
    <div className="metric-grid">
      {items.map(([value, label]) => (
        <div className="metric" key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
export function Field({
  label,
  name,
  type = "text",
  value,
  required = true,
  children,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  required?: boolean;
  children?: ReactNode;
  min?: string | number;
  max?: string | number;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {children || (
        <input name={name} type={type} defaultValue={value} required={required} {...rest} />
      )}
    </label>
  );
}
export function Tag({ children }: { children: ReactNode }) {
  return <span className="status-chip">{children}</span>;
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Dhaka" }).format(
    new Date(value),
  );
}
export function timeLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
