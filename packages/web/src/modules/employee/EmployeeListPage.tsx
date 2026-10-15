import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ServerDataTable } from '../../shared/components/ServerDataTable';
import type { ServerDataColumn, ServerDataTableApi } from '../../shared/components/ServerDataTable';
import { SearchableMultiSelect } from '../../shared/components/SearchableMultiSelect';
import { DetailPanel } from '../../shared/components/DetailPanel';
import { ModalOverlay } from '../../shared/components/ModalOverlay';
import { FieldRow, EditFieldRow, EDIT_INPUT_CLASS, EDIT_SELECT_CLASS } from '../../shared/components/FieldRow';
import { Alert, Button, Checkbox, Field, FormGrid, Input, LoadingBlock, PageHeader, Pill, Select, StatusPill, SubCard } from '../../shared/ui';
import { errorMessage } from '../../shared/format';
import { useAuth } from '../../shared/auth-context';
import api from '../../shared/api';
import { Plus } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */

interface Employee {
  id: number;
  code: string;
  fullName: string;
  phone: string | null;
  position: string | null;
  department: string | null;
  isDriver: boolean;
  status: string;
  joinDate: string | null;
  version: number;
}

interface EmployeeEditForm {
  fullName: string;
  phone: string;
  position: string;
  department: string;
  joinDate: string;
  status: string;
  isDriver: boolean;
  version: number;
}

type SetEditForm = (fn: (prev: EmployeeEditForm | null) => EmployeeEditForm | null) => void;

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Đang làm', INACTIVE: 'Nghỉ việc', SUSPENDED: 'Tạm ngưng' };

const RAIL_STATUSES = ['ACTIVE', 'SUSPENDED', 'INACTIVE'];
const DRIVER_OPTIONS = [{ value: 'true', label: 'Tài xế' }, { value: 'false', label: 'Không phải TX' }];

function EmployeeStatus({ status }: { status: string }) {
  return <StatusPill status={status} label={STATUS_LABELS[status]} />;
}

const COLUMNS: ServerDataColumn<Employee>[] = [
  { key: 'code', label: 'Mã NV', sortIndex: 0, width: 110, className: 'whitespace-nowrap', render: (row) => <span className="code">{row.code}</span> },
  { key: 'fullName', label: 'Họ tên', sortIndex: 1, className: 'whitespace-nowrap', render: (row) => <span className="cell-title">{row.fullName}</span> },
  { key: 'phone', label: 'Số ĐT', sortIndex: 2, hideBelow: 'md', className: 'whitespace-nowrap' },
  { key: 'position', label: 'Chức danh', sortIndex: 3, hideBelow: 'lg' },
  { key: 'department', label: 'Phòng ban', sortIndex: 4, hideBelow: 'lg' },
  { key: 'isDriver', label: 'TX', align: 'center', width: 64, render: (row) => row.isDriver ? <Pill tone="info" size="sm">TX</Pill> : null },
  { key: 'status', label: 'Trạng thái', sortIndex: 5, width: 120, render: (row) => <EmployeeStatus status={row.status} /> },
];

/* ── Main ──────────────────────────────────────────────────────────── */

