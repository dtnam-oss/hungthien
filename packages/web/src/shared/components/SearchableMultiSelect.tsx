import { useState, useRef, useEffect, useMemo, useCallback, useId } from 'react';
import type { ReactNode, KeyboardEvent } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import clsx from 'clsx';

export type SelectValue = string | number;

export interface MultiSelectOption<V extends SelectValue = SelectValue> {
  value: V;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

interface CommonProps<V extends SelectValue> {
  options: MultiSelectOption<V>[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** 'auto' = chỉ hiện ô tìm khi có hơn 8 lựa chọn */
  searchable?: boolean | 'auto';
  /** Nút xoá lựa chọn trên trigger (mặc định bật) */
  allowClear?: boolean;
  size?: 'sm' | 'md';
  error?: boolean;
  disabled?: boolean;
  /** Số lựa chọn tối đa vẽ ra; vượt thì nhắc gõ để lọc thêm */
  maxVisible?: number;
  className?: string;
  'aria-label'?: string;
  renderOption?: (option: MultiSelectOption<V>) => ReactNode;
}

export type SearchableMultiSelectProps<V extends SelectValue = SelectValue> = CommonProps<V> & (
  | { mode: 'multi'; value: V[]; onChange: (value: V[]) => void }
  /** single: '' = chưa chọn; clear gọi onChange('', undefined) */
  | { mode: 'single'; value: V | ''; onChange: (value: V | '', option?: MultiSelectOption<V>) => void }
);

const AUTO_SEARCH_THRESHOLD = 8;

function normalize(text: string): string {
  return text.toLowerCase();
}

/** Dropdown tìm nhanh: chọn nhiều (bộ lọc) hoặc chọn một (form) */
export function SearchableMultiSelect<V extends SelectValue = SelectValue>(props: SearchableMultiSelectProps<V>) {
  const {
    options, placeholder = '— Chọn —', searchPlaceholder = 'Tìm kiếm...', searchable = 'auto',
    allowClear = true, size = 'md', error, disabled, maxVisible = 200, className, renderOption,
  } = props;
  const multi = props.mode === 'multi';

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const listId = `${uid}-list`;

  const showSearch = searchable === 'auto' ? options.length > AUTO_SEARCH_THRESHOLD : searchable;

  const selectedKeys = useMemo(() => {
    const raw: SelectValue[] = props.mode === 'multi' ? props.value : props.value === '' ? [] : [props.value];
    return new Set(raw.map(String));
  }, [props.mode, props.value]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    return options.filter((o) => normalize(`${o.label} ${o.sublabel ?? ''}`).includes(q));
  }, [options, query]);
  const visible = filtered.length > maxVisible ? filtered.slice(0, maxVisible) : filtered;
  // Hàng "— Bỏ chọn —" đầu danh sách (chỉ chế độ single, khi chưa lọc)
  const hasClearRow = props.mode === "single" && allowClear && !query.trim();
  const rowOffset = hasClearRow ? 1 : 0;
  const rowCount = visible.length + rowOffset;
  const activeIndex = Math.min(active, Math.max(rowCount - 1, 0));
  const optionId = (i: number) => `${uid}-opt-${i}`;

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setQuery('');
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openMenu = () => {
    if (disabled) return;
    const firstSelected = options.findIndex((o) => selectedKeys.has(String(o.value)));
    setActive(firstSelected >= 0 && firstSelected < maxVisible ? firstSelected + (props.mode === "single" && allowClear ? 1 : 0) : (props.mode === "single" && allowClear ? 1 : 0));
    setOpen(true);
  };

  // Mở: chuyển focus vào ô tìm (hoặc listbox khi không có ô tìm) để bàn phím dùng ngay
  useEffect(() => {
    if (!open) return;
    (showSearch ? inputRef.current : listRef.current)?.focus();
  }, [open, showSearch]);

  // Click ra ngoài → đóng
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);

