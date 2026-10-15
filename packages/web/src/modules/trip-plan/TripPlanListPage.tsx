import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../shared/auth-context';
import api from '../../shared/api';
import { errorMessage } from '../../shared/format';
import {
  Plus, Play, RefreshCw, ChevronLeft, ChevronRight, Info, History, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import { DetailPanel } from '../../shared/components/DetailPanel';
import type { DetailPanelTab } from '../../shared/components/DetailPanel';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import type { SearchableOption } from '../../shared/components/SearchableSelect';
import { ModalOverlay } from '../../shared/components/ModalOverlay';
import { FieldRow, EditFieldRow, EDIT_TEXTAREA_CLASS } from '../../shared/components/FieldRow';
import {
  Button, Input, Field, FormGrid, SearchBox, FilterSelect,
  PageHeader, Card, SubCard, Toolbar, Pill, Plate, StatusPill, Alert, LoadingBlock, Textarea,
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
const PAGE_SIZE = 50;

/* ── Page ──────────────────────────────────────────────────────────── */

export function TripPlanListPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('trip', 'canEdit');
  const canDelete = hasPermission('trip', 'canDelete');

  /* ── State ────────────────────────────────────────────────────── */
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [customerOptions, setCustomerOptions] = useState<{ id: number; name: string }[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Detail panel
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Editing
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
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

  /* ── Fetch list ───────────────────────────────────────────────── */
  const fetchList = useCallback(async (p?: number, s?: string, c?: string) => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page: p ?? page, pageSize: PAGE_SIZE };
      if (s ?? search) params.search = s ?? search;
      if (c ?? customerFilter) params.customerId = c ?? customerFilter;
      const res = await api.get('/trip-plans', { params });
      setData(res.data.data);
      setTotal(res.data.total);
      setActiveCount(res.data.activeCount);
    } catch (err) {
      setError(errorMessage(err, 'Lỗi tải dữ liệu'));
    } finally {
      setLoading(false);
    }
  }, [page, search, customerFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); fetchList(1, val, customerFilter); }, 300);
  }, [fetchList, customerFilter]);

  // Lỗi tải danh sách khách hàng không chặn trang: ô lọc chỉ còn mục "Tất cả"
  useEffect(() => {
    api.get('/customers?pageSize=100').then((r) => setCustomerOptions(r.data.data)).catch(() => {});
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

  /* ── Toggle active ────────────────────────────────────────────── */
  const toggleActive = useCallback(async (id: number, isActive: boolean) => {
    try {
      await api.patch(`/trip-plans/${id}/toggle`, { isActive });
      fetchList();
      if (selectedId === id) {
        const res = await api.get(`/trip-plans/${id}`);
        setDetail(res.data);
      }
    } catch (err) {
      alert(errorMessage(err, 'Lỗi cập nhật trạng thái'));
    }
  }, [fetchList, selectedId]);

  /* ── Delete ───────────────────────────────────────────────────── */
  const handleDelete = useCallback(async () => {
    if (!selectedId || !confirm('Xóa kế hoạch này?')) return;
    try {
      await api.delete(`/trip-plans/${selectedId}`);
      setSelectedId(null);
      setIsEditing(false);
      fetchList();
    } catch (err) {
      alert(errorMessage(err, 'Lỗi xóa kế hoạch'));
    }
  }, [selectedId, fetchList]);

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
      fetchList();
    } catch (err) {
      alert(errorMessage(err, 'Lỗi lưu'));
    }
    setSaving(false);
  }, [selectedId, editForm, fetchList]);

  const handleClose = useCallback(() => { setSelectedId(null); setIsEditing(false); }, []);
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
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

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="page page-fill">
      <PageHeader
        title="Kế hoạch chuyến đi"
        description="Lịch chạy định kỳ theo khách hàng, tuyến, xe và tài xế"
        actions={canEdit && (
          <>
            <Button icon={<Play />} onClick={() => setShowGenerateModal(true)}>Tạo chuyến</Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setShowCreateModal(true)}>Thêm kế hoạch</Button>
          </>
        )}
      />

      <div className="flex flex-1 min-h-0 gap-4">
        {/* Table */}
        <Card className={clsx('flex-1 min-w-0 flex-col min-h-0', panelOpen ? 'hidden lg:flex' : 'flex')}>
          <Toolbar>
            <SearchBox value={search} onChange={handleSearch} placeholder="Tìm tuyến, biển số, tài xế…" width={320} />
            <FilterSelect
              value={customerFilter}
              onChange={(v) => { setCustomerFilter(v); setPage(1); fetchList(1, search, v); }}
              aria-label="Khách hàng"
            >
              <option value="">Tất cả khách hàng</option>
              {customerOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </FilterSelect>
          </Toolbar>

          {error && (
            <div style={{ padding: '0 16px 12px' }}>
              <Alert tone="error">
                <div className="flex items-center gap-2">
                  <span className="flex-1">{error}</span>
                  <Button size="xs" icon={<RefreshCw />} onClick={() => fetchList()}>Thử lại</Button>
                </div>
              </Alert>
            </div>
          )}

          <div className="tbl-wrap flex-1 min-h-0">
            <table className="tbl tbl-hover tbl-click">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Khách hàng</th>
                  <th>Tuyến đường</th>
                  <th>Biển số</th>
                  <th>Tài xế</th>
                  <th>Lịch chạy</th>
                  <th className="center">Cấu hình</th>
                  <th className="center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {loading && data.length === 0 ? (
                  <tr><td colSpan={8}><LoadingBlock /></td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={8} className="tbl-empty">Chưa có kế hoạch nào</td></tr>
                ) : data.map((plan, idx) => {
                  const driver1 = plan.Employee_TripPlan_primaryDriverIdToEmployee;
                  const driver2 = plan.Employee_TripPlan_secondaryDriverIdToEmployee;
                  const driverText = [driver1?.fullName, driver2?.fullName].filter(Boolean).join(' + ') || '—';
                  const hasConfig = driver1 && plan.Vehicle && plan.scheduleDays?.length > 0;
                  return (
                    <tr key={plan.id}
                      className={selectedId === plan.id ? 'is-selected' : undefined}
                      onClick={() => { setSelectedId(plan.id); setActiveTab('info'); }}
                    >
                      <td style={{ color: 'var(--faint)' }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="cell-title">{plan.Customer?.name || '—'}</td>
                      <td className="truncate" style={{ maxWidth: 200 }} title={plan.Route?.name}>{plan.Route?.name || '—'}</td>
                      <td>{plan.Vehicle?.plateNumber ? <Plate>{plan.Vehicle.plateNumber}</Plate> : '—'}</td>
                      <td className="truncate" style={{ maxWidth: 180 }} title={driverText}>{driverText}</td>
                      <td>
                        <div className="flex gap-1 flex-wrap">
                          {[...(plan.scheduleDays || [])].sort((a: number, b: number) => a - b).map((d: number) => (
                            <Pill key={d} tone="brand" size="sm">{DAY_LABELS[d]}</Pill>
                          ))}
                          {(plan.timeSlots || []).map((s: string) => (
                            <Pill key={s} tone="warn" size="sm">{SLOT_LABELS.find((sl) => sl.key === s)?.label || s}</Pill>
                          ))}
                        </div>
                      </td>
                      <td className="center">
                        {hasConfig ? (
                          <span title="Đầy đủ" style={{ color: 'var(--success-text)' }}><CheckCircle2 className="inline w-4 h-4" aria-label="Đầy đủ" /></span>
                        ) : (
                          <span title="Thiếu thông tin" style={{ color: 'var(--warn-accent)' }}><AlertTriangle className="inline w-4 h-4" aria-label="Thiếu thông tin" /></span>
                        )}
                      </td>
                      <td className="center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleActive(plan.id, !plan.isActive)}
                          title={plan.isActive ? 'Đang bật — bấm để tắt' : 'Đang tắt — bấm để bật'}
                          aria-pressed={!!plan.isActive}
                        >
                          <StatusPill status={plan.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="foot">
            <span>{total} kế hoạch · {activeCount} đang hoạt động</span>
            <div className="pager">
              <button type="button" aria-label="Trang trước" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                <ChevronLeft />
              </button>
              <span className="self-center px-2">Trang {page} / {totalPages}</span>
              <button type="button" aria-label="Trang sau" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                <ChevronRight />
              </button>
            </div>
          </div>
        </Card>

        {/* Detail panel */}
        {panelOpen && isLg ? (
          <aside className="card flex flex-col shrink-0" style={{ width: 480 }}>
            {renderPanel(true)}
          </aside>
        ) : renderPanel(false)}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchList(); }}
        />
      )}
      {showGenerateModal && (
        <GenerateTripsModal
          onClose={() => setShowGenerateModal(false)}
          onGenerated={() => { setShowGenerateModal(false); fetchList(); }}
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
  const [customers, setCustomers] = useState<SearchableOption[]>([]);
  const [routes, setRoutes] = useState<SearchableOption[]>([]);
  const [vehicles, setVehicles] = useState<SearchableOption[]>([]);
  const [employees, setEmployees] = useState<SearchableOption[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/customers?pageSize=500'),
      api.get('/routes?pageSize=500'),
      api.get('/vehicles?pageSize=500'),
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
          <SearchableSelect options={customers} value={customerId} onChange={(v) => setCustomerId(String(v))} placeholder="Chọn khách hàng" />
        </Field>
        <Field label="Tuyến đường" required full>
          <SearchableSelect options={routes} value={routeId} onChange={(v) => setRouteId(String(v))} placeholder="Chọn tuyến" />
        </Field>
        <Field label="Phương tiện" required full>
          <SearchableSelect options={vehicles} value={vehicleId} onChange={(v) => handleVehicleChange(String(v))} placeholder="Chọn xe" />
        </Field>
        <Field label="Tài xế chính">
          <SearchableSelect options={employees} value={primaryDriverId} onChange={(v) => setPrimaryDriverId(String(v))} placeholder="Chọn tài xế" />
        </Field>
        <Field label="Tài xế phụ">
          <SearchableSelect options={employees} value={secondaryDriverId} onChange={(v) => setSecondaryDriverId(String(v))} placeholder="Chọn tài xế" />
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
