import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../shared/auth-context';
import api from '../../shared/api';
import { errorMessage } from '../../shared/format';
import { Plus, Play, Info, History, CheckCircle2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { DetailPanel } from '../../shared/components/DetailPanel';
import type { DetailPanelTab } from '../../shared/components/DetailPanel';
import { ServerDataTable } from '../../shared/components/ServerDataTable';
import type { ServerDataColumn, ServerDataTableApi } from '../../shared/components/ServerDataTable';
import { SearchableMultiSelect } from '../../shared/components/SearchableMultiSelect';
import type { MultiSelectOption } from '../../shared/components/SearchableMultiSelect';
import { ModalOverlay } from '../../shared/components/ModalOverlay';
import { FieldRow, EditFieldRow, EDIT_TEXTAREA_CLASS } from '../../shared/components/FieldRow';
import {
  Button, Input, Field, FormGrid,
  PageHeader, SubCard, Pill, Plate, StatusPill, Alert, LoadingBlock, Textarea,
} from '../../shared/ui';

/* ── Constants ─────────────────────────────────────────────────────── */

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const SLOT_LABELS: { key: string; label: string }[] = [
  { key: 'SANG', label: 'Sáng' },
  { key: 'CHIEU', label: 'Chiều' },
  { key: 'TOI', label: 'Tối' },
];
const PANEL_TABS: DetailPanelTab[] = [
  { key: 'info', label: 'Thông tin', icon: <Info className="w-4 h-4" /> },
  { key: 'history', label: 'Lịch sử', icon: <History className="w-4 h-4" /> },
];
const RAIL_STATUSES = ['ACTIVE', 'INACTIVE'];

/** Dòng trả về từ /trip-plans/dt */
interface PlanDriver { id: number; fullName: string; code: string }
interface PlanRow {
  id: number;
  isActive: boolean;
  scheduleDays: number[] | null;
  timeSlots: string[] | null;
  Customer: { id: number; name: string; code: string } | null;
  Route: { id: number; name: string; code: string } | null;
  Vehicle: { id: number; plateNumber: string } | null;
  Employee_TripPlan_primaryDriverIdToEmployee: PlanDriver | null;
  Employee_TripPlan_secondaryDriverIdToEmployee: PlanDriver | null;
}

const Dash = () => <span style={{ color: 'var(--faint)' }}>—</span>;

/** Tải danh sách lựa chọn cho bộ lọc; lỗi không chặn trang, ô lọc chỉ rỗng */
function useFilterOptions(url: string, toOption: (x: any) => MultiSelectOption<number>) { // eslint-disable-line @typescript-eslint/no-explicit-any -- API row shape differs per endpoint
  const [options, setOptions] = useState<MultiSelectOption<number>[]>([]);
  const mapRef = useRef(toOption);
  useEffect(() => {
    let alive = true;
    api.get(url)
      .then((r) => { if (alive) setOptions((r.data.data || r.data).map(mapRef.current)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [url]);
  return options;
}

const customerOption = (x: { id: number; name: string; code?: string }) => ({ value: x.id, label: x.name, sublabel: x.code });
const vehicleOption = (x: { id: number; plateNumber: string }) => ({ value: x.id, label: x.plateNumber });
const driverOption = (x: { id: number; fullName: string; code?: string }) => ({ value: x.id, label: x.fullName, sublabel: x.code });

function ScheduleChips({ plan }: { plan: PlanRow }) {
  const slots = (plan.timeSlots || []).map((key) => ({ key, label: SLOT_LABELS.find((sl) => sl.key === key)?.label || key }));
  return (
    <div className="flex gap-1 flex-nowrap">
      {[...(plan.scheduleDays || [])].sort((a, b) => a - b).map((d) => (
        <Pill key={d} tone="brand" size="sm">{DAY_LABELS[d]}</Pill>
      ))}
      {slots.length > 0 && (
        <Pill tone="warn" size="sm"><span title={slots.map((s) => s.label).join(', ')}>{slots.map((s) => s.label.charAt(0)).join('·')}</span></Pill>
      )}
    </div>
  );
}

function driverText(plan: PlanRow) {
  return [plan.Employee_TripPlan_primaryDriverIdToEmployee?.fullName, plan.Employee_TripPlan_secondaryDriverIdToEmployee?.fullName]
    .filter(Boolean).join(' + ');
}

/* ── Page ──────────────────────────────────────────────────────────── */

export function TripPlanListPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('trip', 'canEdit');
  const canDelete = hasPermission('trip', 'canDelete');

  /* ── State ────────────────────────────────────────────────────── */
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [customerFilter, setCustomerFilter] = useState<number[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState<number[]>([]);
  const [driverFilter, setDriverFilter] = useState<number[]>([]);
  const tableRef = useRef<ServerDataTableApi>(null);
  const reload = useCallback(() => tableRef.current?.reload(), []);

  const customerOptions = useFilterOptions('/customers?pageSize=100', customerOption);
  const vehicleOptions = useFilterOptions('/vehicles?pageSize=1000&status=ACTIVE', vehicleOption);
  const driverOptions = useFilterOptions('/employees?pageSize=100&isDriver=true', driverOption);

  // Detail panel
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any -- full plan payload, edited as a loose form
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Editing
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({}); // eslint-disable-line @typescript-eslint/no-explicit-any -- mirrors detail payload
  const [saving, setSaving] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Breakpoint
  const [isLg, setIsLg] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ── Fetch detail ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true);
    api.get(`/trip-plans/${selectedId}`)
      .then((res) => setDetail(res.data))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const handleRowClick = useCallback((row: PlanRow) => {
    setSelectedId(row.id);
    setActiveTab('info');
    setIsEditing(false);
  }, []);

  /* ── Toggle active ────────────────────────────────────────────── */
  const toggleActive = useCallback(async (id: number, isActive: boolean) => {
    try {
      await api.patch(`/trip-plans/${id}/toggle`, { isActive });
      reload();
      if (selectedId === id) {
        const res = await api.get(`/trip-plans/${id}`);
        setDetail(res.data);
      }
    } catch (err) {
      alert(errorMessage(err, 'Lỗi cập nhật trạng thái'));
    }
  }, [reload, selectedId]);

  /* ── Delete ───────────────────────────────────────────────────── */
  const handleDelete = useCallback(async () => {
    if (!selectedId || !confirm('Xóa kế hoạch này?')) return;
    try {
      await api.delete(`/trip-plans/${selectedId}`);
      setSelectedId(null);
      setIsEditing(false);
      reload();
    } catch (err) {
      alert(errorMessage(err, 'Lỗi xóa kế hoạch'));
    }
  }, [selectedId, reload]);

  /* ── Edit ─────────────────────────────────────────────────────── */
  const handleToggleEdit = useCallback(() => {
    if (!isEditing && detail) {
      setEditForm({
        customerId: detail.customerId,
        routeId: detail.routeId,
        vehicleId: detail.vehicleId,
        primaryDriverId: detail.primaryDriverId,
        secondaryDriverId: detail.secondaryDriverId,
        scheduleDays: [...(detail.scheduleDays || [])],
        timeSlots: [...(detail.timeSlots || [])],
        notes: detail.notes || '',
        version: detail.version,
      });
    }
    setIsEditing((prev) => !prev);
  }, [isEditing, detail]);

  const handleSave = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.put(`/trip-plans/${selectedId}`, editForm);
      const res = await api.get(`/trip-plans/${selectedId}`);
      setDetail(res.data);
      setIsEditing(false);
      reload();
    } catch (err) {
      alert(errorMessage(err, 'Lỗi lưu'));
    }
    setSaving(false);
  }, [selectedId, editForm, reload]);

  const handleClose = useCallback(() => { setSelectedId(null); setIsEditing(false); }, []);
  const panelOpen = selectedId !== null;

  const renderPanel = (inline: boolean) => (
    <DetailPanel
      isOpen={panelOpen} onClose={handleClose}
      title={detail?.Route?.name || 'Đang tải…'}
      subtitle={detail ? `${detail.Customer?.name || ''} — ${detail.Vehicle?.plateNumber || ''}` : undefined}
      titleAddon={detail ? <StatusPill status={detail.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" /> : undefined}
      canEdit={canEdit} canDelete={canDelete} onDelete={handleDelete}
      isEditing={isEditing} onToggleEdit={handleToggleEdit} onSave={handleSave} saving={saving}
      tabs={PANEL_TABS} activeTab={activeTab} onTabChange={setActiveTab}
      inlineMode={inline}>
      <PlanPanelContent detail={detail} loading={detailLoading} activeTab={activeTab} isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} />
    </DetailPanel>
  );

  /* ── Columns ──────────────────────────────────────────────────── */
  const columns = useMemo<ServerDataColumn<PlanRow>[]>(() => [
    { key: 'customer', label: 'Khách hàng', sortIndex: 0, render: (p) => <span className="cell-title">{p.Customer?.name || <Dash />}</span> },
    { key: 'route', label: 'Tuyến đường', sortIndex: 1, render: (p) => p.Route?.name || <Dash /> },
    { key: 'plate', label: 'Biển số', sortIndex: 2, width: 130, className: 'whitespace-nowrap', render: (p) => (p.Vehicle?.plateNumber ? <Plate>{p.Vehicle.plateNumber}</Plate> : <Dash />) },
    { key: 'driver', label: 'Tài xế', hideBelow: 'md', render: (p) => driverText(p) || <Dash /> },
    { key: 'schedule', label: 'Lịch chạy', hideBelow: 'lg', className: 'whitespace-nowrap', render: (p) => <ScheduleChips plan={p} /> },
    {
      key: 'config', label: 'Cấu hình', align: 'center', width: 80, hideBelow: 'md',
      render: (p) => (
        p.Employee_TripPlan_primaryDriverIdToEmployee && p.Vehicle && (p.scheduleDays?.length ?? 0) > 0 ? (
          <span title="Đầy đủ" style={{ color: 'var(--success-text)' }}><CheckCircle2 className="inline w-4 h-4" aria-label="Đầy đủ" /></span>
        ) : (
          <span title="Thiếu thông tin" style={{ color: 'var(--warn-accent)' }}><AlertTriangle className="inline w-4 h-4" aria-label="Thiếu thông tin" /></span>
        )
      ),
    },
    {
      key: 'isActive', label: 'Trạng thái', sortIndex: 3, align: 'center', width: 120,
      render: (p) => (
        <span onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => toggleActive(p.id, !p.isActive)}
            title={p.isActive ? 'Đang bật — bấm để tắt' : 'Đang tắt — bấm để bật'}
            aria-pressed={!!p.isActive}
          >
            <StatusPill status={p.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
          </button>
        </span>
      ),
    },
  ], [toggleActive]);

  const filters = useMemo(
    () => ({ status: statusFilter, customerId: customerFilter, vehicleId: vehicleFilter, driverId: driverFilter }),
    [statusFilter, customerFilter, vehicleFilter, driverFilter],
  );

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="page page-fill">
      <PageHeader
        title="Kế hoạch chuyến đi"
        description="Lịch chạy định kỳ theo khách hàng, tuyến, xe và tài xế"
      />

      <ServerDataTable<PlanRow>
        endpoint="/trip-plans/dt"
        apiRef={tableRef}
        columns={columns}
        filters={filters}
        density="dense"
        searchPlaceholder="Tìm tuyến, biển số, tài xế..."
        emptyTitle="Chưa có kế hoạch nào"
        rail={{ statuses: RAIL_STATUSES, value: statusFilter, onChange: setStatusFilter }}
        toolbar={(
          <>
            <SearchableMultiSelect mode="multi" size="sm" value={customerFilter} onChange={setCustomerFilter} options={customerOptions} placeholder="Khách hàng" searchPlaceholder="Tìm khách hàng..." aria-label="Lọc theo khách hàng" />
            <SearchableMultiSelect mode="multi" size="sm" value={vehicleFilter} onChange={setVehicleFilter} options={vehicleOptions} placeholder="Biển số" searchPlaceholder="Tìm biển số..." aria-label="Lọc theo xe" />
            <SearchableMultiSelect mode="multi" size="sm" value={driverFilter} onChange={setDriverFilter} options={driverOptions} placeholder="Tài xế" searchPlaceholder="Tìm tài xế..." aria-label="Lọc theo tài xế" />
          </>
        )}
        actions={canEdit && (
          <>
            <Button size="sm" icon={<Play />} onClick={() => setShowGenerateModal(true)}>Tạo chuyến</Button>
            <Button variant="primary" size="sm" icon={<Plus />} onClick={() => setShowCreateModal(true)}>Thêm kế hoạch</Button>
          </>
        )}
        selectedKey={selectedId}
        onRowClick={handleRowClick}
        aside={panelOpen && isLg ? (
          <aside className="card flex flex-col shrink-0" style={{ width: 480 }}>
            {renderPanel(true)}
          </aside>
        ) : undefined}
      />

      {panelOpen && !isLg && renderPanel(false)}

      {/* Modals */}
      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); reload(); }}
        />
      )}
      {showGenerateModal && (
        <GenerateTripsModal
          onClose={() => setShowGenerateModal(false)}
          onGenerated={() => { setShowGenerateModal(false); reload(); }}
        />
      )}
    </div>
  );
}

