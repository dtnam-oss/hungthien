import { useCallback, useEffect, useId, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

export interface ModalOverlayProps {
  isOpen?: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Nút ở footer (thường là Hủy / Lưu) */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Tương thích cũ: class max-width Tailwind, ví dụ "max-w-2xl" */
  maxWidth?: string;
  /** Không đóng khi bấm nền */
  disableBackdropClose?: boolean;
}

const SIZE_CLASS = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ModalOverlay({
  isOpen = true, onClose, title, subtitle, children, footer, size = 'md', maxWidth, disableBackdropClose,
}: ModalOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Giữ onClose trong ref để effect mở/đóng không chạy lại mỗi render (trang thường truyền lambda inline)
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const focusables = useCallback(
    () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((el) => el.offsetParent !== null),
    [],
  );

  /**
   * Phím xử lý ngay trên dialog: Esc đóng (stopPropagation để drawer/panel bên dưới không nhận Esc),
   * Tab/Shift+Tab quay vòng trong modal. Control con (SearchableSelect) có thể stopPropagation trước.
   */
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return; }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (items.length === 0) return;
    const firstEl = items[0];
    const lastEl = items[items.length - 1];
    const active = document.activeElement;
    // Focus đang ở chính khung dialog (sau khi bấm vào chữ) → vào control đầu/cuối
    const onContainer = active === dialogRef.current;
    if (e.shiftKey && (active === firstEl || onContainer)) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && (active === lastEl || onContainer)) { e.preventDefault(); firstEl.focus(); }
  };

  // Mở: focus control đầu tiên · khóa cuộn nền · kéo focus về modal nếu lạc ra ngoài · đóng: trả focus
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const items = focusables();
    (items.find((el) => !el.closest('.modal-head')) ?? items[0])?.focus();

    // Fallback khi focus lạc ra ngoài dialog (ví dụ body): bắt ở capture phase + chặn lan
    // để listener Esc của drawer/panel bên dưới không chạy
    const outside = (e: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.contains(document.activeElement)) return;
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); }
      else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); focusables()[0]?.focus(); }
    };
    document.addEventListener('keydown', outside, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', outside, true);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [isOpen, focusables]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6">
      <div className="modal-backdrop animate-fade-in" onClick={disableBackdropClose ? undefined : onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={clsx('modal animate-scale-in', maxWidth || SIZE_CLASS[size])}
        style={{ zIndex: 1 }}
      >
        <div className="modal-head">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="modal-title truncate">{title}</h2>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)" className="icon-btn"><X /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
