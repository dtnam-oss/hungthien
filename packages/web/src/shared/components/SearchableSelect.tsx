import { useState, useRef, useEffect, useCallback, useId } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import clsx from 'clsx';

export interface SearchableOption {
  value: string | number;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string | number;
  onChange: (value: string | number, option?: SearchableOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  renderOption?: (option: SearchableOption) => ReactNode;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '— Chọn —',
  searchPlaceholder = 'Tìm kiếm...',
  disabled,
  error,
  size = 'md',
  className = '',
  renderOption,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlight, setHighlight] = useState(0);
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) { inputRef.current?.focus(); setHighlight(0); }
  }, [isOpen]);

  const filtered = search
    ? options.filter((o) => `${o.label} ${o.sublabel || ''}`.toLowerCase().includes(search.toLowerCase()))
    : options;

  const selected = options.find((o) => String(o.value) === String(value));

  const handleSelect = useCallback((option: SearchableOption) => {
    onChange(option.value, option);
    setIsOpen(false);
    setSearch('');
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
    setSearch('');
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const o = filtered[highlight]; if (o) handleSelect(o); }
    else if (e.key === 'Escape') { e.stopPropagation(); setIsOpen(false); setSearch(''); } // chỉ đóng dropdown, không đóng modal/drawer bao ngoài
  };

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={clsx('input flex items-center justify-between gap-2 text-left', size === 'sm' && 'input-sm', error && 'input-error')}
        style={{ paddingRight: 8 }}
      >
        <span className="truncate" style={{ color: selected ? 'var(--text)' : 'var(--placeholder)' }}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span role="button" aria-label="Bỏ chọn" onClick={handleClear} className="icon-btn icon-btn-sm" style={{ width: 22, height: 22 }}>
              <X style={{ width: 13, height: 13 }} />
            </span>
          )}
          <ChevronDown style={{ width: 16, height: 16, color: 'var(--muted-2)', transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : undefined }} />
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="menu absolute z-50 mt-1 w-full animate-slide-up" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--border-light)' }}>
            <div className="search" style={{ width: '100%', height: 32 }}>
              <Search />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setHighlight(0); }}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-expanded={isOpen}
                aria-controls={listId}
                aria-activedescendant={filtered[highlight] ? `${listId}-${highlight}` : undefined}
                placeholder={searchPlaceholder}
              />
            </div>
          </div>
          <div className="max-h-56 overflow-auto" style={{ padding: 4 }}>
            {/* Nút bỏ chọn nằm ngoài listbox để listbox chỉ chứa option */}
            <button
              type="button"
              onClick={() => { onChange('', undefined); setIsOpen(false); setSearch(''); }}
              className="menu-item"
              style={{ color: 'var(--placeholder)' }}
            >
              {placeholder}
            </button>
            <div id={listId} role="listbox">
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: 12.5, color: 'var(--muted)', textAlign: 'center' }}>Không tìm thấy</div>
            ) : (
              filtered.map((option, i) => {
                const isSelected = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    id={`${listId}-${i}`}
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlight(i)}
                    className={clsx('menu-item', isSelected && 'is-active')}
                    style={!isSelected && i === highlight ? { background: 'var(--surface-3)' } : undefined}
                  >
                    <span className="flex-1 min-w-0">
                      {renderOption ? renderOption(option) : (
                        <>
                          <span className="block truncate">{option.label}</span>
                          {option.sublabel && <span className="block truncate" style={{ fontSize: 12, color: 'var(--muted)' }}>{option.sublabel}</span>}
                        </>
                      )}
                    </span>
                    {isSelected && <Check style={{ color: 'var(--accent)' }} />}
                  </button>
                );
              })
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
