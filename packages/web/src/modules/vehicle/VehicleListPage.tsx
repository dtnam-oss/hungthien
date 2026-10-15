import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ServerDataTable } from '../../shared/components/ServerDataTable';
import type { ServerDataColumn, ServerDataTableApi } from '../../shared/components/ServerDataTable';
import { SearchableMultiSelect } from '../../shared/components/SearchableMultiSelect';
import { DetailPanel } from '../../shared/components/DetailPanel';
import type { DetailPanelTab } from '../../shared/components/DetailPanel';
import { ModalOverlay } from '../../shared/components/ModalOverlay';
import { FieldRow, EditFieldRow, EDIT_INPUT_CLASS, EDIT_SELECT_CLASS, EDIT_TEXTAREA_CLASS } from '../../shared/components/FieldRow';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { Alert, Button, Checkbox, Field, FormGrid, LoadingBlock, PageHeader, Pill, Plate, StatusPill, SubCard } from '../../shared/ui';
import type { PillTone } from '../../shared/ui';
import { formatDate, formatMoney, errorMessage } from '../../shared/format';
import { useAuth } from '../../shared/auth-context';
import api from '../../shared/api';
import { Plus } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */

interface Vehicle {
  id: number;
  plateNumber: string;
  type: string | null;
  brand: string | null;
  model: string | null;
  tonnage: string | null;
  ownerType: string;
  status: string;
  primaryDriver: { id: number; fullName: string; code: string } | null;
  secondaryDriver: { id: number; fullName: string; code: string } | null;
  Supplier?: { id: number; name: string; code: string } | null;
  // New fields
  chassisNumber?: string | null;
  engineNumber?: string | null;
  grossWeight?: number | null;
  curbWeight?: number | null;
  payloadCapacity?: number | null;
  registrationExpiry?: string | null;
  insuranceBodyExpiry?: string | null;
  insuranceLiabilityExpiry?: string | null;
  gpsExpiryDate?: string | null;
  inspectionBookNumber?: string | null;
}

interface VehicleFinance {
  purchasePrice?: number | string | null;
  purchaseDate?: string | null;
  depreciation?: number | string | null;
  loanAmount?: number | string | null;
  interestRate?: number | string | null;
  loanStartDate?: string | null;
  loanEndDate?: string | null;
  monthlyPayment?: number | string | null;
  insuranceFee?: number | string | null;
  roadTax?: number | string | null;
}

interface VehicleInspection {
  id: number;
  inspectionDate?: string | null;
  expiryDate?: string | null;
  result: string;
  inspectionCenter?: string | null;
  certificateNumber?: string | null;
}

interface VehicleDetail extends Vehicle {
  yearMfg: number | null;
  cubicMeters: string | null;
  fuelType: string | null;
  notes: string | null;
  version: number;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  bankName?: string | null;
  registeredCsgt?: boolean;
  registeredRegistry?: boolean;
  lastCheckedAt?: string | null;
  VehicleFinance?: VehicleFinance | null;
  VehicleInspection?: VehicleInspection[];
  compliance?: Record<string, string>;
}

interface Driver { id: number; code: string; fullName: string; }

type EditForm = Record<string, string | number | undefined>;
type SetEditForm = Dispatch<SetStateAction<EditForm>>;
interface DriverOption { value: string; label: string }

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Hoạt động', INACTIVE: 'Ngừng', MAINTENANCE: 'Bảo trì', DISPOSED: 'Thanh lý' };
const TYPE_OPTIONS = ['REFRIGERATED', 'ENCLOSED', 'FLATBED', 'container', 'truck', 'trailer', 'tanker'];
const TYPE_LABELS: Record<string, string> = { REFRIGERATED: 'Thùng Lạnh', ENCLOSED: 'Thùng Kín', FLATBED: 'Thùng Bạt', container: 'Container', truck: 'Tải', trailer: 'Moóc', tanker: 'Bồn' };
const FUEL_OPTIONS = ['DIESEL', 'GASOLINE', 'ELECTRIC', 'CNG'];
const OWNER_OPTIONS = [{ value: 'INTERNAL', label: 'Nội bộ' }, { value: 'EXTERNAL', label: 'Ngoài' }];

