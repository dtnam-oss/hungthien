import type { ReactNode } from 'react';
import clsx from 'clsx';

/**
 * Ô "nhãn trái · giá trị phải" dùng trong lưới `.kv` (lớp CSS trong index.css).
 * Dùng bên trong: <div className="kv">…</div>
 */
export function FieldRow({ label, value, full, mono, strong }: { label: ReactNode; value: ReactNode; full?: boolean; mono?: boolean; strong?: boolean }) {
  const isEmpty = value === null || value === undefined || value === '' || value === false;
  return (
    <div className={clsx(full && 'full')}>
      <div className="k">{label}</div>
      <div className={clsx('v', mono && 'mono', strong && 'strong')}>
        {isEmpty ? <span style={{ color: 'var(--faint)' }}>—</span> : value}
      </div>
    </div>
  );
}

/** Ô ở chế độ sửa: nhãn trên, control bên dưới */
export function EditFieldRow({ label, children, full, required, hint }: { label: ReactNode; children: ReactNode; full?: boolean; required?: boolean; hint?: ReactNode }) {
  return (
    <div className={clsx('field', full && 'full')}>
      <span className="field-label" style={{ fontSize: 12 }}>{label}{required && <span className="req">*</span>}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

/** Class control dùng ở chế độ sửa trong panel */
export const EDIT_INPUT_CLASS = 'input input-sm';
export const EDIT_SELECT_CLASS = 'select select-sm';
export const EDIT_TEXTAREA_CLASS = 'textarea';