/* ── Panel Content ─────────────────────────────────────────────────── */

function PlanPanelContent({ detail, loading, activeTab, isEditing, editForm, setEditForm }: {
  detail: any; loading: boolean; activeTab: string;
  isEditing: boolean; editForm: any; setEditForm: (fn: any) => void;
}) {
  if (loading || !detail) return <LoadingBlock />;

  if (activeTab === 'info') {
    const driver1 = detail.Employee_TripPlan_primaryDriverIdToEmployee;
    const driver2 = detail.Employee_TripPlan_secondaryDriverIdToEmployee;

    const toggleEditDay = (day: number) => {
      setEditForm((prev: any) => ({
        ...prev,
        scheduleDays: prev.scheduleDays.includes(day)
          ? prev.scheduleDays.filter((d: number) => d !== day)
          : [...prev.scheduleDays, day],
      }));
    };

    const toggleEditSlot = (slot: string) => {
      setEditForm((prev: any) => ({
        ...prev,
        timeSlots: prev.timeSlots.includes(slot)
          ? prev.timeSlots.filter((s: string) => s !== slot)
          : [...prev.timeSlots, slot],
      }));
    };

    return (
      <div className="flex flex-col gap-3">
        {/* KH & Tuyến — read only, FK changes need dropdown (out of scope for inline edit) */}
        <SubCard title="Khách hàng & Tuyến">
          <div className="kv">
            <FieldRow label="Khách hàng" value={detail.Customer?.name} />
            <FieldRow label="Mã KH" value={detail.Customer?.code} mono />
            <FieldRow label="Tuyến đường" value={detail.Route?.name} full />
            <FieldRow label="Điểm đi" value={detail.Route?.origin} />
            <FieldRow label="Điểm đến" value={detail.Route?.destination} />
          </div>
        </SubCard>

        {/* TX & Xe — read only */}
        <SubCard title="Tài xế & Phương tiện">
          <div className="kv">
            <FieldRow label="Biển số" value={detail.Vehicle?.plateNumber && <Plate>{detail.Vehicle.plateNumber}</Plate>} full />
            <FieldRow label="Tài xế chính" value={driver1?.fullName} />
            <FieldRow label="Tài xế phụ" value={driver2?.fullName} />
          </div>
        </SubCard>

        {/* Lịch chạy — editable */}
        <SubCard title="Lịch chạy">
          <div className="flex flex-col gap-3">
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>Ngày trong tuần</div>
              <div className="flex gap-1.5 flex-wrap">
                {DAY_LABELS.map((label, idx) => {
                  const days = isEditing ? (editForm.scheduleDays || []) : (detail.scheduleDays || []);
                  const active = days.includes(idx);
                  return isEditing ? (
                    <button key={idx} type="button" aria-pressed={active} onClick={() => toggleEditDay(idx)}
                      className={clsx('pill pill-sm', active ? 'pill-brand' : 'pill-outline')}>{label}</button>
                  ) : (
                    <span key={idx} className={clsx('pill pill-sm', active ? 'pill-brand' : 'pill-outline')}>{label}</span>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>Buổi trong ngày</div>
              <div className="flex gap-1.5 flex-wrap">
                {SLOT_LABELS.map(({ key, label }) => {
                  const slots = isEditing ? (editForm.timeSlots || []) : (detail.timeSlots || []);
                  const active = slots.includes(key);
                  return isEditing ? (
                    <button key={key} type="button" aria-pressed={active} onClick={() => toggleEditSlot(key)}
                      className={clsx('pill pill-sm', active ? 'pill-warn' : 'pill-outline')}>{label}</button>
                  ) : (
                    <span key={key} className={clsx('pill pill-sm', active ? 'pill-warn' : 'pill-outline')}>{label}</span>
                  );
                })}
              </div>
            </div>
          </div>
        </SubCard>

        {/* Ghi chú — editable */}
        <SubCard title="Trạng thái & Ghi chú">
          <div className="kv">
            <FieldRow label="Hoạt động" value={detail.isActive ? 'Đang bật' : 'Đang tắt'} />
            {isEditing ? (
              <EditFieldRow label="Ghi chú" full>
                <textarea
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className={EDIT_TEXTAREA_CLASS}
                />
              </EditFieldRow>
            ) : (
              <FieldRow label="Ghi chú" value={detail.notes} full />
            )}
          </div>
        </SubCard>
      </div>
    );
  }

  return <div className="tbl-empty">Chưa có lịch sử</div>;
}

/* ── Create Plan Modal ─────────────────────────────────────────────── */

function CreatePlanModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [customerId, setCustomerId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [primaryDriverId, setPrimaryDriverId] = useState('');
  const [secondaryDriverId, setSecondaryDriverId] = useState('');
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Select options
  const [customers, setCustomers] = useState<MultiSelectOption[]>([]);
  const [routes, setRoutes] = useState<MultiSelectOption[]>([]);
  const [vehicles, setVehicles] = useState<MultiSelectOption[]>([]);
  const [employees, setEmployees] = useState<MultiSelectOption[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/customers?pageSize=500'),
      api.get('/routes?pageSize=500'),
      api.get('/vehicles?pageSize=1000'),
      api.get('/employees?pageSize=100&isDriver=true'),
    ]).then(([c, r, v, e]) => {
      setCustomers((c.data.data || c.data).map((x: any) => ({ value: String(x.id), label: `${x.code} — ${x.name}` })));
      setRoutes((r.data.data || r.data).map((x: any) => ({ value: String(x.id), label: x.name })));
      setVehicles((v.data.data || v.data).map((x: any) => ({ value: String(x.id), label: x.plateNumber })));
      setEmployees((e.data.data || e.data).map((x: any) => ({ value: String(x.id), label: `${x.code} — ${x.fullName}` })));
    }).catch((err) => alert(errorMessage(err, 'Lỗi tải danh sách chọn')));
  }, []);

  // Auto-fill drivers from vehicle
  const handleVehicleChange = useCallback(async (val: string) => {
    setVehicleId(val);
    if (!val) return;
    try {
      const res = await api.get(`/vehicles/${val}`);
      const veh = res.data.data;
      if (veh?.primaryDriver) setPrimaryDriverId(String(veh.primaryDriver.id));
      if (veh?.secondaryDriver) setSecondaryDriverId(String(veh.secondaryDriver.id));
    } catch (err) {
      alert(errorMessage(err, 'Lỗi tải thông tin xe'));
    }
  }, []);

  const toggleDay = useCallback((day: number) => {
    setScheduleDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }, []);

  const toggleSlot = useCallback((slot: string) => {
    setTimeSlots((prev) => prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!customerId || !routeId || !vehicleId || scheduleDays.length === 0) return;
    setSaving(true);
    try {
      await api.post('/trip-plans', {
        customerId: Number(customerId),
        routeId: Number(routeId),
        vehicleId: Number(vehicleId),
        primaryDriverId: primaryDriverId ? Number(primaryDriverId) : null,
        secondaryDriverId: secondaryDriverId ? Number(secondaryDriverId) : null,
        scheduleDays,
        timeSlots,
        notes: notes || null,
      });
      onCreated();
    } catch (err) {
      alert(errorMessage(err, 'Lỗi tạo kế hoạch'));
    }
    setSaving(false);
  }, [customerId, routeId, vehicleId, primaryDriverId, secondaryDriverId, scheduleDays, timeSlots, notes, onCreated]);

  return (
    <ModalOverlay
      onClose={onClose}
      title="Thêm kế hoạch chuyến đi"
      footer={(
        <>
          <Button onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}
            disabled={!customerId || !routeId || !vehicleId || scheduleDays.length === 0}>
            {saving ? 'Đang lưu…' : 'Tạo kế hoạch'}
          </Button>
        </>
      )}
    >
      <FormGrid>
        <Field label="Khách hàng" required full>
          <SearchableMultiSelect mode="single" searchable="auto" options={customers} value={customerId} onChange={(v) => setCustomerId(String(v))} placeholder="Chọn khách hàng" />
        </Field>
        <Field label="Tuyến đường" required full>
          <SearchableMultiSelect mode="single" searchable="auto" options={routes} value={routeId} onChange={(v) => setRouteId(String(v))} placeholder="Chọn tuyến" />
        </Field>
        <Field label="Phương tiện" required full>
          <SearchableMultiSelect mode="single" searchable="auto" options={vehicles} value={vehicleId} onChange={(v) => handleVehicleChange(String(v))} placeholder="Chọn xe" />
        </Field>
        <Field label="Tài xế chính">
          <SearchableMultiSelect mode="single" searchable="auto" options={employees} value={primaryDriverId} onChange={(v) => setPrimaryDriverId(String(v))} placeholder="Chọn tài xế" />
        </Field>
        <Field label="Tài xế phụ">
          <SearchableMultiSelect mode="single" searchable="auto" options={employees} value={secondaryDriverId} onChange={(v) => setSecondaryDriverId(String(v))} placeholder="Chọn tài xế" />
        </Field>

        <Field label="Ngày trong tuần" required full>
          <div className="flex gap-1.5 flex-wrap">
            {DAY_LABELS.map((label, idx) => (
              <button key={idx} type="button" aria-pressed={scheduleDays.includes(idx)} onClick={() => toggleDay(idx)}
                className={clsx('pill', scheduleDays.includes(idx) ? 'pill-brand' : 'pill-outline')}>{label}</button>
            ))}
          </div>
        </Field>

        <Field label="Buổi trong ngày" full>
          <div className="flex gap-1.5 flex-wrap">
            {SLOT_LABELS.map(({ key, label }) => (
              <button key={key} type="button" aria-pressed={timeSlots.includes(key)} onClick={() => toggleSlot(key)}
                className={clsx('pill', timeSlots.includes(key) ? 'pill-warn' : 'pill-outline')}>{label}</button>
            ))}
          </div>
        </Field>

        <Field label="Ghi chú" full>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
      </FormGrid>
    </ModalOverlay>
  );
}

