import { useState, useEffect, useRef, useCallback } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import clsx from 'clsx';
import { useAuth } from '../../shared/auth-context';
import { useServerTable } from '../../shared/hooks/useServerTable';
import type { ServerTableColumn } from '../../shared/hooks/useServerTable';
import { DetailPanel } from '../../shared/components/DetailPanel';
import { ModalOverlay } from '../../shared/components/ModalOverlay';
import { FieldRow, EditFieldRow, EDIT_INPUT_CLASS, EDIT_SELECT_CLASS, EDIT_TEXTAREA_CLASS } from '../../shared/components/FieldRow';
import {
  Alert, Button, Card, EmptyState, Field, FilterSelect, FormGrid, Input, LoadingBlock,
  PageHeader, SearchBox, Spinner, StatusPill, SubCard,
} from '../../shared/ui';
import { errorMessage } from '../../shared/format';
import api from '../../shared/api';
import { Plus, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */

interface Customer {
  id: number;
  code: string;
  name: string;
  shortName: string | null;
  taxCode: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  contactPerson: string | null;
  status: string;
  notes: string | null;
  version: number;
}

interface CustomerEditForm {
  name: string;
  shortName: string;
  taxCode: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  status: string;
  notes: string;
  version: number;
}

/* ── Cột hiển thị. `sortIndex` = vị trí trong SORTABLE_COLUMNS của backend
   (customer.routes.ts: code, name, taxCode, email, phone, status) ─────── */

const TABLE_COLUMNS: { key: string; label: string; sortIndex?: number; className?: string }[] = [
  { key: '#',             label: '#',              className: 'w-10 center' },
  { key: 'code',          label: 'Mã KH',         sortIndex: 0, className: 'w-24' },
  { key: 'name',          label: 'Tên khách hàng', sortIndex: 1 },
  { key: 'taxCode',       label: 'MST',            sortIndex: 2, className: 'w-28 hidden md:table-cell' },
  { key: 'address',       label: 'Địa chỉ',       className: 'hidden xl:table-cell' },
  { key: 'contactPerson', label: 'Người LH',      className: 'w-32 hidden lg:table-cell' },
  { key: 'phone',         label: 'SĐT',           sortIndex: 4, className: 'w-28 hidden md:table-cell' },
  { key: 'status',        label: 'Trạng thái',    sortIndex: 5, className: 'w-28' },
];

/* Danh sách cột gửi lên server, đúng thứ tự SORTABLE_COLUMNS ở backend */
const SERVER_COLUMNS: ServerTableColumn[] = ['code', 'name', 'taxCode', 'email', 'phone', 'status'].map(() => ({ sortable: true }));

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng HĐ',
};

const CREATE_FORM_ID = 'create-customer-form';

/* ── Component ─────────────────────────────────────────────────────── */

