import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Download, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../shared/auth-context';
import api from '../../shared/api';
import { errorMessage } from '../../shared/format';
import { ServerDataTable } from '../../shared/components/ServerDataTable';
import type { RenderBodyContext, RowId, ServerDataTableApi } from '../../shared/components/ServerDataTable';
import { SearchableMultiSelect } from '../../shared/components/SearchableMultiSelect';
import type { MultiSelectOption } from '../../shared/components/SearchableMultiSelect';
import { Alert, Button, DateRange, PageHeader, STATUS_TONES } from '../../shared/ui';
import { CreateTripModal } from './CreateTripModal';
import { AttentionBanner } from './components/AttentionBanner';
import { BulkActionBar } from './components/BulkActionBar';
import { AssignVehicleModal } from './components/AssignVehicleModal';
import { TripDetailDrawer } from './components/TripDetailDrawer';
import { TripBody } from './components/TripTable';
import { TRIP_COLUMNS } from './components/trip-columns';
import type { TripViewMode } from './components/TripTable';
import { useTripDetail } from './components/useTripDetail';
import { downloadTripsCsv } from './components/export-csv';
import { BULK_LIMIT, TRIP_STATUSES, canTransition } from './components/trip-status-flow';
import type { TripStatus } from './components/trip-status-flow';
import type { TripRow } from './components/types';