/* ── Generate Trips Modal ──────────────────────────────────────────── */

function GenerateTripsModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; totalPlans: number } | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!startDate || !endDate) return;
    setGenerating(true);
    try {
      const res = await api.post('/trip-plans/generate', { startDate, endDate });
      setResult(res.data);
    } catch (err) {
      alert(errorMessage(err, 'Lỗi tạo chuyến'));
    }
    setGenerating(false);
  }, [startDate, endDate]);

  return (
    <ModalOverlay
      onClose={onClose}
      title="Tạo chuyến từ kế hoạch"
      footer={(
        <>
          <Button onClick={onClose}>{result ? 'Đóng' : 'Hủy'}</Button>
          {!result && (
            <Button variant="primary" onClick={handleGenerate} loading={generating} disabled={!startDate || !endDate}>
              {generating ? 'Đang tạo…' : 'Tạo chuyến'}
            </Button>
          )}
          {result && <Button variant="primary" onClick={onGenerated}>Xong</Button>}
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Tạo chuyến đi cho tất cả kế hoạch đang <strong>bật</strong> trong khoảng ngày được chọn.
        </p>
        <FormGrid>
          <Field label="Từ ngày">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Đến ngày">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </FormGrid>

        {result && (
          <Alert tone="success">
            Đã tạo <strong>{result.created}</strong> chuyến từ {result.totalPlans} kế hoạch.
            {result.skipped > 0 && <> Bỏ qua {result.skipped} (đã tồn tại).</>}
          </Alert>
        )}
      </div>
    </ModalOverlay>
  );
}
