import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Download, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../shared/auth-context';
import { useServerTable } from '../../shared/hooks/useServerTable';
import type { ServerTableColumn } from '../../shared/hooks/useServerTable';
import api from '../../shared/api';
import { errorMessage } from '../../shared/format';
import { Alert, Button, Card, DateRange, PageHeader, Pagination, SearchBox, STATUS_TONES, Toolbar, ToolbarSpacer } from '../../shared/ui';
import { CreateTripModal } from './CreateTripModal';
import { TripFilterRail } from './components/TripFilterRail';
import type { RailOption } from './components/TripFilterRail';
import { AttentionBanner } from './components/AttentionBanner';
import { BulkActionBar } from './components/BulkActionBar';
import { AssignVehicleModal } from './components/AssignVehicleModal';
import { TripDetailDrawer } from './components/TripDetailDrawer';
import { TripTable } from './components/TripTable';
import type { TripViewMode } from './components/TripTable';
import { useTripDetail } from './components/useTripDetail';
import { downloadTripsCsv } from './components/export-csv';
import { BULK_LIMIT, TRIP_STATUSES, canTransition } from './components/trip-status-flow';
import type { TripStatus } from './components/trip-status-flow';
import type { TripRow } from './components/types';

/* Thứ tự cột PHẢI khớp SORTABLE_COLUMNS ở backend */
const SERVER_COLUMNS: ServerTableColumn[] = [
  { sortable: false }, // #
  { sortable: true },  // route
  { sortable: true },  // customer
  { sortable: true },  // plate
  { sortable: false }, // costCount
  { sortable: true },  // status
  { sortable: true },  // supplier
];

/** Chuyến sắp chạy nhưng thiếu xe, tài xế hoặc nhà xe */
const needsAttention = (t: TripRow) =>
  (t.status === 'PLANNED' || t.status === 'DISPATCHED') &&
  (!t.Vehicle?.plateNumber || !t.primaryDriver || !t.Vehicle?.Supplier);

interface BulkResult { tone: 'success' | 'warn' | 'error'; message: string }

