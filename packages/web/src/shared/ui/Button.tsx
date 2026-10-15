import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

/* ── Button ────────────────────────────────────────────────────────── */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-solid' | 'dashed' | 'dark';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** React 19: ref là prop thường, được spread xuống <button> */
  ref?: Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Hiện spinner và disable nút */
  loading?: boolean;
  /** Icon đặt trước nội dung */
  icon?: ReactNode;
  block?: boolean;
}

const SIZE_CLASS: Record<ButtonSize, string> = { xs: 'btn-xs', sm: 'btn-sm', md: '', lg: 'btn-lg' };

export function Button({
  variant = 'secondary', size = 'md', loading, icon, block,
  className, children, disabled, type = 'button', ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx('btn', `btn-${variant}`, SIZE_CLASS[size], block && 'btn-block', className)}
      {...rest}
    >
      {loading ? <Loader2 className="spinner" /> : icon}
      {children}
    </button>
  );
}

/* ── IconButton ───────────────────────────────────────────────────── */

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  ref?: Ref<HTMLButtonElement>;
  /** Bắt buộc: dùng làm aria-label + title */
  label: string;
  size?: 'sm' | 'md';
  tone?: 'default' | 'danger' | 'brand';
  outline?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function IconButton({
  label, size = 'md', tone = 'default', outline, loading,
  className, children, disabled, type = 'button', ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      className={clsx(
        'icon-btn',
        size === 'sm' && 'icon-btn-sm',
        tone === 'danger' && 'icon-btn-danger',
        tone === 'brand' && 'icon-btn-brand',
        outline && 'icon-btn-outline',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="spinner" /> : children}
    </button>
  );
}
