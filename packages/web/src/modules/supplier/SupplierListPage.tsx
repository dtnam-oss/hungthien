import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Plus, Building2, MapPin, CreditCard, FileText, Truck } from 'lucide-react';
import api from '../../shared/api';
import { useAuth } from '../../shared/auth-context';
import { ServerDataTable } from '../../shared/components/ServerDataTable';
import type { ServerDataColumn, ServerDataTableApi } from '../../shared/components/ServerDataTable';
import { SearchableMultiSelect } from '../../shared/components/SearchableMultiSelect';
import { DetailPanel } from '../../shared/components/DetailPanel';
import { ModalOverlay } from '../../shared/components/ModalOverlay';
import { FieldRow, EditFieldRow, EDIT_INPUT_CLASS, EDIT_TEXTAREA_CLASS } from '../../shared/components/FieldRow';
import {
  PageHeader, SubCard, Button, StatusPill, Pill,
  Alert, LoadingBlock, Field, FormGrid, Input, Textarea,
} from '../../shared/ui';
import { errorMessage } from '../../shared/format';

type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

interface Supplier {
  id: number;
  code: string;
  name: string;
  shortName: string | null;
  taxCode: string | null;
  maxVehicles: number | null;
  status: SupplierStatus;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  address: string | null;
  bankAccount: string | null;
  bankName: string | null;
  notes: string | null;
  vehicleCount: number;
  version: number;
}

type TextKey = 'name' | 'shortName' | 'taxCode' | 'phone' | 'email' | 'contactPerson' | 'contactPhone' | 'address' | 'bankAccount' | 'bankName';

const STATUS_OPTIONS: { value: SupplierStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngưng HĐ' },
  { value: 'SUSPENDED', label: 'Tạm ngưng' },
];

const STATUS_LABELS: Record<SupplierStatus, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngưng HĐ',
  SUSPENDED: 'Tạm ngưng',
};

interface ApiResult { success: boolean; error?: string }

/** Hiển thị FieldRow hoặc EditFieldRow (input) tùy chế độ sửa */
function TextRow({ label, isEditing, value, editValue, onChange, type = 'text', full }: {
  label: string;
  isEditing: boolean;
  value: ReactNode;
  editValue: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'number';
  full?: boolean;
}) {
  if (!isEditing) return <FieldRow label={label} value={value} full={full} />;
  return (
    <EditFieldRow label={label} full={full}>
      <input className={EDIT_INPUT_CLASS} type={type} value={editValue} onChange={(e) => onChange(e.target.value)} />
    </EditFieldRow>
  );
}

function SectionLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <span className="inline-flex items-center gap-2">{icon}{children}</span>;
}

const RAIL_STATUSES = ['ACTIVE', 'SUSPENDED', 'INACTIVE'];

const COLUMNS: ServerDataColumn<Supplier>[] = [
  { key: 'code', label: 'Mã NCC', sortIndex: 0, width: 110, className: 'whitespace-nowrap', render: (row) => <span className="code">{row.code}</span> },
  {
    key: 'name', label: 'Tên nhà cung cấp', sortIndex: 1,
    render: (row) => (
      <>
        <span className="cell-title">{row.name}</span>
        {row.shortName && <span className="cell-sub" style={{ marginLeft: 8 }}>{row.shortName}</span>}
      </>
    ),
  },
  { key: 'taxCode', label: 'MST', sortIndex: 2, width: 130, hideBelow: 'md', className: 'whitespace-nowrap', render: (row) => <span className="code">{row.taxCode || '—'}</span> },
  { key: 'phone', label: 'SĐT', sortIndex: 3, hideBelow: 'md', className: 'whitespace-nowrap', render: (row) => row.phone || '—' },
  { key: 'contactPerson', label: 'Liên hệ', hideBelow: 'lg', render: (row) => row.contactPerson || '—' },
  {
    key: 'vehicleCount', label: 'Số xe', width: 96, hideBelow: 'md',
    render: (row) => {
      const count = row.vehicleCount ?? 0;
      const over = row.maxVehicles !== null && row.maxVehicles !== undefined && count > row.maxVehicles;
      return (
        <Pill tone={over ? 'danger' : 'neutral'} size="sm">
          <Truck style={{ width: 12, height: 12 }} />{count}/{row.maxVehicles ?? '∞'}
        </Pill>
      );
    },
  },
  { key: 'status', label: 'Trạng thái', sortIndex: 4, width: 120, render: (row) => <StatusPill status={row.status} label={STATUS_LABELS[row.status]} /> },
];

