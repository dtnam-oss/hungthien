import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../shared/auth-context';
import { ServerDataTable } from '../../shared/components/ServerDataTable';
import type { ServerDataColumn, ServerDataTableApi } from '../../shared/components/ServerDataTable';
import { SearchableMultiSelect } from '../../shared/components/SearchableMultiSelect';
import { DetailPanel } from '../../shared/components/DetailPanel';
import { ModalOverlay } from '../../shared/components/ModalOverlay';
import { FieldRow, EditFieldRow, EDIT_INPUT_CLASS, EDIT_TEXTAREA_CLASS } from '../../shared/components/FieldRow';
import {
  Alert, Button, Field, FormGrid, Input, LoadingBlock, PageHeader, StatusPill, SubCard,
} from '../../shared/ui';
import { errorMessage } from '../../shared/format';
import api from '../../shared/api';
import { Plus } from 'lucide-react';

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
   (customer-dt.service.ts: code, name, taxCode, email, phone, status) ─── */

const COLUMNS: ServerDataColumn<Customer>[] = [
  { key: 'code', label: 'Mã KH', sortIndex: 0, className: 'whitespace-nowrap',
    render: (row) => <span className="code whitespace-nowrap">{row.code}</span> },
  { key: 'name', label: 'Tên khách hàng', sortIndex: 1, className: 'whitespace-nowrap',
    render: (row) => <span className="cell-title block truncate" style={{ maxWidth: 240 }} title={row.name}>{row.name}</span> },
  { key: 'taxCode', label: 'MST', sortIndex: 2, className: 'whitespace-nowrap', hideBelow: 'md',
    render: (row) => row.taxCode || '—' },
  { key: 'address', label: 'Địa chỉ', className: 'hidden 2xl:table-cell',
    render: (row) => <span className="truncate block" style={{ color: 'var(--muted)', maxWidth: 260 }} title={row.address || ''}>{row.address || '—'}</span> },
  { key: 'contactPerson', label: 'Người LH', className: 'whitespace-nowrap', hideBelow: 'lg',
    render: (row) => row.contactPerson || '—' },
  { key: 'phone', label: 'SĐT', sortIndex: 4, className: 'whitespace-nowrap', hideBelow: 'md',
    render: (row) => row.phone || '—' },
  { key: 'status', label: 'Trạng thái', sortIndex: 5, className: 'whitespace-nowrap',
    render: (row) => <CustomerStatus status={row.status} /> },
];

const RAIL_STATUSES = ['ACTIVE', 'INACTIVE'];

const STATUS_SELECT_OPTIONS = [{ value: 'ACTIVE', label: 'Hoạt động' }, { value: 'INACTIVE', label: 'Ngừng HĐ' }];
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

  /* ── Filters: rail trạng thái ─────────────────────────────────── */
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const filters = useMemo(() => ({ status: statusFilter }), [statusFilter]);
  const tableRef = useRef<ServerDataTableApi>(null);
  const reload = useCallback(() => tableRef.current?.reload(), []);

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
      reload();
    } catch (err: unknown) {
      alert(errorMessage(err, 'Lỗi xóa'));
    }
  }, [detail, handleClose, reload]);

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
      reload();
    } catch (err: unknown) {
      alert(errorMessage(err, 'Lỗi lưu'));
    }
    setSaving(false);
  }, [detail, editForm, loadDetail, reload]);

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

  return (
    <div className="page page-fill">
      <PageHeader title="Khách hàng" description="Quản lý danh sách khách hàng" />

      <ServerDataTable<Customer>
        endpoint="/customers/dt"
        columns={COLUMNS}
        filters={filters}
        searchPlaceholder="Tìm mã KH, tên, MST, email, SĐT..."
        emptyTitle="Chưa có khách hàng"
        density="dense"
        defaultLength={50}
        apiRef={tableRef}
        rail={{ statuses: RAIL_STATUSES, value: statusFilter, onChange: setStatusFilter, labels: STATUS_LABELS }}
        actions={canEdit && <Button variant="primary" icon={<Plus />} onClick={() => setShowCreate(true)}>Thêm mới</Button>}
        selectedKey={selectedId}
        onRowClick={handleRowClick}
        aside={panelOpen && isLg ? (
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
        ) : undefined}
      />

      {!isLg && panelOpen && <DetailPanel {...panelProps}>{panelContent}</DetailPanel>}

      {/* Create Modal */}
      {showCreate && (
        <CreateCustomerModal
          onSuccess={() => { setShowCreate(false); reload(); }}
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
                <SearchableMultiSelect mode="single" size="sm" allowClear={false} options={STATUS_SELECT_OPTIONS} value={editForm?.status ?? ''} onChange={(v) => set({ status: String(v) })} />
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
