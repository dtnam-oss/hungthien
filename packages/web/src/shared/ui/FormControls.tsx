import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import clsx from 'clsx';

/* ── Input ─────────────────────────────────────────────────────────── */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: boolean;
  size?: 'sm' | 'md';
  mono?: boolean;
}

export function Input({ error, size = 'md', mono, className, ...rest }: InputProps) {
  return (
    <input
      className={clsx('input', size === 'sm' && 'input-sm', error && 'input-error', mono && 'input-mono', className)}
      {...rest}
    />
  );
}

/* ── Select ────────────────────────────────────────────────────────── */

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  error?: boolean;
  size?: 'sm' | 'md';
  /** Rộng theo nội dung thay vì 100% */
  auto?: boolean;
}

export function Select({ error, size = 'md', auto, className, children, ...rest }: SelectProps) {
  return (
    <select
      className={clsx('select', size === 'sm' && 'select-sm', error && 'select-error', auto && 'select-auto', className)}
      {...rest}
    >
      {children}
    </select>
  );
}

/* ── Textarea ──────────────────────────────────────────────────────── */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className, ...rest }: TextareaProps) {
  return <textarea className={clsx('textarea', error && 'textarea-error', className)} {...rest} />;
}

/* ── Checkbox ──────────────────────────────────────────────────────── */

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  const box = <input type="checkbox" className={clsx('checkbox', !label && className)} {...rest} />;
  if (!label) return box;
  return (
    <label className={clsx('check-label', className)}>
      {box}
      <span>{label}</span>
    </label>
  );
}

/* ── Field (label + control + hint/error) ─────────────────────────── */

export interface FieldProps {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  /** Chiếm hết chiều ngang trong .form-grid */
  full?: boolean;
  className?: string;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, required, hint, error, full, className, htmlFor, children }: FieldProps) {
  return (
    <div className={clsx('field', full && 'field-full', className)}>
      {label && (
        <label htmlFor={htmlFor} className="field-label">
          {label}{required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

/* ── FormGrid ──────────────────────────────────────────────────────── */

export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('form-grid', className)}>{children}</div>;
}

/* ── SearchBox ─────────────────────────────────────────────────────── */

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  /** Gọi khi nhấn Enter */
  onSubmit?: () => void;
  placeholder?: string;
  width?: number | string;
  className?: string;
  autoFocus?: boolean;
  /** Hiện phím tắt (ví dụ "Ctrl K") */
  kbd?: string;
}

export function SearchBox({ value, onChange, onSubmit, placeholder = 'Tìm kiếm...', width, className, autoFocus, kbd }: SearchBoxProps) {
  const handleSubmit = (e: FormEvent) => { e.preventDefault(); onSubmit?.(); };
  return (
    <form role="search" onSubmit={handleSubmit} className={clsx('search', className)} style={width !== undefined ? { width } : undefined}>
      <Search />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={placeholder}
      />
      {value ? (
        <button type="button" onClick={() => { onChange(''); onSubmit?.(); }} aria-label="Xóa tìm kiếm" className="icon-btn icon-btn-sm" style={{ marginRight: -6 }}>
          <X />
        </button>
      ) : kbd ? <kbd>{kbd}</kbd> : null}
    </form>
  );
}

/* FilterSelect đã thay bằng SearchableMultiSelect (shared/components) */

/* ── DateRange (2 input ngày trong một khung) ──────────────────────── */

export interface DateRangeProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  icon?: ReactNode;
  className?: string;
}

export function DateRange({ from, to, onChange, icon, className }: DateRangeProps) {
  return (
    <div className={clsx('filter', className)}>
      {icon}
      <input type="date" value={from} onChange={(e) => onChange(e.target.value, to)} aria-label="Từ ngày" />
      <span style={{ color: 'var(--muted)' }}>–</span>
      <input type="date" value={to} onChange={(e) => onChange(from, e.target.value)} aria-label="Đến ngày" />
    </div>
  );
}