const RAIL_STATUSES = ['PLANNED', 'DISPATCHED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];
const RAIL_LABELS: Record<string, string> = Object.fromEntries(RAIL_STATUSES.map((s) => [s, STATUS_TONES[s]?.label ?? s]));
const VIEW_MODES = [['grouped', 'Theo ngày'], ['flat', 'Danh sách']] as const;

/** Chuyến sắp chạy nhưng thiếu xe, tài xế hoặc nhà xe */
const needsAttention = (t: TripRow) =>
  (t.status === 'PLANNED' || t.status === 'DISPATCHED') &&
  (!t.Vehicle?.plateNumber || !t.primaryDriver || !t.Vehicle?.Supplier);

interface BulkResult { tone: 'success' | 'warn' | 'error'; message: string }

interface NamedRow { id: number; code?: string; name?: string; fullName?: string }
const toOptions = (rows: NamedRow[]): MultiSelectOption<number>[] =>
  rows.map((r) => ({ value: r.id, label: r.fullName || r.name || String(r.id), sublabel: r.code }));

export function TripListPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('trip', 'canEdit');
  const canDelete = hasPermission('trip', 'canDelete');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const tableRef = useRef<ServerDataTableApi>(null);
  const reload = useCallback(() => tableRef.current?.reload(), []);

  /* ── Filters ──────────────────────────────────────────────────── */
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [customerFilter, setCustomerFilter] = useState<number[]>([]);
  const [driverFilter, setDriverFilter] = useState<number[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<number[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [customerOptions, setCustomerOptions] = useState<MultiSelectOption<number>[]>([]);
  const [driverOptions, setDriverOptions] = useState<MultiSelectOption<number>[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<MultiSelectOption<number>[]>([]);

  useEffect(() => {
    // Lỗi tải danh sách lọc không chặn trang: ô chọn chỉ còn danh sách rỗng
    api.get('/customers?pageSize=200').then((r) => setCustomerOptions(toOptions(r.data.data))).catch(() => {});
    api.get('/employees?pageSize=100&isDriver=true').then((r) => setDriverOptions(toOptions(r.data.data))).catch(() => {});
    api.get('/suppliers?pageSize=200').then((r) => setSupplierOptions(toOptions(r.data.data))).catch(() => {});
  }, []);

  const filters = useMemo(() => ({
    status: statusFilter,
    customerId: customerFilter,
    driverId: driverFilter,
    supplierId: supplierFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [statusFilter, customerFilter, driverFilter, supplierFilter, dateFrom, dateTo]);

  /* ── Drawer ───────────────────────────────────────────────────── */
  const detailCtl = useTripDetail(reload);
  const openDetail = detailCtl.open;
  const handleRowClick = useCallback((row: TripRow) => openDetail(row.id), [openDetail]);

  /* ── Attention filter / view mode / grouping / selection ──────── */
  const [attnFilter, setAttnFilter] = useState(false);
  const [viewMode, setViewMode] = useState<TripViewMode>('grouped');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const toggleGroup = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  /** Dòng của trang hiện tại, do thân bảng báo lên (ServerDataTable không lộ dữ liệu) */
  const [pageRows, setPageRows] = useState<TripRow[]>([]);
  const [selected, setSelected] = useState<RowId[]>([]);

  const attnCount = useMemo(() => pageRows.filter(needsAttention).length, [pageRows]);
  const rowFilter = attnFilter ? needsAttention : undefined;
  const visibleRows = useMemo(() => (attnFilter ? pageRows.filter(needsAttention) : pageRows), [pageRows, attnFilter]);

  // Tập chọn chỉ có nghĩa với các dòng đang hiển thị: đổi trang / bộ lọc / tải lại → bỏ chọn,
  // trừ khi một thao tác hàng loạt yêu cầu giữ lại các chuyến lỗi (keepSelectionRef)
  const keepSelectionRef = useRef<RowId[] | null>(null);
  useEffect(() => {
    setSelected(keepSelectionRef.current ?? []);
    keepSelectionRef.current = null;
  }, [pageRows]);
  const selectedRows = useMemo(() => {
    const set = new Set(selected);
    return visibleRows.filter((r) => set.has(r.id));
  }, [visibleRows, selected]);

  /* ── Bulk actions: gọi tuần tự từng chuyến, gom kết quả ───────── */
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  /** Trạng thái đích hợp lệ với ít nhất một chuyến đã chọn */
  const statusTargets = useMemo(
    () => TRIP_STATUSES.filter((to) => selectedRows.some((r) => canTransition(r.status, to))),
    [selectedRows],
  );

  /**
   * Chạy `action` cho từng chuyến trong `rows`; gom lỗi vào một Alert.
   * Chuyến lỗi được giữ lại trong tập chọn để người dùng làm lại.
   */
  const runBulk = useCallback(async (label: string, rows: TripRow[], action: (row: TripRow) => Promise<void>, skipped: string[] = []) => {
    if (rows.length > BULK_LIMIT) {
      setBulkResult({ tone: 'warn', message: `Chỉ xử lý tối đa ${BULK_LIMIT} chuyến mỗi lần. Hãy bỏ bớt lựa chọn.` });
      return;
    }
    setBulkBusy(true);
    setBulkResult(null);
    const failures: string[] = [];
    const failedIds: number[] = [];
    for (const row of rows) {
      try { await action(row); } catch (err) { failures.push(`${row.tripCode}: ${errorMessage(err)}`); failedIds.push(row.id); }
    }
    const ok = rows.length - failures.length;
    const parts = [`${label}: ${ok} chuyến thành công`];
    if (skipped.length) parts.push(`${skipped.length} bỏ qua (${skipped.join(', ')})`);
    if (failures.length) parts.push(`${failures.length} lỗi — ${failures.join('; ')}`);
    setBulkResult({ tone: failures.length ? 'error' : skipped.length ? 'warn' : 'success', message: parts.join(' · ') + '.' });
    setBulkBusy(false);
    keepSelectionRef.current = failedIds.length ? failedIds : null;
    reload();
  }, [reload]);

  const bulkChangeStatus = useCallback((next: TripStatus) => {
    const label = `Đổi trạng thái → ${STATUS_TONES[next]?.label ?? next}`;
    const eligible = selectedRows.filter((r) => canTransition(r.status, next));
    const skipped = selectedRows.filter((r) => !canTransition(r.status, next)).map((r) => r.tripCode);
    if (eligible.length === 0) {
      setBulkResult({ tone: 'warn', message: `${label}: không chuyến nào đang ở trạng thái cho phép.` });
      return;
    }
    if (next === 'CANCELLED' && !confirm(`Hủy ${eligible.length} chuyến đã chọn?`)) return;
    void runBulk(label, eligible, (row) => api.patch(`/trips/${row.id}/status`, { status: next }).then(() => undefined), skipped);
  }, [runBulk, selectedRows]);

  const bulkAssignVehicle = useCallback(async (vehicleId: number) => {
    await runBulk('Gán xe', selectedRows, (row) => api.put(`/trips/${row.id}`, { vehicleId, version: row.version }).then(() => undefined));
    setAssignOpen(false);
  }, [runBulk, selectedRows]);

  const exportCsv = useCallback((rows: TripRow[]) => {
    if (rows.length === 0) { setBulkResult({ tone: 'warn', message: 'Không có chuyến nào để xuất.' }); return; }
    downloadTripsCsv(rows);
  }, []);

  const renderBody = useCallback((ctx: RenderBodyContext<TripRow>) => (
    <TripBody
      ctx={ctx}
      viewMode={viewMode}
      rowFilter={rowFilter}
      selectedId={detailCtl.selectedId}
      collapsed={collapsed}
      onToggleGroup={toggleGroup}
      onRows={setPageRows}
    />
  ), [viewMode, rowFilter, detailCtl.selectedId, collapsed, toggleGroup]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="page page-fill">
        <PageHeader
          title="Chuyến đi"
          description="Theo dõi, điều phối và cập nhật trạng thái các chuyến vận chuyển."
        />

        <AttentionBanner count={attnCount} filtering={attnFilter} onToggle={() => setAttnFilter((p) => !p)} />

        {bulkResult && (
          <Alert tone={bulkResult.tone}>
            <div className="flex items-start gap-3">
              <span className="flex-1">{bulkResult.message}</span>
              <button type="button" className="link" onClick={() => setBulkResult(null)}>Đóng</button>
            </div>
          </Alert>
        )}

        <ServerDataTable<TripRow>
          endpoint="/trips/dt"
          apiRef={tableRef}
          columns={TRIP_COLUMNS}
          filters={filters}
          density="comfortable"
          defaultLength={100}
          searchPlaceholder="Mã chuyến, khách hàng, tuyến, biển số..."
          emptyTitle="Không có chuyến phù hợp"
          rail={{ statuses: RAIL_STATUSES, value: statusFilter, onChange: setStatusFilter, labels: RAIL_LABELS }}
          toolbar={
            <>
              <SearchableMultiSelect mode="multi" size="sm" value={customerFilter} onChange={setCustomerFilter} options={customerOptions} placeholder="Khách hàng" searchPlaceholder="Tìm khách hàng..." aria-label="Lọc theo khách hàng" />
              <SearchableMultiSelect mode="multi" size="sm" value={supplierFilter} onChange={setSupplierFilter} options={supplierOptions} placeholder="Nhà xe" searchPlaceholder="Tìm nhà xe..." aria-label="Lọc theo nhà xe" />
              <SearchableMultiSelect mode="multi" size="sm" value={driverFilter} onChange={setDriverFilter} options={driverOptions} placeholder="Tài xế" searchPlaceholder="Tìm tài xế..." aria-label="Lọc theo tài xế" />
              <DateRange from={dateFrom} to={dateTo} icon={<Calendar />} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
              <div className="seg seg-sm" role="group" aria-label="Chế độ hiển thị">
                {VIEW_MODES.map(([mode, label]) => (
                  <button key={mode} type="button" aria-pressed={viewMode === mode}
                    className={clsx('seg-tab', viewMode === mode && 'is-active')} onClick={() => setViewMode(mode)}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          }
          actions={
            <>
              <Button size="sm" icon={<Download />} onClick={() => exportCsv(visibleRows)} title="Xuất các chuyến đang hiển thị ra CSV">Xuất CSV</Button>
              {canEdit && <Button variant="primary" size="sm" icon={<Plus />} onClick={() => setShowCreateModal(true)}>Tạo chuyến</Button>}
            </>
          }
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          selectedKey={detailCtl.selectedId}
          onRowClick={handleRowClick}
          renderBody={renderBody}
        />
      </div>

      {detailCtl.selectedId !== null && <TripDetailDrawer key={detailCtl.selectedId} ctl={detailCtl} canEdit={canEdit} canDelete={canDelete} />}

      {canEdit ? (
        <BulkActionBar
          count={selectedRows.length}
          busy={bulkBusy}
          statusTargets={statusTargets}
          onClear={() => setSelected([])}
          onAssignVehicle={() => setAssignOpen(true)}
          onChangeStatus={bulkChangeStatus}
          onExport={() => exportCsv(selectedRows)}
        />
      ) : null}

      <AssignVehicleModal isOpen={assignOpen} count={selectedRows.length} busy={bulkBusy} onClose={() => setAssignOpen(false)} onSubmit={bulkAssignVehicle} />

      <CreateTripModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={reload} />
    </div>
  );
}
