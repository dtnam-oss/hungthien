import { useEffect, useState, useCallback, useRef, useId } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2, Pencil, Trash2, Save, Loader2, Undo2 } from 'lucide-react';
import clsx from 'clsx';

export interface DetailPanelTab {
  key: string;
  label: string;
  icon?: ReactNode;
}

export interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Nội dung đặt cạnh tiêu đề (pill trạng thái...) */
  titleAddon?: ReactNode;
  // Edit controls
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  saving?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  // Custom header buttons
  headerActions?: ReactNode;
  // Tabs
  tabs?: DetailPanelTab[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  // Footer cố định
  footer?: ReactNode;
  // Layout mode
  inlineMode?: boolean;
  /** Tương thích cũ — parent tự quyết định chiều rộng */
  inlineFillParent?: boolean;
  children: ReactNode;
}

export function DetailPanel({
  isOpen, onClose, title, subtitle, titleAddon,
  isEditing, onToggleEdit, onSave, onDelete, saving,
  canEdit, canDelete,
  headerActions,
  tabs, activeTab, onTabChange,
  footer,
  inlineMode,
  children,
}: DetailPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLg, setIsLg] = useState(() => window.matchMedia('(min-width: 1024px)').matches);

  // Detect >=lg breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsLg(e.matches);
    handler(mq);
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  // Escape: fullscreen→minimize first, then close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      if (isFullscreen) setIsFullscreen(false);
      else onClose();
    }
  }, [isOpen, isFullscreen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => { if (!isOpen) setIsFullscreen(false); }, [isOpen]);

  // Khi mở panel, đưa focus vào nút đóng để bàn phím/màn hình đọc vào đúng ngữ cảnh
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (isOpen) closeBtnRef.current?.focus(); }, [isOpen]);
  const titleId = useId();

  if (!isOpen) return null;

  const useInline = inlineMode && isLg && !isFullscreen;
  const hasTabs = !!tabs && tabs.length > 0;

  // ── Header ──────────────────────────────────────────────────
  const header = (
    <div className={clsx('drawer-head', !hasTabs && 'no-tabs')}>
      <div className="drawer-title">
        <div className="info">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h3 id={titleId} className="truncate">{title}</h3>
            {titleAddon}
          </div>
          {subtitle && <div className="sub truncate">{subtitle}</div>}
        </div>
        <div className="actions">
          {headerActions}
          {canEdit && !isEditing && onToggleEdit && (
            <button type="button" onClick={onToggleEdit} aria-label="Sửa" title="Sửa" className="icon-btn"><Pencil /></button>
          )}
          {isEditing && onToggleEdit && (
            <button type="button" onClick={onToggleEdit} aria-label="Hủy sửa" title="Hủy sửa" className="icon-btn" disabled={saving}><Undo2 /></button>
          )}
          {isEditing && onSave && (
            <button type="button" onClick={onSave} disabled={saving} aria-label="Lưu" title="Lưu" className="icon-btn icon-btn-brand">
              {saving ? <Loader2 className="spinner" /> : <Save />}
            </button>
          )}
          {canDelete && onDelete && !isEditing && (
            <button type="button" onClick={onDelete} aria-label="Xóa" title="Xóa" className="icon-btn icon-btn-danger"><Trash2 /></button>
          )}
          <button type="button" onClick={() => setIsFullscreen(!isFullscreen)} aria-label={isFullscreen ? 'Thu nhỏ' : 'Mở toàn trang'} title={isFullscreen ? 'Thu nhỏ' : 'Mở toàn trang'} className="icon-btn hidden sm:inline-flex">
            {isFullscreen ? <Minimize2 /> : <Maximize2 />}
          </button>
          <button ref={closeBtnRef} type="button" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)" className="icon-btn"><X /></button>
        </div>
      </div>
      {hasTabs && (
        <div role="tablist" className="tabs" style={{ borderBottom: 0, padding: 0 }}>
          {tabs!.map((tab) => (
            <button key={tab.key} role="tab" aria-selected={activeTab === tab.key} onClick={() => onTabChange?.(tab.key)}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── Panel content ───────────────────────────────────────────
  const panelContent = (
    <div className="drawer" role={useInline ? 'region' : undefined} aria-labelledby={useInline ? titleId : undefined}>
      {header}
      <div className="drawer-body">{children}</div>
      {footer && <div className="drawer-foot">{footer}</div>}
    </div>
  );

  // ── Fullscreen: render via portal ───────────────────────────
  if (isFullscreen) {
    return createPortal(
      <div className="fixed inset-0 z-[80] bg-surface flex flex-col animate-fade-in" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="mx-auto w-full h-full flex flex-col" style={{ maxWidth: 1100 }}>
          {panelContent}
        </div>
      </div>,
      document.body,
    );
  }

  // ── Inline mode (≥lg): render directly, parent controls width ──
  if (useInline) return panelContent;

  // ── Overlay mode (<lg or inlineMode=false): slide from right ─
  return createPortal(
    <>
      <div className="fixed inset-0 z-40 animate-fade-in" style={{ background: 'rgba(24,24,27,0.35)' }} onClick={onClose} aria-hidden />
      <div
        className="fixed inset-y-0 right-0 z-50 w-full animate-slide-in-right"
        style={{ maxWidth: 'min(100%, var(--drawer-w))', boxShadow: 'var(--shadow-drawer)', borderLeft: '1px solid var(--border)' }}
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
      >
        {panelContent}
      </div>
    </>,
    document.body,
  );
}