export function SupplierListPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('supplier', 'canEdit');
  const canEdit = hasPermission('supplier', 'canEdit');
  const canDelete = hasPermission('supplier', 'canDelete');

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const tableRef = useRef<ServerDataTableApi>(null);
  // Tăng khi dữ liệu NCC đổi để panel chi tiết tải lại
  const [detailVersion, setDetailVersion] = useState(0);

  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsLg(e.matches);
    handler(mq);
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Supplier | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Supplier>>({});
  const [saving, setSaving] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<Supplier>>({ status: 'ACTIVE' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const reloadTable = useCallback(() => { tableRef.current?.reload(); setDetailVersion((k) => k + 1); }, []);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      setIsEditing(false);
      return;
    }
    let isCancelled = false;
    setLoadingDetail(true);
    api.get<ApiResult & { data: Supplier }>(`/suppliers/${selectedId}`)
      .then((res) => {
        if (!isCancelled && res.data.success) {
          setDetail(res.data.data);
          setIsEditing(false);
        }
      })
      .catch(() => { if (!isCancelled) setDetail(null); })
      .finally(() => {
        if (!isCancelled) setLoadingDetail(false);
      });
    return () => { isCancelled = true; };
  }, [selectedId, detailVersion]);

  const handleToggleEdit = () => {
    if (isEditing) {
      setIsEditing(false);
    } else if (detail) {
      setEditForm({ ...detail });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await api.put<ApiResult>(`/suppliers/${detail.id}`, editForm);
      if (res.data.success) {
        setIsEditing(false);
        reloadTable();
      } else {
        alert(res.data.error || 'Lỗi khi lưu');
      }
    } catch (err) {
      alert(errorMessage(err, 'Lỗi mạng'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    if (!confirm(`Bạn có chắc muốn xóa nhà cung cấp ${detail.code}?`)) return;
    setSaving(true);
    try {
      const res = await api.delete<ApiResult>(`/suppliers/${detail.id}`);
      if (res.data.success) {
        setSelectedId(null);
        reloadTable();
      } else {
        alert(res.data.error || 'Lỗi khi xóa');
      }
    } catch (err) {
      alert(errorMessage(err, 'Lỗi mạng'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const res = await api.post<ApiResult>('/suppliers', createForm);
      if (res.data.success) {
        setShowCreateModal(false);
        setCreateForm({ status: 'ACTIVE' });
        reloadTable();
      } else {
        setCreateError(res.data.error || 'Lỗi khi tạo');
      }
    } catch (err) {
      setCreateError(errorMessage(err, 'Lỗi mạng'));
    } finally {
      setCreating(false);
    }
  };

  const renderPanel = (inline: boolean) => (
    <DetailPanel
      isOpen
      onClose={() => setSelectedId(null)}
      title="Chi tiết nhà cung cấp"
      subtitle={detail?.code}
      titleAddon={detail && <StatusPill status={detail.status} label={STATUS_LABELS[detail.status]} />}
      canEdit={canEdit}
      canDelete={canDelete}
      isEditing={isEditing}
      onToggleEdit={handleToggleEdit}
      onSave={handleSaveEdit}
      onDelete={handleDelete}
      saving={saving}
      inlineMode={inline}
    >
      {loadingDetail ? (
        <LoadingBlock />
      ) : !detail ? (
        <Alert tone="warn">Không tìm thấy thông tin</Alert>
      ) : (
        <div className="flex flex-col gap-3">
          <SubCard title={<SectionLabel icon={<Building2 size={14} />}>Thông tin cơ bản</SectionLabel>}>
            <div className="kv">
              <FieldRow label="Mã NCC" value={<span className="code">{detail.code}</span>} />
              <TextRow label="Tên NCC" isEditing={isEditing} value={detail.name} editValue={editForm.name ?? ''} onChange={(v) => setEditForm({ ...editForm, name: v })} />
              <TextRow label="Tên viết tắt" isEditing={isEditing} value={detail.shortName} editValue={editForm.shortName ?? ''} onChange={(v) => setEditForm({ ...editForm, shortName: v })} />
              <TextRow label="Mã số thuế" isEditing={isEditing} value={detail.taxCode} editValue={editForm.taxCode ?? ''} onChange={(v) => setEditForm({ ...editForm, taxCode: v })} />
              <TextRow
                label="Số xe tối đa"
                type="number"
                isEditing={isEditing}
                value={detail.maxVehicles?.toString()}
                editValue={editForm.maxVehicles?.toString() ?? ''}
                onChange={(v) => setEditForm({ ...editForm, maxVehicles: v ? parseInt(v, 10) : null })}
              />
              {isEditing ? (
                <EditFieldRow label="Trạng thái">
                  <SearchableMultiSelect mode="single" size="sm" allowClear={false} options={STATUS_OPTIONS} value={editForm.status ?? ""} onChange={(v) => setEditForm({ ...editForm, status: v as SupplierStatus })} />
                </EditFieldRow>
              ) : (
                <FieldRow label="Trạng thái" value={<StatusPill status={detail.status} label={STATUS_LABELS[detail.status]} />} />
              )}
            </div>
          </SubCard>

          <SubCard title={<SectionLabel icon={<MapPin size={14} />}>Liên hệ</SectionLabel>}>
            <div className="kv">
              <TextRow label="Số điện thoại" isEditing={isEditing} value={detail.phone} editValue={editForm.phone ?? ''} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
              <TextRow label="Email" type="email" isEditing={isEditing} value={detail.email} editValue={editForm.email ?? ''} onChange={(v) => setEditForm({ ...editForm, email: v })} />
              <TextRow label="Người liên hệ" isEditing={isEditing} value={detail.contactPerson} editValue={editForm.contactPerson ?? ''} onChange={(v) => setEditForm({ ...editForm, contactPerson: v })} />
              <TextRow label="SĐT liên hệ" isEditing={isEditing} value={detail.contactPhone} editValue={editForm.contactPhone ?? ''} onChange={(v) => setEditForm({ ...editForm, contactPhone: v })} />
              <TextRow full label="Địa chỉ" isEditing={isEditing} value={detail.address} editValue={editForm.address ?? ''} onChange={(v) => setEditForm({ ...editForm, address: v })} />
            </div>
          </SubCard>

          <SubCard title={<SectionLabel icon={<CreditCard size={14} />}>Ngân hàng</SectionLabel>}>
            <div className="kv">
              <TextRow label="Số tài khoản" isEditing={isEditing} value={detail.bankAccount} editValue={editForm.bankAccount ?? ''} onChange={(v) => setEditForm({ ...editForm, bankAccount: v })} />
              <TextRow label="Ngân hàng" isEditing={isEditing} value={detail.bankName} editValue={editForm.bankName ?? ''} onChange={(v) => setEditForm({ ...editForm, bankName: v })} />
            </div>
          </SubCard>

          <SubCard title={<SectionLabel icon={<FileText size={14} />}>Ghi chú</SectionLabel>}>
            {isEditing ? (
              <textarea
                className={EDIT_TEXTAREA_CLASS}
                rows={3}
                value={editForm.notes ?? ''}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            ) : (
              <div className="whitespace-pre-wrap" style={{ fontSize: 13.5 }}>
                {detail.notes || <span style={{ color: 'var(--faint)' }}>Không có ghi chú</span>}
              </div>
            )}
          </SubCard>
        </div>
      )}
    </DetailPanel>
  );

  const filters = useMemo(() => ({ status: statusFilter }), [statusFilter]);
  const handleRowClick = useCallback((row: Supplier) => setSelectedId(row.id), []);

  const createText = (key: TextKey, label: string, opts: { required?: boolean; type?: 'text' | 'email'; full?: boolean } = {}) => (
    <Field label={label} required={opts.required} full={opts.full}>
      <Input
        type={opts.type ?? 'text'}
        required={opts.required}
        value={createForm[key] ?? ''}
        onChange={(e) => setCreateForm({ ...createForm, [key]: e.target.value })}
      />
    </Field>
  );

  return (
    <div className="page page-fill">
      <PageHeader
        title="Nhà cung cấp"
        description="Quản lý nhà thầu phụ, thông tin liên hệ và ngân hàng."
      />

      <ServerDataTable<Supplier>
        endpoint="/suppliers/dt"
        apiRef={tableRef}
        columns={COLUMNS}
        filters={filters}
        density="dense"
        searchPlaceholder="Tìm nhà cung cấp..."
        emptyTitle="Chưa có nhà cung cấp"
        rail={{ statuses: RAIL_STATUSES, value: statusFilter, onChange: setStatusFilter, labels: STATUS_LABELS }}
        actions={canCreate && <Button variant="primary" size="sm" icon={<Plus />} onClick={() => setShowCreateModal(true)}>Thêm mới</Button>}
        selectedKey={selectedId}
        onRowClick={handleRowClick}
        aside={selectedId !== null && isLg ? (
          <aside className="card flex flex-col shrink-0" style={{ width: 480 }}>
            {renderPanel(true)}
          </aside>
        ) : undefined}
      />

      {selectedId !== null && !isLg && renderPanel(false)}

      <ModalOverlay
        isOpen={showCreateModal}
        onClose={() => !creating && setShowCreateModal(false)}
        title="Thêm nhà cung cấp"
        size="lg"
        footer={
          <>
            <Button onClick={() => setShowCreateModal(false)} disabled={creating}>Hủy</Button>
            <Button variant="primary" type="submit" form="supplier-create-form" loading={creating}>
              {creating ? 'Đang tạo...' : 'Tạo mới'}
            </Button>
          </>
        }
      >
        <form id="supplier-create-form" onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          {createError && <Alert tone="error">{createError}</Alert>}

          <SubCard title="Thông tin cơ bản">
            <FormGrid>
              <Field label="Mã NCC" required>
                <Input type="text" required value={createForm.code ?? ''} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} />
              </Field>
              {createText('name', 'Tên NCC', { required: true })}
              {createText('shortName', 'Tên viết tắt')}
              {createText('taxCode', 'Mã số thuế')}
              <Field label="Số xe tối đa">
                <Input
                  type="number"
                  value={createForm.maxVehicles ?? ''}
                  onChange={(e) => setCreateForm({ ...createForm, maxVehicles: e.target.value ? parseInt(e.target.value, 10) : null })}
                />
              </Field>
              <Field label="Trạng thái">
                <SearchableMultiSelect mode="single" allowClear={false} options={STATUS_OPTIONS} value={createForm.status ?? ""} onChange={(v) => setCreateForm({ ...createForm, status: v as SupplierStatus })} />
              </Field>
            </FormGrid>
          </SubCard>

          <SubCard title="Liên hệ">
            <FormGrid>
              {createText('phone', 'Số điện thoại')}
              {createText('email', 'Email', { type: 'email' })}
              {createText('contactPerson', 'Người liên hệ')}
              {createText('contactPhone', 'SĐT liên hệ')}
              {createText('address', 'Địa chỉ', { full: true })}
            </FormGrid>
          </SubCard>

          <SubCard title="Ngân hàng">
            <FormGrid>
              {createText('bankAccount', 'Số tài khoản')}
              {createText('bankName', 'Ngân hàng')}
            </FormGrid>
          </SubCard>

          <SubCard title="Khác">
            <Field label="Ghi chú">
              <Textarea rows={3} value={createForm.notes ?? ''} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} />
            </Field>
          </SubCard>
        </form>
      </ModalOverlay>
    </div>
  );
}