export function EmployeeListPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('employee', 'canEdit');
  const canDelete = hasPermission('employee', 'canDelete');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [driverFilter, setDriverFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const tableRef = useRef<ServerDataTableApi>(null);

  // Phòng ban là chuỗi tự do: lấy danh sách giá trị đang có để lọc
  const [departments, setDepartments] = useState<string[]>([]);
  const loadDepartments = useCallback(() => {
    api.get('/employees/dt', { params: { length: 500 } })
      .then((r) => {
        const set = new Set<string>();
        for (const row of r.data.data as Employee[]) if (row.department?.trim()) set.add(row.department.trim());
        setDepartments([...set].sort((a, b) => a.localeCompare(b, 'vi')));
      })
      .catch(() => {});
  }, []);
  useEffect(() => { loadDepartments(); }, [loadDepartments]);
  const reload = useCallback(() => { tableRef.current?.reload(); loadDepartments(); }, [loadDepartments]);

  // Detail panel
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Employee | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Editing
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EmployeeEditForm | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal
  const [showCreate, setShowCreate] = useState(false);

  // Responsive
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsLg(e.matches);
    handler(mq);
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  const panelOpen = selectedId !== null;

  /* ── Load detail ─────────────────────────────────────────────────── */
  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/employees/${id}`);
      setDetail(res.data.data);
    } catch { setDetail(null); }
    setDetailLoading(false);
  }, []);

  const handleRowClick = useCallback((row: Employee) => {
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

  /* ── Delete ──────────────────────────────────────────────────────── */
  const handleDelete = useCallback(async () => {
    if (!detail || !confirm('Ngừng hoạt động nhân viên này? (bản ghi được chuyển sang INACTIVE)')) return;
    try {
      await api.delete(`/employees/${detail.id}`);
      handleClose();
      reload();
    } catch { alert('Lỗi xóa nhân viên'); }
  }, [detail, handleClose, reload]);

  /* ── Edit ─────────────────────────────────────────────────────────── */
  const handleToggleEdit = useCallback(() => {
    if (!isEditing && detail) {
      setEditForm({
        fullName: detail.fullName || '',
        phone: detail.phone || '',
        position: detail.position || '',
        department: detail.department || '',
        joinDate: detail.joinDate ? detail.joinDate.split('T')[0] : '',
        status: detail.status || 'ACTIVE',
        isDriver: detail.isDriver || false,
        version: detail.version,
      });
    }
    setIsEditing((prev) => !prev);
  }, [isEditing, detail]);

  const handleSave = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await api.put(`/employees/${detail.id}`, editForm);
      setIsEditing(false);
      loadDetail(detail.id);
      reload();
    } catch (err: unknown) {
      alert(errorMessage(err, 'Lỗi lưu'));
    }
    setSaving(false);
  }, [detail, editForm, loadDetail, reload]);

  /* ── Columns ─────────────────────────────────────────────────────── */
  const filters = useMemo(() => ({
    status: statusFilter,
    isDriver: driverFilter,
    department: departmentFilter,
  }), [statusFilter, driverFilter, departmentFilter]);
  const departmentOptions = useMemo(() => departments.map((d) => ({ value: d, label: d })), [departments]);

  const panelProps = {
    isOpen: panelOpen,
    onClose: handleClose,
    title: detail?.fullName || 'Đang tải…',
    subtitle: detail ? `${detail.code} — ${detail.position || 'Chưa có chức danh'}` : undefined,
    titleAddon: detail ? <EmployeeStatus status={detail.status} /> : undefined,
    canEdit, canDelete,
    isEditing, onToggleEdit: handleToggleEdit, onSave: handleSave, onDelete: handleDelete, saving,
  };

  const panelContent = (
    <EmpPanelContent detail={detail} loading={detailLoading} isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} />
  );

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="page page-fill">
      <PageHeader
        title="Nhân viên"
        description="Quản lý danh sách nhân viên"
      />

      <ServerDataTable<Employee>
        endpoint="/employees/dt"
        apiRef={tableRef}
        columns={COLUMNS}
        filters={filters}
        density="dense"
        searchPlaceholder="Tìm theo mã, tên, SĐT..."
        emptyTitle="Chưa có nhân viên"
        rail={{ statuses: RAIL_STATUSES, value: statusFilter, onChange: setStatusFilter, labels: STATUS_LABELS }}
        toolbar={
          <>
            <SearchableMultiSelect mode="multi" size="sm" value={driverFilter} onChange={setDriverFilter} options={DRIVER_OPTIONS} placeholder="Tài xế" aria-label="Lọc tài xế" />
            <SearchableMultiSelect mode="multi" size="sm" value={departmentFilter} onChange={setDepartmentFilter} options={departmentOptions} placeholder="Phòng ban" aria-label="Lọc theo phòng ban" />
          </>
        }
        actions={canEdit && <Button variant="primary" size="sm" icon={<Plus />} onClick={() => setShowCreate(true)}>Thêm nhân viên</Button>}
        selectedKey={selectedId}
        onRowClick={handleRowClick}
        aside={panelOpen && isLg ? (
          <aside className="card flex flex-col shrink-0" style={{ width: 480 }}>
            <DetailPanel {...panelProps} inlineMode>{panelContent}</DetailPanel>
          </aside>
        ) : undefined}
      />

      {/* Mobile panel */}
      {panelOpen && !isLg && <DetailPanel {...panelProps}>{panelContent}</DetailPanel>}

      {/* Create modal */}
      {showCreate && (
        <CreateEmployeeModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); reload(); }}
        />
      )}
    </div>
  );
}

/* ── Panel Content ─────────────────────────────────────────────────── */

function EmpPanelContent({ detail, loading, isEditing, editForm, setEditForm }: {
  detail: Employee | null; loading: boolean; isEditing: boolean; editForm: EmployeeEditForm | null; setEditForm: SetEditForm;
}) {
  if (loading || !detail) return <LoadingBlock />;

  const inp = (field: 'fullName' | 'phone' | 'position' | 'department' | 'joinDate', type = 'text', placeholder = '') => (
    <input type={type} value={editForm?.[field] ?? ''} onChange={(e) => setEditForm((prev) => (prev ? { ...prev, [field]: e.target.value } : prev))} placeholder={placeholder} className={EDIT_INPUT_CLASS} />
  );

  return (
    <div className="flex flex-col gap-3 p-4">
      <SubCard title="Thông tin cá nhân">
        <div className="kv">
          <FieldRow label="Mã NV" value={detail.code} mono strong />
          {isEditing ? <EditFieldRow label="Họ tên">{inp('fullName', 'text', 'Nguyễn Văn A')}</EditFieldRow>
            : <FieldRow label="Họ tên" value={detail.fullName} />}
          {isEditing ? <EditFieldRow label="Số ĐT">{inp('phone', 'text', '0901234567')}</EditFieldRow>
            : <FieldRow label="Số ĐT" value={detail.phone} />}
          {isEditing ? <EditFieldRow label="Chức danh">{inp('position', 'text', 'Tài xế')}</EditFieldRow>
            : <FieldRow label="Chức danh" value={detail.position} />}
          {isEditing ? <EditFieldRow label="Phòng ban">{inp('department', 'text', 'Đội xe')}</EditFieldRow>
            : <FieldRow label="Phòng ban" value={detail.department} />}
          {isEditing ? <EditFieldRow label="Ngày vào làm">{inp('joinDate', 'date')}</EditFieldRow>
            : <FieldRow label="Ngày vào làm" value={detail.joinDate ? detail.joinDate.split('T')[0] : '—'} />}
        </div>
      </SubCard>

      <SubCard title="Trạng thái">
        <div className="kv">
          {isEditing ? (
            <EditFieldRow label="Trạng thái">
              <select value={editForm?.status || ''} onChange={(e) => setEditForm((prev) => (prev ? { ...prev, status: e.target.value } : prev))} className={EDIT_SELECT_CLASS}>
                <option value="ACTIVE">Đang làm</option>
                <option value="INACTIVE">Nghỉ việc</option>
                <option value="SUSPENDED">Tạm ngưng</option>
              </select>
            </EditFieldRow>
          ) : (
            <FieldRow label="Trạng thái" value={<EmployeeStatus status={detail.status} />} />
          )}
          {isEditing ? (
            <EditFieldRow label="Tài xế">
              <Checkbox label="Là tài xế" checked={editForm?.isDriver || false} onChange={(e) => setEditForm((prev) => (prev ? { ...prev, isDriver: e.target.checked } : prev))} />
            </EditFieldRow>
          ) : (
            <FieldRow label="Tài xế" value={detail.isDriver ? <Pill tone="info">Tài xế</Pill> : 'Không'} />
          )}
        </div>
      </SubCard>
    </div>
  );
}

/* ── Create Modal ──────────────────────────────────────────────────── */

function CreateEmployeeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ code: '', fullName: '', phone: '', position: '', department: '', isDriver: false, status: 'ACTIVE', joinDate: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!form.code || !form.fullName) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/employees', form);
      onCreated();
    } catch (err: unknown) {
      setError(errorMessage(err));
    }
    setSaving(false);
  }, [form, onCreated]);

  const upd = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <ModalOverlay
      onClose={onClose}
      title="Thêm nhân viên mới"
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!form.code || !form.fullName}>
            {saving ? 'Đang lưu…' : 'Tạo nhân viên'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <FormGrid>
          <Field label="Mã nhân viên" required>
            <Input value={form.code} onChange={(e) => upd('code', e.target.value)} placeholder="VD: NV003" />
          </Field>
          <Field label="Họ tên" required>
            <Input value={form.fullName} onChange={(e) => upd('fullName', e.target.value)} placeholder="Nguyễn Văn A" />
          </Field>
          <Field label="Số điện thoại">
            <Input value={form.phone} onChange={(e) => upd('phone', e.target.value)} placeholder="0901234567" />
          </Field>
          <Field label="Chức danh">
            <Input value={form.position} onChange={(e) => upd('position', e.target.value)} placeholder="Tài xế" />
          </Field>
          <Field label="Phòng ban">
            <Input value={form.department} onChange={(e) => upd('department', e.target.value)} placeholder="Đội xe" />
          </Field>
          <Field label="Ngày vào làm">
            <Input type="date" value={form.joinDate} onChange={(e) => upd('joinDate', e.target.value)} />
          </Field>
          <Field label="Trạng thái">
            <Select value={form.status} onChange={(e) => upd('status', e.target.value)}>
              <option value="ACTIVE">Đang làm</option>
              <option value="INACTIVE">Nghỉ việc</option>
              <option value="SUSPENDED">Tạm ngưng</option>
            </Select>
          </Field>
          <Field className="justify-end">
            <Checkbox label="Là tài xế" checked={form.isDriver} onChange={(e) => upd('isDriver', e.target.checked)} />
          </Field>
        </FormGrid>
      </div>
    </ModalOverlay>
  );
}