export function CustomerListPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('pricing', 'canEdit');
  const canDelete = hasPermission('pricing', 'canDelete');
  const [showCreate, setShowCreate] = useState(false);

  /* ── Breakpoint ≥lg ──────────────────────────────────────────── */
  const [isLg, setIsLg] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ── Filters ──────────────────────────────────────────────────── */
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');

  /* ── Server table hook ────────────────────────────────────────── */
  const filters: Record<string, string | number | undefined> = {};
  if (statusFilter) filters.status = statusFilter;

  const table = useServerTable<Customer>({
    endpoint: '/customers/dt',
    filters,
    columns: SERVER_COLUMNS,
    defaultLength: 50,
  });

  useEffect(() => {
    if (searchInput === table.search) return; // tránh gọi /dt lần 2 khi mới mở trang
    table.setSearch(searchInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  /* ── Panel state ──────────────────────────────────────────────── */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Editing
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<CustomerEditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/customers/${id}`);
      setDetail(res.data.data);
    } catch { setDetail(null); }
    setDetailLoading(false);
  }, []);

  const handleRowClick = useCallback((row: Customer) => {
    if (selectedId === row.id) return;
    setSelectedId(row.id);
    setIsEditing(false);
    loadDetail(row.id);
  }, [selectedId, loadDetail]);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setIsEditing(false);
  }, []);

  /* ── Delete ──────────────────────────────────────────────────── */
  const handleDelete = useCallback(async () => {
    if (!detail || !confirm('Xóa khách hàng này?')) return;
    try {
      await api.delete(`/customers/${detail.id}`);
      handleClose();
      table.reload();
    } catch (err: unknown) {
      alert(errorMessage(err, 'Lỗi xóa'));
    }
  }, [detail, handleClose, table]);

  /* ── Edit ─────────────────────────────────────────────────────── */
  const handleToggleEdit = useCallback(() => {
    if (!isEditing && detail) {
      setEditForm({
        name: detail.name || '',
        shortName: detail.shortName || '',
        taxCode: detail.taxCode || '',
        phone: detail.phone || '',
        email: detail.email || '',
        address: detail.address || '',
        contactPerson: detail.contactPerson || '',
        status: detail.status || 'ACTIVE',
        notes: detail.notes || '',
        version: detail.version,
      });
    }
    setIsEditing((prev) => !prev);
  }, [isEditing, detail]);

  const handleSave = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await api.put(`/customers/${detail.id}`, editForm);
      setIsEditing(false);
      loadDetail(detail.id);
      table.reload();
    } catch (err: unknown) {
      alert(errorMessage(err, 'Lỗi lưu'));
    }
    setSaving(false);
  }, [detail, editForm, loadDetail, table]);

  /* ── Stats filter shortcut ────────────────────────────────────── */
  const handleStatusStatClick = (status: string) => {
    setStatusFilter(status === statusFilter ? '' : status);
  };

  /* ── Resizable panel ──────────────────────────────────────────── */
  const PANEL_MIN = 400;
  const PANEL_MAX = 800;
  const PANEL_DEFAULT = 480;
  const PANEL_STORAGE_KEY = 'panel-width-customers';

  const readStoredWidth = useCallback(() => {
    try {
      const raw = localStorage.getItem(PANEL_STORAGE_KEY);
      if (!raw) return PANEL_DEFAULT;
      const n = Number(raw);
      if (Number.isFinite(n) && n >= PANEL_MIN && n <= PANEL_MAX) return n;
    } catch { /* ignore */ }
    return PANEL_DEFAULT;
  }, []);

  const [panelWidth, setPanelWidth] = useState(readStoredWidth);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, width: 0 });

  const handleDragStart = useCallback((clientX: number) => {
    isDragging.current = true;
    dragStart.current = { x: clientX, width: panelWidth };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [panelWidth]);

  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isDragging.current) return;
      requestAnimationFrame(() => {
        const deltaX = dragStart.current.x - clientX;
        const newWidth = Math.min(PANEL_MAX, Math.max(PANEL_MIN, dragStart.current.width + deltaX));
        setPanelWidth(newWidth);
      });
    };
    const handleEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      try { localStorage.setItem(PANEL_STORAGE_KEY, String(panelWidth)); } catch { /* ignore */ }
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => { if (e.touches[0]) handleMove(e.touches[0].clientX); };
    const onTouchEnd = () => handleEnd();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [panelWidth]);

  /* ── Render ──────────────────────────────────────────────────── */
  const panelOpen = selectedId !== null;
  const showEmpty = !table.loading && !table.error && table.data.length === 0;
  const showInitialLoading = table.loading && table.data.length === 0;

  const panelProps = {
    isOpen: panelOpen,
    onClose: handleClose,
    title: detail?.name || 'Đang tải…',
    subtitle: detail ? detail.code : undefined,
    titleAddon: detail ? <CustomerStatus status={detail.status} /> : undefined,
    canEdit, canDelete,
    isEditing, onToggleEdit: handleToggleEdit, onSave: handleSave, onDelete: handleDelete, saving,
  };

  const panelContent = (
    <PanelContent detail={detail} loading={detailLoading} isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} />
  );

  const handleSortKey = (e: KeyboardEvent<HTMLTableCellElement>, idx: number) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); table.setSort(idx); }
  };

  return (
    <div className="page page-fill">
      <PageHeader
        title="Khách hàng"
        description="Quản lý danh sách khách hàng"
        actions={canEdit && <Button variant="primary" icon={<Plus />} onClick={() => setShowCreate(true)}>Thêm mới</Button>}
      />

      <div className="flex flex-1 min-h-0 gap-4">
        {/* Table column */}
        <Card className={clsx('flex-1 min-w-0 flex flex-col', panelOpen && 'hidden lg:flex')}>
          {/* Toolbar */}
          <div className="toolbar">
            <SearchBox value={searchInput} onChange={setSearchInput} placeholder="Tìm mã KH, tên, MST, email, SĐT..." width={320} />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} aria-label="Lọc theo trạng thái">
              <option value="">Tất cả TT</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Ngừng HĐ</option>
            </FilterSelect>
            <div className="toolbar-spacer" />
            <div className="flex flex-wrap items-center gap-2" style={{ fontSize: 12, color: 'var(--muted)' }}>
              <span className="tabular-nums">
                {table.recordsFiltered.toLocaleString('vi-VN')} khách hàng
                {table.recordsTotal !== table.recordsFiltered && (
                  <span style={{ color: 'var(--faint)' }}> / {table.recordsTotal.toLocaleString('vi-VN')}</span>
                )}
              </span>
              {table.statusStats.map((s) => {
                const isActive = statusFilter === s.status;
                return (
                  <button
                    key={s.status}
                    type="button"
                    onClick={() => handleStatusStatClick(s.status)}
                    aria-pressed={isActive}
                    className="rounded-full"
                    style={isActive ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined}
                  >
                    <StatusPill status={s.status} label={`${STATUS_LABELS[s.status] ?? s.status}: ${s.count}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {table.error && (
            <div style={{ padding: '12px 16px 0' }}>
              <Alert tone="error">
                <div className="flex items-center gap-2">
                  <span className="flex-1">{table.error}</span>
                  <Button size="xs" icon={<RefreshCw />} onClick={table.reload}>Thử lại</Button>
                </div>
              </Alert>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden md:block flex-1 min-h-0 overflow-auto">
            <table className="tbl tbl-hover tbl-click">
              <thead>
                <tr>
                  {TABLE_COLUMNS.map((col) => {
                    const sortable = col.sortIndex !== undefined;
                    const isSorted = sortable && table.orderCol === col.sortIndex;
                    return (
                      <th
                        key={col.key}
                        className={clsx(sortable && 'sortable', col.className)}
                        aria-sort={isSorted ? (table.orderDir === 'asc' ? 'ascending' : 'descending') : undefined}
                        tabIndex={sortable ? 0 : undefined}
                        onClick={() => sortable && table.setSort(col.sortIndex!)}
                        onKeyDown={sortable ? (e) => handleSortKey(e, col.sortIndex!) : undefined}
                      >
                        <span className="th-inner">{col.label}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {showInitialLoading ? (
                  <tr><td colSpan={TABLE_COLUMNS.length} className="tbl-empty">
                    <span className="inline-flex items-center gap-2"><Spinner size={16} />Đang tải…</span>
                  </td></tr>
                ) : showEmpty ? (
                  <tr><td colSpan={TABLE_COLUMNS.length} style={{ padding: 0 }}>
                    <EmptyState compact title="Chưa có dữ liệu" />
                  </td></tr>
                ) : (
                  table.data.map((row, idx) => {
                    const isSelected = selectedId === row.id;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => handleRowClick(row)}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) handleRowClick(row); }}
                        className={clsx(isSelected && 'is-selected')}
                        aria-selected={isSelected || undefined}
                        style={table.loading ? { opacity: 0.6 } : undefined}
                      >
                        <td className="center tabular-nums" style={{ color: 'var(--faint)' }}>{table.start + idx + 1}</td>
                        <td><span className="code">{row.code}</span></td>
                        <td><span className="cell-title">{row.name}</span></td>
                        <td className="hidden md:table-cell">{row.taxCode || '—'}</td>
                        <td className="hidden xl:table-cell" style={{ color: 'var(--muted)', fontSize: 12.5 }} title={row.address || ''}>
                          {row.address ? (row.address.length > 40 ? row.address.slice(0, 40) + '…' : row.address) : '—'}
                        </td>
                        <td className="hidden lg:table-cell">{row.contactPerson || '—'}</td>
                        <td className="hidden md:table-cell">{row.phone || '—'}</td>
                        <td><CustomerStatus status={row.status} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden flex-1 min-h-0 overflow-auto flex flex-col gap-2" style={{ padding: 12 }}>
            {showInitialLoading ? (
              <LoadingBlock />
            ) : showEmpty ? (
              <EmptyState compact title="Chưa có dữ liệu" />
            ) : (
              table.data.map((row) => {
                const isSelected = selectedId === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => handleRowClick(row)}
                    className={clsx('w-full text-left border border-line rounded-lg p-3', isSelected ? 'bg-brand-soft' : 'bg-surface')}
                    style={isSelected ? { borderColor: 'var(--accent)' } : undefined}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="code">{row.code}</span>
                      <CustomerStatus status={row.status} />
                    </div>
                    <div className="cell-title">{row.name}</div>
                    <div className="cell-sub">{[row.phone, row.email].filter(Boolean).join(' · ') || '—'}</div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <div className="foot">
            <span className="tabular-nums">
              {table.recordsFiltered > 0
                ? `${(table.start + 1).toLocaleString('vi-VN')}–${Math.min(table.start + table.length, table.recordsFiltered).toLocaleString('vi-VN')} / ${table.recordsFiltered.toLocaleString('vi-VN')}`
                : '0 bản ghi'}
            </span>
            {table.loading && <Spinner size={14} />}
            <div className="pager">
              <button type="button" onClick={() => table.setPage(table.currentPage - 1)} disabled={table.currentPage <= 1} aria-label="Trang trước">
                <ChevronLeft />
              </button>
              <button type="button" aria-current="page">{table.currentPage}</button>
              <button type="button" onClick={() => table.setPage(table.currentPage + 1)} disabled={table.currentPage >= table.totalPages} aria-label="Trang sau">
                <ChevronRight />
              </button>
            </div>
            <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>/ {table.totalPages || 1} trang</span>
          </div>
        </Card>

        {/* Panel: inline on ≥lg, overlay on <lg */}
        {panelOpen && isLg && (
          <aside className="card flex flex-col shrink-0 relative" style={{ width: panelWidth }}>
            {/* Drag handle */}
            <div
              className="absolute inset-y-0 left-0 w-[10px] -ml-[5px] z-20 cursor-col-resize group"
              role="separator"
              aria-orientation="vertical"
              aria-label="Kéo để đổi độ rộng panel"
              onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX); }}
              onTouchStart={(e) => { if (e.touches[0]) handleDragStart(e.touches[0].clientX); }}
            >
              <div className="absolute inset-y-0 left-[3px] w-[4px] rounded-full opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity" style={{ background: 'var(--border-strong)' }} />
            </div>
            <DetailPanel {...panelProps} inlineMode>{panelContent}</DetailPanel>
          </aside>
        )}
      </div>

      {!isLg && panelOpen && <DetailPanel {...panelProps}>{panelContent}</DetailPanel>}

      {/* Create Modal */}
      {showCreate && (
        <CreateCustomerModal
          onSuccess={() => { setShowCreate(false); table.reload(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function CustomerStatus({ status }: { status: string }) {
  return <StatusPill status={status} label={STATUS_LABELS[status]} />;
}

/* ── Panel Content ─────────────────────────────────────────────────── */

function PanelContent({ detail, loading, isEditing, editForm, setEditForm }: {
  detail: Customer | null;
  loading: boolean;
  isEditing: boolean;
  editForm: CustomerEditForm | null;
  setEditForm: (v: CustomerEditForm | null) => void;
}) {
  if (loading) return <LoadingBlock />;
  if (!detail) return null;

  const set = (patch: Partial<CustomerEditForm>) => { if (editForm) setEditForm({ ...editForm, ...patch }); };
  const text = (field: 'name' | 'shortName' | 'taxCode' | 'phone' | 'email' | 'address' | 'contactPerson', type = 'text') => (
    <input className={EDIT_INPUT_CLASS} type={type} value={editForm?.[field] ?? ''} onChange={(e) => set({ [field]: e.target.value })} />
  );

  return (
    <div className="flex flex-col gap-3 p-4">
      <SubCard title="Thông tin chung">
        <div className="kv">
          <FieldRow label="Mã KH" value={detail.code} mono strong />
          {isEditing ? (
            <>
              <EditFieldRow label="Tên KH">{text('name')}</EditFieldRow>
              <EditFieldRow label="Tên viết tắt">{text('shortName')}</EditFieldRow>
              <EditFieldRow label="MST">{text('taxCode')}</EditFieldRow>
              <EditFieldRow label="Email">{text('email', 'email')}</EditFieldRow>
              <EditFieldRow label="SĐT">{text('phone')}</EditFieldRow>
            </>
          ) : (
            <>
              <FieldRow label="Tên KH" value={detail.name} />
              <FieldRow label="Tên viết tắt" value={detail.shortName} />
              <FieldRow label="MST" value={detail.taxCode} />
              <FieldRow label="Email" value={detail.email} />
              <FieldRow label="SĐT" value={detail.phone} />
            </>
          )}
        </div>
      </SubCard>

      <SubCard title="Địa chỉ & Liên hệ">
        <div className="kv">
          {isEditing ? (
            <>
              <EditFieldRow label="Địa chỉ" full>{text('address')}</EditFieldRow>
              <EditFieldRow label="Người liên hệ">{text('contactPerson')}</EditFieldRow>
              <EditFieldRow label="Trạng thái">
                <select className={EDIT_SELECT_CLASS} value={editForm?.status ?? ''} onChange={(e) => set({ status: e.target.value })}>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Ngừng HĐ</option>
                </select>
              </EditFieldRow>
              <EditFieldRow label="Ghi chú" full>
                <textarea className={EDIT_TEXTAREA_CLASS} rows={3} value={editForm?.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
              </EditFieldRow>
            </>
          ) : (
            <>
              <FieldRow label="Địa chỉ" value={detail.address} full />
              <FieldRow label="Người liên hệ" value={detail.contactPerson} />
              <FieldRow label="Trạng thái" value={<CustomerStatus status={detail.status} />} />
              <FieldRow label="Ghi chú" value={detail.notes} full />
            </>
          )}
        </div>
      </SubCard>
    </div>
  );
}

/* ── Create Modal ──────────────────────────────────────────────────── */

function CreateCustomerModal({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ code: '', name: '', shortName: '', taxCode: '', email: '', phone: '', address: '', contactPerson: '' });
  const [loading, setLoading] = useState(false);
  const [loadingCode, setLoadingCode] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/customers/next-code');
        setForm((prev) => ({ ...prev, code: res.data.data || '' }));
      } catch { /* ignore */ }
      setLoadingCode(false);
    })();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Tên khách hàng là bắt buộc'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/customers', form);
      onSuccess();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Lỗi tạo khách hàng'));
    }
    setLoading(false);
  };

  return (
    <ModalOverlay
      onClose={onCancel}
      title="Thêm khách hàng"
      size="lg"
      footer={
        <>
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="submit" form={CREATE_FORM_ID} variant="primary" loading={loading} disabled={loadingCode}>Tạo khách hàng</Button>
        </>
      }
    >
      <form id={CREATE_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <FormGrid>
          <Field label="Mã khách hàng" hint="Mã tự động tạo" full>
            <Input mono value={loadingCode ? 'Đang tạo mã...' : form.code} readOnly />
          </Field>
          <Field label="Tên khách hàng" required full>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Công ty TNHH ABC" />
          </Field>
          <Field label="Tên viết tắt">
            <Input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="VD: ABC" />
          </Field>
          <Field label="MST">
            <Input value={form.taxCode} onChange={(e) => setForm({ ...form, taxCode: e.target.value })} placeholder="VD: 0123456789" />
          </Field>
          <Field label="SĐT">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="VD: 0901234567" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="VD: info@abc.vn" />
          </Field>
          <Field label="Địa chỉ" full>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="VD: 123 Nguyễn Huệ, Q.1, TP.HCM" />
          </Field>
          <Field label="Người liên hệ" full>
            <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="VD: Nguyễn Văn A" />
          </Field>
        </FormGrid>
      </form>
    </ModalOverlay>
  );
}
