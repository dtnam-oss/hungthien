import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

/* ── PageHeader ────────────────────────────────────────────────────── */

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Nút hành động bên phải */
  actions?: ReactNode;
  /** Nội dung dưới tiêu đề (tabs, meta...) */
  children?: ReactNode;
}

export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <div className="page-head">
      <div className="page-head-text">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {children}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

/* ── Card ──────────────────────────────────────────────────────────── */

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('card', className)} {...rest}>{children}</div>;
}

export function CardHeader({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={clsx('card-head', className)}>
      {title && <div className="card-title">{title}</div>}
      {children}
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('card-body', className)} {...rest}>{children}</div>;
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('card-foot', className)} {...rest}>{children}</div>;
}

/** Card nhỏ nền trắng dùng bên trong drawer / panel (nền surface-2) */
export function SubCard({ title, actions, className, children }: { title?: ReactNode; actions?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={clsx('sub-card', className)}>
      {(title || actions) && (
        <div className="flex items-center gap-2">
          {title && <h4 className="sub-card-title flex-1 min-w-0">{title}</h4>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h4 className={clsx('section-title', className)}>{children}</h4>;
}

/* Nhãn/giá trị trong panel: dùng <div className="kv"> + FieldRow/EditFieldRow (shared/components/FieldRow) */

/* ── Toolbar / table footer ────────────────────────────────────────── */

export function Toolbar({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('toolbar', className)}>{children}</div>;
}

export function ToolbarSpacer() {
  return <div className="toolbar-spacer" />;
}