export function TripListPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('trip', 'canEdit');
  const canDelete = hasPermission('trip', 'canDelete');
  const [showCreateModal, setShowCreateModal] = useState(false);

  /* ── Filters ──────────────────────────────────────────────────── */
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [customers, setCustomers] = useState<RailOption[]>([]);
  const [drivers, setDrivers] = useState<RailOption[]>([]);
  const [suppliers, setSuppliers] = useState<RailOption[]>([]);

  useEffect(() => {
    // Lỗi tải danh sách lọc không chặn trang: ô chọn chỉ còn mục "tất cả"
    api.get('/customers?pageSize=200').then((r) => setCustomers(r.data.data)).catch(() => {});
    api.get('/employees?pageSize=100&isDriver=true').then((r) => setDrivers(r.data.data)).catch(() => {});
    api.get('/suppliers?pageSize=200').then((r) => setSuppliers(r.data.data)).catch(() => {});
  }, []);

  /* ── Server table ─────────────────────────────────────────────── */
  const filters: Record<string, string | number | undefined> = {};
  if (statusFilter) filters.status = statusFilter;
  if (customerFilter) filters.customerId = Number(customerFilter);
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  if (driverFilter) filters.driverId = Number(driverFilter);
  if (supplierFilter) filters.supplierId = Number(supplierFilter);

  const table = useServerTable<TripRow>({
    endpoint: '/trips/dt',
    filters,
    columns: SERVER_COLUMNS,
    defaultLength: 100,
  });

  useEffect(() => {
    if (searchInput === table.search) return; // tránh gọi /dt lần 2 khi mới mở trang
    table.setSearch(searchInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  /* ── Drawer ───────────────────────────────────────────────────── */
  const detailCtl = useTripDetail(table.reload);

  /* ── Attention filter / view mode / selection ─────────────────── */
  const [attnFilter, setAttnFilter] = useState(false);
  const [viewMode, setViewMode] = useState<TripViewMode>('grouped');
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const attnCount = useMemo(() => table.data.filter(needsAttention).length, [table.data]);
  const visibleRows = useMemo(
    () => (attnFilter ? table.data.filter(needsAttention) : table.data),
    [table.data, attnFilter],
  );

  // Tập chọn chỉ có nghĩa với các dòng đang hiển thị: đổi trang / bộ lọc / tải lại → bỏ chọn,
  // trừ khi một thao tác hàng loạt yêu cầu giữ lại các chuyến lỗi (keepSelectionRef)
  const keepSelectionRef = useRef<Set<number> | null>(null);
  useEffect(() => {
    setChecked(keepSelectionRef.current ?? new Set());
    keepSelectionRef.current = null;
  }, [table.data]);
  const selectedRows = useMemo(() => visibleRows.filter((r) => checked.has(r.id)), [visibleRows, checked]);

  const toggleCheck = useCallback((id: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const toggleCheckAll = useCallback(() => {
    setChecked(selectedRows.length === visibleRows.length ? new Set() : new Set(visibleRows.map((r) => r.id)));
  }, [selectedRows.length, visibleRows]);

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
    const failedIds = new Set<number>();
    for (const row of rows) {
      try { await action(row); } catch (err) { failures.push(`${row.tripCode}: ${errorMessage(err)}`); failedIds.add(row.id); }
    }
    const ok = rows.length - failures.length;
    const parts = [`${label}: ${ok} chuyến thành công`];
    if (skipped.length) parts.push(`${skipped.length} bỏ qua (${skipped.join(', ')})`);
    if (failures.length) parts.push(`${failures.length} lỗi — ${failures.join('; ')}`);
    setBulkResult({ tone: failures.length ? 'error' : skipped.length ? 'warn' : 'success', message: parts.join(' · ') + '.' });
    setBulkBusy(false);
    keepSelectionRef.current = failedIds.size ? failedIds : null;
    table.reload();
  }, [table]);

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

  const rangeLabel = table.recordsFiltered > 0
    ? `Hiển thị ${table.start + 1}–${Math.min(table.start + table.length, table.recordsFiltered)} / ${table.recordsFiltered.toLocaleString('vi-VN')} kết quả`
    : '0 kết quả';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="page pb-24">
          <PageHeader
            title="Chuyến đi"
            description="Theo dõi, điều phối và cập nhật trạng thái các chuyến vận chuyển."
            actions={
              <>
                <Button icon={<Download />} onClick={() => exportCsv(visibleRows)} title="Xuất các chuyến đang hiển thị ra CSV">Xuất CSV</Button>
                {canEdit && <Button variant="primary" icon={<Plus />} onClick={() => setShowCreateModal(true)}>Tạo chuyến</Button>}
              </>
            }
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

          {/* Workspace: rail lọc trái · bảng giữa · drawer phải (overlay) */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <TripFilterRail
              stats={table.statusStats}
              total={table.recordsFiltered}
              status={statusFilter}
              onStatusChange={setStatusFilter}
              customers={customers}
              drivers={drivers}
              suppliers={suppliers}
              customer={customerFilter}
              driver={driverFilter}
              supplier={supplierFilter}
              onCustomerChange={setCustomerFilter}
              onDriverChange={setDriverFilter}
              onSupplierChange={setSupplierFilter}
            />

            <Card className="min-w-0 flex-1 overflow-hidden">
              <Toolbar>
                <span className="card-title" style={{ flexGrow: 0 }}>Danh sách chuyến đi</span>
                <ToolbarSpacer />
                <SearchBox value={searchInput} onChange={setSearchInput} width={280} placeholder="Mã chuyến, khách hàng, tuyến, biển số..." />
                <DateRange from={dateFrom} to={dateTo} icon={<Calendar />} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
                <div className="seg seg-sm" role="group" aria-label="Chế độ hiển thị">
                  {([['grouped', 'Theo ngày'], ['flat', 'Danh sách']] as const).map(([mode, label]) => (
                    <button key={mode} type="button" aria-pressed={viewMode === mode}
                      className={clsx('seg-tab', viewMode === mode && 'is-active')} onClick={() => setViewMode(mode)}>
                      {label}
                    </button>
                  ))}
                </div>
              </Toolbar>

              <TripTable
                rows={visibleRows}
                loading={table.loading}
                error={table.error}
                viewMode={viewMode}
                selectedId={detailCtl.selectedId}
                checked={checked}
                startIndex={table.start + 1}
                onOpen={detailCtl.open}
                onToggleCheck={toggleCheck}
                onToggleCheckAll={toggleCheckAll}
              />

              <div className="foot">
                <span className="tabular-nums">{rangeLabel}</span>
                <Pagination page={table.currentPage} totalPages={table.totalPages} onChange={table.setPage} />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {detailCtl.selectedId !== null && <TripDetailDrawer key={detailCtl.selectedId} ctl={detailCtl} canEdit={canEdit} canDelete={canDelete} />}

      {canEdit ? (
        <BulkActionBar
          count={selectedRows.length}
          busy={bulkBusy}
          statusTargets={statusTargets}
          onClear={() => setChecked(new Set())}
          onAssignVehicle={() => setAssignOpen(true)}
          onChangeStatus={bulkChangeStatus}
          onExport={() => exportCsv(selectedRows)}
        />
      ) : null}

      <AssignVehicleModal isOpen={assignOpen} count={selectedRows.length} busy={bulkBusy} onClose={() => setAssignOpen(false)} onSubmit={bulkAssignVehicle} />

      <CreateTripModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={table.reload} />
    </div>
  );
}
