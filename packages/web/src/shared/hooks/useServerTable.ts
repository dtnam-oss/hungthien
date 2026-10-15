import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../api';

export interface ServerTableColumn {
  sortable: boolean;
}

/** Giá trị lọc: mảng được gửi dạng CSV (), mảng rỗng bị bỏ qua */
export type ServerTableFilterValue = string | number | (string | number)[] | undefined;

export interface UseServerTableParams {
  endpoint: string;
  filters: Record<string, ServerTableFilterValue>;
  columns: ServerTableColumn[];
  defaultLength?: number;
}

interface DTResponse<T> {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: T[];
  customerStats?: { id: number; name: string; count: number }[];
  statusStats?: { status: string; count: number }[];
}

export interface UseServerTableReturn<T> {
  data: T[];
  recordsTotal: number;
  recordsFiltered: number;
  loading: boolean;
  error: string | null;
  start: number;
  length: number;
  search: string;
  orderCol: number;
  orderDir: 'asc' | 'desc';
  draw: number;
  setSearch: (v: string) => void;
  setPage: (page: number) => void;
  setSort: (col: number) => void;
  setLength: (n: number) => void;
  reload: () => void;
  customerStats: { id: number; name: string; count: number }[];
  statusStats: { status: string; count: number }[];
  currentPage: number;
  totalPages: number;
}

export function useServerTable<T>(params: UseServerTableParams): UseServerTableReturn<T> {
  const { endpoint, filters, columns, defaultLength = 100 } = params;

  const [data, setData] = useState<T[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsFiltered, setRecordsFiltered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerStats, setCustomerStats] = useState<{ id: number; name: string; count: number }[]>([]);
  const [statusStats, setStatusStats] = useState<{ status: string; count: number }[]>([]);

  const [start, setStart] = useState(0);
  const [length, setLengthState] = useState(defaultLength);
  const [search, setSearchState] = useState('');
  // -1 = chưa chọn cột sort → không gửi order[0]*, server dùng sort mặc định của module
  const [orderCol, setOrderCol] = useState(-1);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc');
  const [drawCounter, setDrawCounter] = useState(1);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersKey = JSON.stringify(filters);
  // Đổi bộ lọc → về trang 1 ngay trong lúc render (trước khi effect fetch chạy), tránh xin trang rỗng
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (prevFiltersKey !== filtersKey) {
    setPrevFiltersKey(filtersKey);
    setStart(0);
  }

  const fetchData = useCallback(async (draw: number) => {
    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const parsedFilters = JSON.parse(filtersKey) as Record<string, ServerTableFilterValue>;
      const queryParams: Record<string, string | number> = {
        draw,
        start,
        length,
        'search[value]': search,
      };
      if (orderCol >= 0) {
        queryParams['order[0][column]'] = orderCol;
        queryParams['order[0][dir]'] = orderDir;
      }
      for (const [key, value] of Object.entries(parsedFilters)) {
        if (Array.isArray(value)) {
          if (value.length > 0) queryParams[key] = value.join(',');
        } else if (value !== undefined && value !== null && value !== '') {
          queryParams[key] = value;
        }
      }

      const res = await api.get<DTResponse<T>>(endpoint, {
        params: queryParams,
        signal: controller.signal,
      });

      // Only apply if this is still the current request
      if (!controller.signal.aborted) {
        // Trang hiện tại vượt quá tổng (sau khi xóa/lọc) → lùi về trang cuối còn dữ liệu
        if (start > 0 && res.data.recordsFiltered <= start) {
          setStart(Math.max(0, Math.floor((res.data.recordsFiltered - 1) / length) * length));
          return;
        }
        setData(res.data.data);
        setRecordsTotal(res.data.recordsTotal);
        setRecordsFiltered(res.data.recordsFiltered);
        setCustomerStats(res.data.customerStats ?? []);
        setStatusStats(res.data.statusStats ?? []);
        setLoading(false);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return; // Cancelled, ignore

      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        // 401: redirect to login, do NOT set error
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }

      setError(
        axiosErr.response?.status
          ? `Lỗi server (${axiosErr.response.status})`
          : 'Lỗi kết nối mạng'
      );
      setLoading(false);
    }
  }, [endpoint, start, length, search, orderCol, orderDir, filtersKey]);

  // Trigger fetch when non-search params change (immediate)
  useEffect(() => {
    const draw = drawCounter;
    fetchData(draw);
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData, drawCounter]);

  // Search: debounced 300ms
  const setSearch = useCallback((v: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchState(v);
      setStart(0); // Reset to first page on search
      setDrawCounter((d) => d + 1);
    }, 300);
  }, []);

  // Page: immediate
  const setPage = useCallback((page: number) => {
    setStart((page - 1) * length);
    setDrawCounter((d) => d + 1);
  }, [length]);

  // Sort: immediate, toggle dir if same col
  // Không gọi setState lồng trong updater: StrictMode chạy updater 2 lần sẽ đảo hướng 2 lần
  const setSort = useCallback((col: number) => {
    if (!columns[col]?.sortable) return;
    if (orderCol === col) setOrderDir(orderDir === 'asc' ? 'desc' : 'asc');
    else setOrderDir('asc');
    setOrderCol(col);
    setDrawCounter((d) => d + 1);
  }, [columns, orderCol, orderDir]);

  // Length: immediate, giữ start là bội của length mới để trang hiện tại vẫn hợp lệ
  const setLength = useCallback((n: number) => {
    if (!Number.isFinite(n) || n <= 0) return;
    setLengthState(n);
    setStart((s) => Math.floor(s / n) * n);
    setDrawCounter((d) => d + 1);
  }, []);

  // Reload: immediate
  const reload = useCallback(() => {
    setDrawCounter((d) => d + 1);
  }, []);

  const currentPage = Math.floor(start / length) + 1;
  const totalPages = Math.max(1, Math.ceil(recordsFiltered / length));

  return {
    data, recordsTotal, recordsFiltered,
    loading, error,
    start, length, search, orderCol, orderDir,
    draw: drawCounter,
    setSearch, setPage, setSort, setLength, reload,
    customerStats, statusStats,
    currentPage, totalPages,
  };
}
