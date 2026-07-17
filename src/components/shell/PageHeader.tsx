import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  meta?: ReactNode;
  action?: ReactNode;
  accent?: "violet" | "blue" | "orange" | "lime";
};

export function PageHeader({ eyebrow, title, description, meta, action, accent = "violet" }: PageHeaderProps) {
  return (
    <header className={`tm-page-header tm-accent-${accent}`}>
      <div className="tm-page-heading">
        <p className="tm-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="tm-page-description">{description}</p>
      </div>
      {meta || action ? <div className="tm-page-header-aside">{meta}{action}</div> : null}
    </header>
  );
}