  // Giữ lựa chọn đang trỏ trong vùng nhìn thấy của danh sách
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${uid}-opt-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, uid]);

  const pick = (option: MultiSelectOption<V>) => {
    if (option.disabled) return;
    if (props.mode === 'single') {
      props.onChange(option.value, option);
      close(true);
      return;
    }
    const key = String(option.value);
    props.onChange(selectedKeys.has(key)
      ? props.value.filter((v) => String(v) !== key)
      : [...props.value, option.value]);
  };

  const selectAllFiltered = () => {
    if (props.mode !== 'multi') return;
    const next = [...props.value];
    for (const o of filtered) {
      if (!o.disabled && !selectedKeys.has(String(o.value))) next.push(o.value);
    }
    props.onChange(next);
  };

  const clearSelection = () => {
    if (props.mode !== 'multi') return;
    if (!query.trim()) { props.onChange([]); return; }
    const inFiltered = new Set(filtered.map((o) => String(o.value)));
    props.onChange(props.value.filter((v) => !inFiltered.has(String(v))));
  };

  const clearAll = () => {
    if (props.mode === 'multi') props.onChange([]);
    else props.onChange('', undefined);
  };

  const pickRow = (i: number) => {
    if (hasClearRow && i === 0) { clearAll(); close(true); return; }
    const option = visible[i - rowOffset];
    if (option) pick(option);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!open) {
      if (e.target !== triggerRef.current) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(); }
      else if ((e.key === 'Backspace' || e.key === 'Delete') && canClear) { e.preventDefault(); clearAll(); }
      return;
    }
    switch (e.key) {
      case 'Escape':
        // Chỉ đóng dropdown, không đóng modal/drawer bao ngoài
        e.stopPropagation();
        e.preventDefault();
        close(true);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActive(Math.min(activeIndex + 1, rowCount - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive(Math.max(activeIndex - 1, 0));
        break;
      case 'Home':
        if (!showSearch) { e.preventDefault(); setActive(0); }
        break;
      case 'End':
        if (!showSearch) { e.preventDefault(); setActive(Math.max(rowCount - 1, 0)); }
        break;
      case 'Enter':
        e.preventDefault();
        pickRow(activeIndex);
        break;
      case ' ':
        // Trong ô tìm, dấu cách là ký tự khi đã gõ chữ
        if (e.target === inputRef.current && query !== '') break;
        e.preventDefault();
        pickRow(activeIndex);
        break;
      case 'Tab':
        close(false);
        break;
      default:
    }
  };

  const selectedOptions = options.filter((o) => selectedKeys.has(String(o.value)));
  let label: string | null = null;
  if (selectedOptions.length === 1) label = selectedOptions[0].label;
  else if (selectedOptions.length > 1) label = `${selectedOptions.length} đã chọn`;
  else if (selectedKeys.size > 0) label = multi ? `${selectedKeys.size} đã chọn` : null;
  const filled = label !== null;
  const focusId = rowCount > 0 ? optionId(activeIndex) : undefined;
  const canClear = filled && allowClear && !disabled;

  return (
    <div ref={rootRef} className={clsx('ms', className)} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close(false) : openMenu())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={props['aria-label']}
        style={canClear ? { paddingRight: 52 } : undefined}
        className={clsx('input ms-trigger', size === 'sm' && 'input-sm', error && 'input-error', multi && filled && 'is-filled')}
      >
        <span className={clsx('ms-value', !filled && 'is-placeholder')}>{label ?? placeholder}</span>
        <span className="ms-trigger-end">
          <ChevronDown className="ms-caret" />
        </span>
      </button>
      {canClear && (
        <button
          type="button"
          aria-label="Bỏ chọn"
          className="icon-btn icon-btn-sm ms-clear"
          style={{ position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)' }}
          onClick={() => { clearAll(); triggerRef.current?.focus(); }}
        >
          <X />
        </button>
      )}

      {open && (
        <div className="menu ms-menu animate-slide-up">
          {showSearch && (
            <div className="ms-search-wrap">
              <div className="search">
                <Search />
                <input
                  ref={inputRef}
                  type="text"
                  role="combobox"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                  aria-expanded
                  aria-controls={listId}
                  aria-activedescendant={focusId}
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                />
              </div>
            </div>
          )}
          {multi && (
            <div className="ms-actions">
              <button type="button" onClick={selectAllFiltered} disabled={filtered.every((o) => o.disabled || selectedKeys.has(String(o.value)))}>
                {query.trim() ? 'Chọn tất cả (đang lọc)' : 'Chọn tất cả'}
              </button>
              <button type="button" onClick={clearSelection} disabled={selectedKeys.size === 0}>Bỏ chọn</button>
            </div>
          )}
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-multiselectable={multi}
            aria-label={props['aria-label'] ?? placeholder}
            aria-activedescendant={showSearch ? undefined : focusId}
            tabIndex={showSearch ? -1 : 0}
            className="ms-list"
            style={{ outline: 'none' }}
          >
            {hasClearRow && (
              <div
                id={optionId(0)}
                role="option"
                aria-selected={false}
                className={clsx('ms-option', activeIndex === 0 && 'is-active')}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(0)}
                onClick={() => pickRow(0)}
              >
                <span className="ms-text"><span className="block truncate" style={{ color: 'var(--placeholder)' }}>— Bỏ chọn —</span></span>
              </div>
            )}
            {visible.length === 0 ? (
              <div className="ms-empty">Không tìm thấy</div>
            ) : visible.map((option, idx) => {
              const i = idx + rowOffset;
              const selected = selectedKeys.has(String(option.value));
              return (
                <div
                  key={option.value}
                  id={optionId(i)}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={option.disabled || undefined}
                  className={clsx('ms-option', i === activeIndex && 'is-active')}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(option)}
                >
                  <input
                    type={multi ? 'checkbox' : 'radio'}
                    className={clsx(multi ? 'checkbox' : 'radio', 'ms-mark')}
                    checked={selected}
                    disabled={option.disabled}
                    tabIndex={-1}
                    aria-hidden
                    readOnly
                    onChange={() => undefined}
                  />
                  <span className="ms-text">
                    {renderOption ? renderOption(option) : (
                      <>
                        <span className="block truncate">{option.label}</span>
                        {option.sublabel && <span className="ms-sub truncate">{option.sublabel}</span>}
                      </>
                    )}
                  </span>
                </div>
              );
            })}
            {filtered.length > visible.length && (
              <div className="ms-more">Còn {filtered.length - visible.length} mục — nhập để lọc thêm</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
