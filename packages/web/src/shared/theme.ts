import { useCallback, useEffect, useState } from 'react';

/* Chế độ sáng/tối: lưu localStorage, mặc định theo hệ điều hành.
   Áp dụng bằng thuộc tính data-theme trên <html>; token CSS tự đổi. */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'ht-theme';
const EVENT = 'ht-theme-change';

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore */ }
  return systemTheme();
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

export function setTheme(theme: Theme) {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  applyTheme(theme);
}

/** Gọi một lần trước khi render để tránh nháy màu */
export function initTheme() {
  applyTheme(getTheme());
  // Theo hệ điều hành nếu người dùng chưa chọn tay
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    try { if (localStorage.getItem(STORAGE_KEY)) return; } catch { /* ignore */ }
    applyTheme(systemTheme());
  });
}

export function useTheme(): [Theme, () => void] {
  const [theme, setState] = useState<Theme>(() => (typeof document === 'undefined' ? 'light' : getTheme()));

  useEffect(() => {
    const handler = (e: Event) => setState((e as CustomEvent<Theme>).detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const toggle = useCallback(() => setTheme(getTheme() === 'dark' ? 'light' : 'dark'), []);
  return [theme, toggle];
}