const PANEL_TABS: DetailPanelTab[] = [
  { key: 'info', label: 'Thông tin' },
  { key: 'docs', label: 'Giấy tờ' },
  { key: 'finance', label: 'Tài chính' },
  { key: 'inspections', label: 'Kiểm định' },
];

/* ── Small presentational helpers ──────────────────────────────────── */

/** Nhãn theo module (Hoạt động/Ngừng/Bảo trì/Thanh lý); màu từ STATUS_TONES */
function VehicleStatusPill({ status }: { status: string }) {
  return <StatusPill status={status} label={STATUS_LABELS[status]} />;
}

function OwnerPill({ ownerType }: { ownerType: string }) {
  return <Pill tone={ownerType === 'INTERNAL' ? 'info' : 'warn'}>{ownerType === 'INTERNAL' ? 'Nội bộ' : 'Ngoài'}</Pill>;
}

const Dash = () => <span style={{ color: 'var(--faint)' }}>—</span>;

const RAIL_STATUSES = ['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'DISPOSED'];
const TYPE_FILTER_OPTIONS = TYPE_OPTIONS.map((t) => ({ value: t, label: TYPE_LABELS[t] || t }));

const COLUMNS: ServerDataColumn<Vehicle>[] = [
  { key: 'plateNumber', label: 'Biển số', sortIndex: 0, width: 130, className: 'whitespace-nowrap', render: (row) => <Plate>{row.plateNumber}</Plate> },
  { key: 'type', label: 'Loại xe', sortIndex: 1, hideBelow: 'md', className: 'whitespace-nowrap', render: (row) => TYPE_LABELS[row.type || ''] || row.type || <Dash /> },
  { key: 'brand', label: 'Hãng', sortIndex: 2, hideBelow: 'lg', render: (row) => [row.brand, row.model].filter(Boolean).join(' ') || <Dash /> },
  { key: 'tonnage', label: 'Tải (t)', sortIndex: 3, align: 'right', width: 80, hideBelow: 'lg', render: (row) => row.tonnage ? String(row.tonnage) : <Dash /> },
  { key: 'ownerType', label: 'Sở hữu', sortIndex: 4, width: 96, render: (row) => <OwnerPill ownerType={row.ownerType} /> },
  { key: 'primaryDriver', label: 'Tài xế 1', hideBelow: 'md', className: 'whitespace-nowrap', render: (row) => row.primaryDriver ? row.primaryDriver.fullName : <Dash /> },
  { key: 'status', label: 'Trạng thái', sortIndex: 5, width: 120, render: (row) => <VehicleStatusPill status={row.status} /> },
];

function groupByBrandFn(row: Vehicle) {
  const brand = row.brand?.trim();
  return { key: brand || '__none', label: brand || 'Chưa có hãng' };
}

/* ── Main ──────────────────────────────────────────────────────────── */

export function VehicleListPage() {
  const { hasPermission, canViewColumn } = useAuth();
  const canEdit = hasPermission('vehicle', 'canEdit');
  const canDelete = hasPermission('vehicle', 'canDelete');
  const canViewFinance = canViewColumn('vehicle', 'purchasePrice');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [ownerTypeFilter, setOwnerTypeFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [driverFilter, setDriverFilter] = useState<number[]>([]);
  const [groupByBrand, setGroupByBrand] = useState(true);
  const tableRef = useRef<ServerDataTableApi>(null);
  const reload = useCallback(() => tableRef.current?.reload(), []);

  // Detail
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<VehicleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Editing
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({});
  const [saving, setSaving] = useState(false);

  // Modal
  const [showCreate, setShowCreate] = useState(false);

  // Drivers for selects
  const [drivers, setDrivers] = useState<Driver[]>([]);
  useEffect(() => { api.get('/vehicles/drivers').then((r) => setDrivers(r.data.data)).catch(() => {}); }, []);

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

  /* ── Load detail ──────────────────────────────────────────────────── */
  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/vehicles/${id}`);
      setDetail(res.data.data || res.data);
    } catch { setDetail(null); }
    setDetailLoading(false);
  }, []);

  const handleRowClick = useCallback((row: Vehicle) => {
    if (selectedId === row.id) return;
    setSelectedId(row.id);
    setActiveTab('info');
    setIsEditing(false);
    loadDetail(row.id);
  }, [selectedId, loadDetail]);

  const handleClose = useCallback(() => { setSelectedId(null); setDetail(null); setIsEditing(false); }, []);

  /* ── Delete ──────────────────────────────────────────────────────── */
  const handleDelete = useCallback(async () => {
    if (!detail || !confirm('Xóa phương tiện này?')) return;
    try {
      await api.delete(`/vehicles/${detail.id}`);
      handleClose();
      reload();
    } catch (err) { alert(errorMessage(err, 'Lỗi xóa phương tiện')); }
  }, [detail, handleClose, reload]);

  /* ── Edit ─────────────────────────────────────────────────────────── */
  const handleToggleEdit = useCallback(() => {
    if (!isEditing && detail) {
      setEditForm({
        type: detail.type || '',
        brand: detail.brand || '',
        model: detail.model || '',
        yearMfg: detail.yearMfg ? String(detail.yearMfg) : '',
        tonnage: detail.tonnage ? String(detail.tonnage) : '',
        cubicMeters: detail.cubicMeters ? String(detail.cubicMeters) : '',
        fuelType: detail.fuelType || 'DIESEL',
        ownerType: detail.ownerType || 'INTERNAL',
        primaryDriverId: detail.primaryDriver?.id ? String(detail.primaryDriver.id) : '',
        secondaryDriverId: detail.secondaryDriver?.id ? String(detail.secondaryDriver.id) : '',
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
      await api.put(`/vehicles/${detail.id}`, {
        ...editForm,
        yearMfg: editForm.yearMfg ? Number(editForm.yearMfg) : null,
        tonnage: editForm.tonnage ? Number(editForm.tonnage) : null,
        cubicMeters: editForm.cubicMeters ? Number(editForm.cubicMeters) : null,
        primaryDriverId: editForm.primaryDriverId ? Number(editForm.primaryDriverId) : null,
        secondaryDriverId: editForm.secondaryDriverId ? Number(editForm.secondaryDriverId) : null,
      });
      setIsEditing(false);
      loadDetail(detail.id);
      reload();
    } catch (err) {
      alert(errorMessage(err, 'Lỗi lưu'));
    }
    setSaving(false);
  }, [detail, editForm, loadDetail, reload]);

  /* ── Columns ─────────────────────────────────────────────────────── */
  const filters = useMemo(() => ({
    status: statusFilter,
    ownerType: ownerTypeFilter,
    vehicleType: typeFilter,
    primaryDriverId: driverFilter,
  }), [statusFilter, ownerTypeFilter, typeFilter, driverFilter]);

  const driverOptions: DriverOption[] = drivers.map((d) => ({ value: String(d.id), label: `${d.code} — ${d.fullName}` }));
  const driverFilterOptions = useMemo(() => drivers.map((d) => ({ value: d.id, label: d.fullName, sublabel: d.code })), [drivers]);

  const visibleTabs = canViewFinance ? PANEL_TABS : PANEL_TABS.filter((t) => t.key !== 'finance');

  const renderPanel = (inline: boolean) => (
    <DetailPanel
      isOpen={panelOpen} onClose={handleClose}
      title={detail ? <Plate>{detail.plateNumber}</Plate> : 'Đang tải…'}
      titleAddon={detail ? <VehicleStatusPill status={detail.status} /> : undefined}
      subtitle={detail ? [detail.type, detail.brand, detail.model].filter(Boolean).join(' — ') : undefined}
      canEdit={canEdit} canDelete={canDelete}
      isEditing={isEditing} onToggleEdit={handleToggleEdit} onSave={handleSave} onDelete={handleDelete} saving={saving}
      tabs={visibleTabs} activeTab={activeTab} onTabChange={setActiveTab}
      inlineMode={inline}>
      <VehiclePanelContent detail={detail} loading={detailLoading} activeTab={activeTab} isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} driverOptions={driverOptions} canViewFinance={canViewFinance} loadDetail={loadDetail} />
    </DetailPanel>
  );

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="page page-fill">
      <PageHeader
        title="Phương tiện"
        description="Quản lý danh sách xe"
      />

      <ServerDataTable<Vehicle>
        endpoint="/vehicles/dt"
        apiRef={tableRef}
        columns={COLUMNS}
        filters={filters}
        density="dense"
        searchPlaceholder="Tìm theo biển số, hãng xe, tài xế..."
        emptyTitle="Chưa có phương tiện"
        rail={{ statuses: RAIL_STATUSES, value: statusFilter, onChange: setStatusFilter, labels: STATUS_LABELS }}
        toolbar={
          <>
            <SearchableMultiSelect mode="multi" size="sm" value={ownerTypeFilter} onChange={setOwnerTypeFilter} options={OWNER_OPTIONS} placeholder="Sở hữu" aria-label="Lọc theo sở hữu" />
            <SearchableMultiSelect mode="multi" size="sm" value={typeFilter} onChange={setTypeFilter} options={TYPE_FILTER_OPTIONS} placeholder="Loại" aria-label="Lọc theo loại xe" />
            <SearchableMultiSelect mode="multi" size="sm" value={driverFilter} onChange={setDriverFilter} options={driverFilterOptions} placeholder="Tài xế" searchPlaceholder="Tìm tài xế..." aria-label="Lọc theo tài xế" />
            <Checkbox label="Nhóm theo hãng" checked={groupByBrand} onChange={(e) => setGroupByBrand(e.target.checked)} />
          </>
        }
        actions={canEdit && <Button variant="primary" size="sm" icon={<Plus />} onClick={() => setShowCreate(true)}>Thêm xe</Button>}
        groupBy={groupByBrand ? groupByBrandFn : undefined}
        selectedKey={selectedId}
        onRowClick={handleRowClick}
        aside={panelOpen && isLg ? (
          <aside className="card flex flex-col shrink-0" style={{ width: 480 }}>
            {renderPanel(true)}
          </aside>
        ) : undefined}
      />

      {panelOpen && !isLg && renderPanel(false)}

      {showCreate && (
        <CreateVehicleModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); reload(); }}
          driverOptions={driverOptions}
        />
      )}
    </div>
  );
}

/* ── Panel Content ─────────────────────────────────────────────────── */

function VehiclePanelContent({ detail, loading, activeTab, isEditing, editForm, setEditForm, driverOptions, canViewFinance, loadDetail }: {
  detail: VehicleDetail | null; loading: boolean; activeTab: string;
  isEditing: boolean; editForm: EditForm; setEditForm: SetEditForm;
  driverOptions: DriverOption[];
  canViewFinance: boolean;
  loadDetail: (id: number) => void;
}) {
  if (loading || !detail) return <LoadingBlock />;

  if (activeTab === 'info') return <InfoTab detail={detail} isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} driverOptions={driverOptions} />;
  if (activeTab === 'docs') return <DocsTab detail={detail} />;
  if (activeTab === 'finance' && canViewFinance) return <FinanceTab detail={detail} />;
  if (activeTab === 'inspections') return <InspectionsTab detail={detail} loadDetail={loadDetail} />;
  return null;
}

/* ── Info Tab ──────────────────────────────────────────────────────── */

function InfoTab({ detail, isEditing, editForm, setEditForm, driverOptions }: {
  detail: VehicleDetail; isEditing: boolean; editForm: EditForm; setEditForm: SetEditForm;
  driverOptions: DriverOption[];
}) {
  const set = (field: string, value: string) => setEditForm((p) => ({ ...p, [field]: value }));
  const inp = (field: string, type = 'text', placeholder = '') => (
    <input type={type} value={editForm[field] ?? ''} onChange={(e) => set(field, e.target.value)} placeholder={placeholder} className={EDIT_INPUT_CLASS} />
  );
  const driverSelect = (field: string) => (
    <SearchableSelect size="sm" options={driverOptions} value={String(editForm[field] ?? '')} onChange={(v) => set(field, String(v))} placeholder="— Không —" />
  );

  return (
    <div className="space-y-3">
      <SubCard title="Thông tin xe">
        <div className="kv">
          <FieldRow label="Biển số" value={<Plate>{detail.plateNumber}</Plate>} />
          {isEditing ? (
            <EditFieldRow label="Loại xe">
              <select value={editForm.type || ''} onChange={(e) => set('type', e.target.value)} className={EDIT_SELECT_CLASS}>
                <option value="">Chọn loại</option>
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
              </select>
            </EditFieldRow>
          ) : <FieldRow label="Loại xe" value={TYPE_LABELS[detail.type || ''] || detail.type} />}
          {isEditing ? <EditFieldRow label="Hãng">{inp('brand', 'text', 'Hyundai')}</EditFieldRow> : <FieldRow label="Hãng" value={detail.brand} />}
          {isEditing ? <EditFieldRow label="Đời">{inp('model', 'text', 'HD72')}</EditFieldRow> : <FieldRow label="Đời" value={detail.model} />}
          {isEditing ? <EditFieldRow label="Năm SX">{inp('yearMfg', 'number')}</EditFieldRow> : <FieldRow label="Năm SX" value={detail.yearMfg} />}
          {isEditing ? <EditFieldRow label="Tải trọng (T)">{inp('tonnage', 'number')}</EditFieldRow> : <FieldRow label="Tải trọng" value={detail.tonnage ? `${detail.tonnage}T` : null} />}
          {isEditing ? <EditFieldRow label="Thể tích (m³)">{inp('cubicMeters', 'number')}</EditFieldRow> : <FieldRow label="Thể tích" value={detail.cubicMeters ? `${detail.cubicMeters} m³` : null} />}
          {isEditing ? (
            <EditFieldRow label="Nhiên liệu">
              <select value={editForm.fuelType || ''} onChange={(e) => set('fuelType', e.target.value)} className={EDIT_SELECT_CLASS}>
                {FUEL_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </EditFieldRow>
          ) : <FieldRow label="Nhiên liệu" value={detail.fuelType} />}
        </div>
      </SubCard>

      <SubCard title="Sở hữu & Trạng thái">
        <div className="kv">
          {isEditing ? (
            <EditFieldRow label="Sở hữu">
              <select value={editForm.ownerType || ''} onChange={(e) => set('ownerType', e.target.value)} className={EDIT_SELECT_CLASS}>
                {OWNER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </EditFieldRow>
          ) : <FieldRow label="Sở hữu" value={<OwnerPill ownerType={detail.ownerType} />} />}
          {isEditing ? (
            <EditFieldRow label="Trạng thái">
              <select value={editForm.status || ''} onChange={(e) => set('status', e.target.value)} className={EDIT_SELECT_CLASS}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </EditFieldRow>
          ) : <FieldRow label="Trạng thái" value={<VehicleStatusPill status={detail.status} />} />}
          {detail.Supplier && <FieldRow label="Nhà cung cấp" value={detail.Supplier.name} />}
        </div>
      </SubCard>

      <SubCard title="Tài xế">
        <div className="kv">
          {isEditing
            ? <EditFieldRow label="TX chính">{driverSelect('primaryDriverId')}</EditFieldRow>
            : <FieldRow label="TX chính" value={detail.primaryDriver?.fullName} />}
          {isEditing
            ? <EditFieldRow label="TX phụ">{driverSelect('secondaryDriverId')}</EditFieldRow>
            : <FieldRow label="TX phụ" value={detail.secondaryDriver?.fullName} />}
        </div>
      </SubCard>

      <SubCard title="Thông số kỹ thuật">
        <div className="kv">
          <FieldRow label="Số khung" value={detail.chassisNumber} mono />
          <FieldRow label="Số máy" value={detail.engineNumber} mono />
          <FieldRow label="KL toàn bộ" value={detail.grossWeight ? `${detail.grossWeight.toLocaleString('vi-VN')} kg` : null} />
          <FieldRow label="KL bản thân" value={detail.curbWeight ? `${detail.curbWeight.toLocaleString('vi-VN')} kg` : null} />
          <FieldRow label="KL chuyên chở" value={detail.payloadCapacity ? `${detail.payloadCapacity.toLocaleString('vi-VN')} kg` : null} />
          <FieldRow label="Kích thước (DxRxC)" value={detail.lengthMm ? `${detail.lengthMm}×${detail.widthMm}×${detail.heightMm} mm` : null} />
        </div>
      </SubCard>

      <SubCard title="Ghi chú">
        {isEditing ? (
          <textarea value={editForm.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={3} className={EDIT_TEXTAREA_CLASS} placeholder="Ghi chú…" />
        ) : (
          <p className="whitespace-pre-wrap" style={{ fontSize: 13, color: 'var(--text-3)' }}>{detail.notes || <Dash />}</p>
        )}
      </SubCard>
    </div>
  );
}

/* ── Docs Tab (Giấy tờ & Hạn) ─────────────────────────────────────── */

function daysLeft(d: string | null | undefined): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function ExpiryPill({ date }: { date: string | null | undefined }) {
  const days = daysLeft(date);
  if (days === null) return <span style={{ color: 'var(--faint)', fontSize: 12 }}>Chưa có</span>;
  if (days < 0) return <Pill tone="danger" size="sm">Quá hạn {Math.abs(days)} ngày</Pill>;
  const tone: PillTone = days <= 30 ? 'warn' : days <= 90 ? 'info' : 'success';
  return <Pill tone={tone} size="sm">Còn {days} ngày</Pill>;
}

function DocsTab({ detail }: { detail: VehicleDetail }) {
  const items = [
    { label: 'Đăng kiểm', date: detail.VehicleInspection?.[0]?.expiryDate, book: detail.inspectionBookNumber },
    { label: 'Đăng ký xe', date: detail.registrationExpiry },
    { label: 'BH Thân vỏ', date: detail.insuranceBodyExpiry },
    { label: 'BH TNDS', date: detail.insuranceLiabilityExpiry },
    { label: 'GPS', date: detail.gpsExpiryDate },
  ];
  const warnings = items.filter((i) => { const d = daysLeft(i.date); return d !== null && d <= 30; });

  return (
    <div className="space-y-3">
      {warnings.length > 0 && (
        <Alert tone="warn">
          {warnings.map((i) => {
            const d = daysLeft(i.date) as number;
            return <div key={i.label}>{i.label}: {d < 0 ? `quá hạn ${Math.abs(d)} ngày` : `còn ${d} ngày`}</div>;
          })}
        </Alert>
      )}

      <SubCard title="Hạn giấy tờ">
        <table className="tbl tbl-compact">
          <tbody>
            {items.map((item) => (
              <tr key={item.label}>
                <td>
                  <span style={{ fontWeight: 500 }}>{item.label}</span>
                  {item.book && <span className="code" style={{ marginLeft: 8 }}>{item.book}</span>}
                </td>
                <td>{formatDate(item.date)}</td>
                <td className="num"><ExpiryPill date={item.date} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SubCard>

      <SubCard title="Đăng ký hành chính">
        <div className="kv">
          <FieldRow label="CỤC CSGT" value={detail.registeredCsgt ? '✓ Đã đăng ký' : '✗ Chưa'} />
          <FieldRow label="CỤC ĐĂNG KIỂM" value={detail.registeredRegistry ? '✓ Đã đăng ký' : '✗ Chưa'} />
          <FieldRow label="Ngân hàng" value={detail.bankName} />
          <FieldRow label="Lần kiểm tra cuối" value={formatDate(detail.lastCheckedAt)} />
        </div>
      </SubCard>
    </div>
  );
}

/* ── Finance Tab (read-only view) ──────────────────────────────────── */

function FinanceTab({ detail }: { detail: VehicleDetail }) {
  const fin = detail.VehicleFinance;
  if (!fin) return <div className="empty"><div className="empty-title">Chưa có thông tin tài chính</div></div>;
  const money = (v: number | string | null | undefined) => (v ? formatMoney(v) : null);
  return (
    <div className="space-y-3">
      <SubCard title="Giá mua & Khấu hao">
        <div className="kv">
          <FieldRow label="Giá mua" value={money(fin.purchasePrice)} />
          <FieldRow label="Ngày mua" value={fin.purchaseDate ? formatDate(fin.purchaseDate) : null} />
          <FieldRow label="Khấu hao" value={money(fin.depreciation)} />
        </div>
      </SubCard>
      <SubCard title="Vay & Phí">
        <div className="kv">
          <FieldRow label="Khoản vay" value={money(fin.loanAmount)} />
          <FieldRow label="Lãi suất" value={fin.interestRate ? `${fin.interestRate}%` : null} />
          <FieldRow label="Từ ngày" value={fin.loanStartDate ? formatDate(fin.loanStartDate) : null} />
          <FieldRow label="Đến ngày" value={fin.loanEndDate ? formatDate(fin.loanEndDate) : null} />
          <FieldRow label="Trả hàng tháng" value={money(fin.monthlyPayment)} />
          <FieldRow label="Bảo hiểm" value={money(fin.insuranceFee)} />
          <FieldRow label="Phí đường bộ" value={money(fin.roadTax)} />
        </div>
      </SubCard>
    </div>
  );
}

/* ── Inspections Tab ───────────────────────────────────────────────── */



const EMPTY_INSPECTION_FORM = { inspectionDate: '', expiryDate: '', result: 'PASS', inspectionCenter: '', certificateNumber: '', cost: '', notes: '' };

function InspectionsTab({ detail, loadDetail }: { detail: VehicleDetail; loadDetail: (id: number) => void }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('vehicle', 'canEdit');
  const list = detail.VehicleInspection || [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_INSPECTION_FORM);
  const [saving, setSaving] = useState(false);

  const upd = (field: keyof typeof EMPTY_INSPECTION_FORM, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleAdd = async () => {
    setSaving(true);
    try {
      await api.post(`/vehicles/${detail.id}/inspections`, {
        ...form,
        cost: form.cost ? Number(form.cost) : null,
      });
      setShowForm(false);
      setForm(EMPTY_INSPECTION_FORM);
      loadDetail(detail.id);
    } catch { alert('Lỗi thêm kiểm định'); }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <SubCard
        title={`Lịch sử kiểm định (${list.length})`}
        actions={canEdit && <Button size="xs" variant={showForm ? 'ghost' : 'secondary'} icon={showForm ? undefined : <Plus />} onClick={() => setShowForm(!showForm)}>{showForm ? 'Hủy' : 'Thêm'}</Button>}
      >
        {showForm && (
          <div className="space-y-3">
            <FormGrid>
              <Field label="Ngày KĐ" required><input type="date" value={form.inspectionDate} onChange={(e) => upd('inspectionDate', e.target.value)} className={EDIT_INPUT_CLASS} /></Field>
              <Field label="Hạn" required><input type="date" value={form.expiryDate} onChange={(e) => upd('expiryDate', e.target.value)} className={EDIT_INPUT_CLASS} /></Field>
              <Field label="Kết quả">
                <select value={form.result} onChange={(e) => upd('result', e.target.value)} className={EDIT_SELECT_CLASS}>
                  <option value="PASS">Đạt</option><option value="FAIL">Không đạt</option><option value="CONDITIONAL">Có điều kiện</option>
                </select>
              </Field>
              <Field label="Trung tâm"><input type="text" value={form.inspectionCenter} onChange={(e) => upd('inspectionCenter', e.target.value)} className={EDIT_INPUT_CLASS} /></Field>
              <Field label="Số GCN"><input type="text" value={form.certificateNumber} onChange={(e) => upd('certificateNumber', e.target.value)} className={EDIT_INPUT_CLASS} /></Field>
              <Field label="Chi phí"><input type="number" value={form.cost} onChange={(e) => upd('cost', e.target.value)} className={EDIT_INPUT_CLASS} /></Field>
            </FormGrid>
            <Button variant="primary" size="sm" block onClick={handleAdd} loading={saving} disabled={!form.inspectionDate || !form.expiryDate}>
              {saving ? 'Đang lưu…' : 'Thêm kiểm định'}
            </Button>
          </div>
        )}

        {list.length === 0 && !showForm && (
          <div className="empty" style={{ padding: '20px 12px' }}><div className="empty-title">Chưa có lịch sử kiểm định</div></div>
        )}

        {list.length > 0 && (
          <table className="tbl tbl-compact">
            <thead>
              <tr><th>Ngày KĐ</th><th>Hạn</th><th>Kết quả</th></tr>
            </thead>
            <tbody>
              {list.map((insp) => (
                <tr key={insp.id}>
                  <td>
                    {formatDate(insp.inspectionDate)}
                    {insp.inspectionCenter && <div className="cell-sub">{insp.inspectionCenter}</div>}
                  </td>
                  <td>
                    {formatDate(insp.expiryDate)}
                    {insp.certificateNumber && <div className="cell-sub">GCN: <span className="code">{insp.certificateNumber}</span></div>}
                  </td>
                  <td><StatusPill status={insp.result} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SubCard>
    </div>
  );
}

/* ── Create Modal ──────────────────────────────────────────────────── */

function CreateVehicleModal({ onClose, onCreated, driverOptions }: {
  onClose: () => void; onCreated: () => void; driverOptions: DriverOption[];
}) {
  const [form, setForm] = useState({ plateNumber: '', type: '', brand: '', model: '', tonnage: '', ownerType: 'INTERNAL', status: 'ACTIVE', primaryDriverId: '', secondaryDriverId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!form.plateNumber) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/vehicles', {
        ...form,
        tonnage: form.tonnage ? Number(form.tonnage) : null,
        primaryDriverId: form.primaryDriverId ? Number(form.primaryDriverId) : null,
        secondaryDriverId: form.secondaryDriverId ? Number(form.secondaryDriverId) : null,
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    }
    setSaving(false);
  }, [form, onCreated]);

  const upd = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <ModalOverlay
      onClose={onClose}
      title="Thêm phương tiện mới"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!form.plateNumber}>
            {saving ? 'Đang lưu…' : 'Tạo phương tiện'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <FormGrid>
          <Field label="Biển số" required>
            <input type="text" value={form.plateNumber} onChange={(e) => upd('plateNumber', e.target.value)} className="input" placeholder="51C-12345" />
          </Field>
          <Field label="Loại xe">
            <select value={form.type} onChange={(e) => upd('type', e.target.value)} className="select">
              <option value="">Chọn loại</option>
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
            </select>
          </Field>
          <Field label="Hãng xe">
            <input type="text" value={form.brand} onChange={(e) => upd('brand', e.target.value)} className="input" placeholder="Hyundai" />
          </Field>
          <Field label="Model">
            <input type="text" value={form.model} onChange={(e) => upd('model', e.target.value)} className="input" placeholder="HD72" />
          </Field>
          <Field label="Tải trọng (T)">
            <input type="number" value={form.tonnage} onChange={(e) => upd('tonnage', e.target.value)} className="input" />
          </Field>
          <Field label="Sở hữu">
            <select value={form.ownerType} onChange={(e) => upd('ownerType', e.target.value)} className="select">
              {OWNER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="TX chính">
            <SearchableSelect options={driverOptions} value={form.primaryDriverId} onChange={(v) => upd('primaryDriverId', String(v))} placeholder="Chọn tài xế" />
          </Field>
          <Field label="TX phụ">
            <SearchableSelect options={driverOptions} value={form.secondaryDriverId} onChange={(v) => upd('secondaryDriverId', String(v))} placeholder="Chọn tài xế" />
          </Field>
        </FormGrid>
      </div>
    </ModalOverlay>
  );
}
