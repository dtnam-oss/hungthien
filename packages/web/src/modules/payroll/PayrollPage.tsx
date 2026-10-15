import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { Plus, Trash2, Check, Lock, Unlock, RefreshCw, Calculator, AlertTriangle, CalendarDays } from 'lucide-react';
import api from '../../shared/api';
import { useAuth } from '../../shared/auth-context';
import { formatMoney, errorMessage } from '../../shared/format';
import { ModalOverlay } from '../../shared/components/ModalOverlay';
import {
  Button, IconButton, Input, Select, Textarea, Field, FormGrid, FilterSelect,
  PageHeader, Card, CardHeader, Toolbar, ToolbarSpacer,
  Pill, StatusPill, STATUS_TONES, SegmentedTabs, Alert, LoadingBlock, EmptyState, StatCard,
} from '../../shared/ui';
import type { StatTone } from '../../shared/ui';

/* ── Types ─────────────────────────────────────────────────────────── */

interface Region { id: number; code: string; name: string }

interface Period {
  id: number; month: number; year: number; type: string; mode: string;
  regionId: number | null; status: string; notes: string | null;
  confirmedAt: string | null; paidAt: string | null; version: number;
  Region?: Region | null;
  _count?: { PayrollEntry: number };
}

interface Entry {
  id: number; periodId: number; employeeId: number;
  totalIncome: string | number; totalDeduction: string | number; netPay: string | number;
  notes: string | null;
  Employee: { id: number; code: string; fullName: string; position: string | null; salaryType: string; baseSalary: string | number };
  _count: { PayrollLine: number };
}

interface PayrollLine {
  id: number; entryId: number; category: string; lineType: string;
  description: string | null; amount: string | number; source: string;
  tripId: number | null; tripDate: string | null;
  Trip?: { id: number; tripCode: string } | null;
}

interface PeriodDiff { hasDiff: boolean; diffs: unknown[] }

/* Trạng thái kỳ lương (DRAFT / CONFIRMED / PAID): màu + nhãn lấy từ STATUS_TONES dùng chung */
const TYPE_MAP: Record<string, string> = { DRIVER: 'Tài xế', OFFICE: 'Văn phòng' };
const LINE_TYPE_LABELS: Record<string, string> = {
  TRIP_SALARY: 'Lương chuyến', DAILY_SALARY: 'Lương khoán ngày', BASE_SALARY: 'Lương cơ bản',
  ADVANCE: 'Tạm ứng', BONUS: 'Thưởng',
  FUEL_RECOVERY: 'Truy thu dầu', ONTIME_RECOVERY: 'Truy thu ontime', DEPOSIT: 'Trừ cọc',
  ADVANCE_FEE: 'Phí tạm ứng', PENALTY: 'Phạt chế tài', VETC_RECOVERY: 'Truy thu VETC',
  TRAFFIC_FINE: 'Phạt nguội', CARD_FEE: 'Tiền làm thẻ', INSURANCE: 'BHXH', OTHER: 'Khác',
};

const money = (v: string | number | null | undefined) => formatMoney(v ?? 0);

const TAB_KEYS = ['periods', 'summary', 'detail', 'bonus', 'attendance'] as const;
type TabKey = typeof TAB_KEYS[number];
const TAB_LABELS: Record<TabKey, string> = {
  periods: 'Quản lý kỳ', summary: 'Tổng hợp', detail: 'Chi tiết',
  bonus: 'Thưởng/phạt', attendance: 'Chấm công',
};
const TAB_ITEMS = TAB_KEYS.map((key) => ({ key, label: TAB_LABELS[key] }));

function PeriodStatusPill({ status }: { status: string }) {
  return <StatusPill status={status} />;
}

function LineTypePill({ line }: { line: PayrollLine }) {
  return (
    <Pill tone={line.category === 'INCOME' ? 'success' : 'danger'} size="sm">
      {LINE_TYPE_LABELS[line.lineType] || line.lineType}
    </Pill>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────── */

export function PayrollPage() {
  const [tab, setTab] = useState<TabKey>('periods');
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);

  const handleSelectPeriod = useCallback((p: Period) => {
    setSelectedPeriod(p);
    setTab('summary');
  }, []);

  return (
    <div className="page">
      <PageHeader
        title="Bảng lương"
        description={selectedPeriod && (
          <>
            Kỳ: {selectedPeriod.month}/{selectedPeriod.year} — {TYPE_MAP[selectedPeriod.type]} — {STATUS_TONES[selectedPeriod.status]?.label ?? selectedPeriod.status}
            {selectedPeriod.Region && ` — ${selectedPeriod.Region.name}`}
          </>
        )}
        actions={selectedPeriod && (
          <Button variant="ghost" size="sm" onClick={() => { setSelectedPeriod(null); setTab('periods'); }}>← Về danh sách</Button>
        )}
      />

      <SegmentedTabs tabs={TAB_ITEMS} active={tab} onChange={(k) => setTab(k as TabKey)} ariaLabel="Bảng lương" />

      {tab === 'periods' && <PeriodTab onSelect={handleSelectPeriod} selectedId={selectedPeriod?.id} />}
      {tab === 'summary' && <SummaryTab period={selectedPeriod} />}
      {tab === 'detail' && <DetailTab period={selectedPeriod} />}
      {tab === 'bonus' && <BonusPenaltyTab period={selectedPeriod} />}
      {tab === 'attendance' && <AttendanceTab period={selectedPeriod} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 1: Period Management
   ═══════════════════════════════════════════════════════════════════ */

function PeriodTab({ onSelect, selectedId }: { onSelect: (p: Period) => void; selectedId?: number }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('payroll', 'canEdit');
  const canDelete = hasPermission('payroll', 'canDelete');
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll/periods', { params: { year: yearFilter } });
      setPeriods(res.data.data || []);
    } catch { setPeriods([]); }
    setLoading(false);
  }, [yearFilter]);

  useEffect(() => { load(); }, [load]);

  // Hành động không hoàn tác được (chi tiền: server không cho mở lại) → hỏi trước
  const CONFIRM_TEXT: Record<string, string> = {
    calculate: 'Tính lại bảng lương kỳ này? Số liệu đã chỉnh tay có thể bị ghi đè.',
    confirm: 'Duyệt kỳ lương này?',
    pay: 'Xác nhận đã chi tiền? Kỳ lương sẽ bị khóa và không thể mở lại.',
  };

  const action = async (id: number, path: string, method = 'post') => {
    if (method === 'post' && CONFIRM_TEXT[path] && !confirm(CONFIRM_TEXT[path])) return;
    setActionLoading(id);
    try {
      if (method === 'delete') await api.delete(`/payroll/periods/${id}`);
      else await api.post(`/payroll/periods/${id}/${path}`);
      load();
    } catch (err) { alert(errorMessage(err, 'Lỗi')); }
    setActionLoading(null);
  };

  return (
    <>
      <Card>
        <Toolbar>
          <FilterSelect value={String(yearFilter)} onChange={(v) => setYearFilter(Number(v))} aria-label="Năm">
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </FilterSelect>
          <ToolbarSpacer />
          {canEdit && (
            <Button variant="primary" icon={<Plus />} onClick={() => setShowCreate(true)}>Tạo kỳ lương</Button>
          )}
        </Toolbar>

        {loading ? (
          <LoadingBlock />
        ) : periods.length === 0 ? (
          <div className="tbl-empty">Chưa có kỳ lương nào trong năm {yearFilter}</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl tbl-hover tbl-click">
              <thead>
                <tr>
                  <th>Kỳ</th>
                  <th>Loại</th>
                  <th>Khu vực</th>
                  <th>Chế độ</th>
                  <th className="center">NS</th>
                  <th className="center">Trạng thái</th>
                  <th className="num">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id} className={selectedId === p.id ? 'is-selected' : undefined} onClick={() => onSelect(p)}>
                    <td className="cell-title">{`T${p.month}/${p.year}`}</td>
                    <td>{TYPE_MAP[p.type] || p.type}</td>
                    <td>{p.Region?.name || '—'}</td>
                    <td>{p.mode === 'AUTO' ? 'Tự động' : 'Nhập tay'}</td>
                    <td className="center">{p._count?.PayrollEntry || 0}</td>
                    <td className="center"><PeriodStatusPill status={p.status} /></td>
                    <td className="num" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && p.status === 'DRAFT' && p.mode === 'AUTO' && (
                          <IconButton size="sm" tone="brand" label="Tính lại" loading={actionLoading === p.id} onClick={() => action(p.id, 'calculate')}><Calculator /></IconButton>
                        )}
                        {canEdit && p.status === 'DRAFT' && (
                          <IconButton size="sm" label="Làm mới DS" disabled={actionLoading === p.id} onClick={() => action(p.id, 'refresh-roster')}><RefreshCw /></IconButton>
                        )}
                        {canEdit && p.status === 'DRAFT' && (
                          <IconButton size="sm" label="Duyệt" disabled={actionLoading === p.id} onClick={() => action(p.id, 'confirm')}><Check /></IconButton>
                        )}
                        {canEdit && p.status === 'CONFIRMED' && (
                          <>
                            <IconButton size="sm" label="Chi tiền" disabled={actionLoading === p.id} onClick={() => action(p.id, 'pay')}><Lock /></IconButton>
                            <IconButton size="sm" label="Mở lại" disabled={actionLoading === p.id} onClick={() => action(p.id, 'reopen')}><Unlock /></IconButton>
                          </>
                        )}
                        {canDelete && p.status === 'DRAFT' && (
                          <IconButton size="sm" tone="danger" label="Xoá" disabled={actionLoading === p.id} onClick={() => { if (confirm('Xoá kỳ lương?')) action(p.id, '', 'delete'); }}><Trash2 /></IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreate && <CreatePeriodModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </>
  );
}

/* ── Create Period Modal ─────────────────────────────────────────── */

function CreatePeriodModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), type: 'DRIVER', mode: 'MANUAL', regionId: '', notes: '' });
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/payroll/regions').then((r) => setRegions(r.data.data || [])).catch(() => {});
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/payroll/periods', { ...form, regionId: form.regionId ? Number(form.regionId) : null });
      onCreated();
    } catch (err) { alert(errorMessage(err, 'Lỗi')); }
    setLoading(false);
  };

  return (
    <ModalOverlay
      onClose={onClose}
      title="Tạo kỳ lương"
      size="sm"
      footer={(
        <>
          <Button onClick={onClose}>Hủy</Button>
          <Button variant="primary" type="submit" form="create-period-form" loading={loading}>Tạo kỳ</Button>
        </>
      )}
    >
      <form id="create-period-form" onSubmit={submit}>
        <FormGrid>
          <Field label="Tháng">
            <Select value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>Tháng {m}</option>)}
            </Select>
          </Field>
          <Field label="Năm">
            <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
          </Field>
          <Field label="Loại">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="DRIVER">Tài xế</option>
              <option value="OFFICE">Văn phòng</option>
            </Select>
          </Field>
          <Field label="Chế độ tính">
            <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="MANUAL">Nhập tay</option>
              <option value="AUTO">Tự động</option>
            </Select>
          </Field>
          <Field label="Khu vực" full>
            <Select value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })}>
              <option value="">— Tất cả —</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label="Ghi chú" full>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </FormGrid>
      </form>
    </ModalOverlay>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 2: Summary — mỗi NV 1 dòng
   ═══════════════════════════════════════════════════════════════════ */

function SummaryTab({ period }: { period: Period | null }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<PeriodDiff | null>(null);

  const load = useCallback(async () => {
    if (!period) return;
    setLoading(true);
    try {
      const res = await api.get('/payroll/entries', { params: { periodId: period.id } });
      setEntries(res.data.data || []);
    } catch { setEntries([]); }
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const checkDiff = async () => {
    if (!period) return;
    try {
      const res = await api.get(`/payroll/periods/${period.id}/diff`);
      setDiff(res.data.data);
    } catch { setDiff(null); }
  };

  if (!period) return <NoPeriodSelected />;

  const totalIncome = entries.reduce((s, e) => s + Number(e.totalIncome), 0);
  const totalDeduction = entries.reduce((s, e) => s + Number(e.totalDeduction), 0);
  const totalNet = entries.reduce((s, e) => s + Number(e.netPay), 0);
  const stats: { label: string; value: string; tone: StatTone }[] = [
    { label: 'Nhân sự', value: String(entries.length), tone: 'default' },
    { label: 'Tổng thu nhập', value: money(totalIncome), tone: 'info' },
    { label: 'Tổng khấu trừ', value: money(totalDeduction), tone: 'danger' },
    { label: 'Thực lãnh', value: money(totalNet), tone: 'success' },
  ];

  return (
    <>
      {diff && diff.hasDiff && (
        <Alert tone="warn">
          <p style={{ fontWeight: 600 }}>Lương tự động lệch so với số đã chốt</p>
          <p style={{ fontSize: 12 }}>{diff.diffs.length} nhân sự có chênh lệch</p>
        </Alert>
      )}

      <div className="stat-grid">
        {stats.map((s) => <StatCard key={s.label} label={s.label} value={s.value} tone={s.tone} />)}
      </div>

      {(period.status === 'CONFIRMED' || period.status === 'PAID') && (
        <div>
          <Button variant="ghost" size="sm" icon={<AlertTriangle />} onClick={checkDiff}>Xem chênh lệch</Button>
        </div>
      )}

      <Card>
        {loading ? (
          <LoadingBlock />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl tbl-hover">
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th className="hidden md:table-cell">Chức vụ</th>
                  <th className="num">Thu nhập</th>
                  <th className="num">Khấu trừ</th>
                  <th className="num">Thực lãnh</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="cell-mono">{e.Employee.code}</td>
                    <td className="cell-title">{e.Employee.fullName}</td>
                    <td className="hidden md:table-cell" style={{ color: 'var(--muted)' }}>{e.Employee.position || '—'}</td>
                    <td className="num mono text-success">{money(e.totalIncome)}</td>
                    <td className="num mono text-danger">{money(e.totalDeduction)}</td>
                    <td className="num mono cell-title">{money(e.netPay)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Tổng cộng</td>
                  <td className="num mono">{money(totalIncome)}</td>
                  <td className="num mono">{money(totalDeduction)}</td>
                  <td className="num mono">{money(totalNet)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 3: Detail — line items per employee
   ═══════════════════════════════════════════════════════════════════ */

function DetailTab({ period }: { period: Period | null }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('payroll', 'canEdit');
  const isDraft = period?.status === 'DRAFT';

  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<number | null>(null);
  const [lines, setLines] = useState<PayrollLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!period) return;
    setLoading(true);
    try {
      const res = await api.get('/payroll/entries', { params: { periodId: period.id } });
      setEntries(res.data.data || []);
    } catch { setEntries([]); }
    setLoading(false);
  }, [period]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const loadLines = useCallback(async (entryId: number) => {
    setLineLoading(true);
    try {
      const res = await api.get(`/payroll/entries/${entryId}`);
      setLines(res.data.data?.PayrollLine || []);
    } catch { setLines([]); }
    setLineLoading(false);
  }, []);

  const handleSelectEntry = (id: number) => {
    setSelectedEntry(id);
    loadLines(id);
  };

  const handleDeleteLine = async (lineId: number) => {
    if (!confirm('Xoá dòng lương này?')) return;
    try {
      await api.delete(`/payroll/lines/${lineId}`);
      if (selectedEntry) loadLines(selectedEntry);
      loadEntries();
    } catch (err) { alert(errorMessage(err, 'Lỗi')); }
  };

  if (!period) return <NoPeriodSelected />;

  const showActions = canEdit && isDraft;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Employee list */}
        <Card className="lg:col-span-1">
          <CardHeader title="Nhân sự" />
          {loading ? (
            <LoadingBlock minHeight={96} />
          ) : (
            <div className="tbl-wrap" style={{ maxHeight: 384 }}>
              <table className="tbl tbl-hover tbl-click">
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className={selectedEntry === e.id ? 'is-selected' : undefined} onClick={() => handleSelectEntry(e.id)}>
                      <td>
                        <div className="cell-title">{e.Employee.fullName}</div>
                        <div className="cell-sub">{e.Employee.code} · {e._count.PayrollLine} dòng · {money(e.netPay)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Lines detail */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Chi tiết lương"
            actions={showActions && selectedEntry ? (
              <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => setShowAddLine(true)}>Thêm dòng</Button>
            ) : undefined}
          />
          {!selectedEntry ? (
            <EmptyState compact title="Chọn nhân sự bên trái" />
          ) : lineLoading ? (
            <LoadingBlock minHeight={96} />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl tbl-compact">
                <thead>
                  <tr>
                    <th>Loại</th>
                    <th>Mô tả</th>
                    <th className="num">Số tiền</th>
                    <th className="center">Nguồn</th>
                    {showActions && <th style={{ width: 40 }} />}
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr><td colSpan={5} className="tbl-empty">Chưa có dòng lương</td></tr>
                  ) : lines.map((l) => (
                    <tr key={l.id}>
                      <td><LineTypePill line={l} /></td>
                      <td>
                        {l.description || '—'}
                        {l.Trip && <span className="mono" style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>({l.Trip.tripCode})</span>}
                      </td>
                      <td className={`num mono cell-title ${l.category === 'INCOME' ? 'text-success' : 'text-danger'}`}>
                        {l.category === 'DEDUCTION' ? '-' : ''}{money(l.amount)}
                      </td>
                      <td className="center">
                        <Pill size="sm" tone={l.source === 'AUTO' ? 'info' : 'outline'}>{l.source}</Pill>
                      </td>
                      {showActions && (
                        <td>
                          <IconButton size="sm" tone="danger" label="Xoá dòng" onClick={() => handleDeleteLine(l.id)}><Trash2 /></IconButton>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {showAddLine && selectedEntry && (
        <AddLineModal entryId={selectedEntry} onClose={() => setShowAddLine(false)} onAdded={() => { setShowAddLine(false); loadLines(selectedEntry); loadEntries(); }} />
      )}
    </>
  );
}

/* ── Add Line Modal ──────────────────────────────────────────────── */

function AddLineModal({ entryId, onClose, onAdded }: { entryId: number; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ category: 'INCOME', lineType: 'BONUS', description: '', amount: '' });
  const [loading, setLoading] = useState(false);

  const incomeTypes = ['TRIP_SALARY', 'DAILY_SALARY', 'BASE_SALARY', 'ADVANCE', 'BONUS'];
  const deductionTypes = ['FUEL_RECOVERY', 'ONTIME_RECOVERY', 'DEPOSIT', 'ADVANCE_FEE', 'PENALTY', 'VETC_RECOVERY', 'TRAFFIC_FINE', 'CARD_FEE', 'INSURANCE', 'OTHER'];
  const types = form.category === 'INCOME' ? incomeTypes : deductionTypes;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.amount) { alert('Nhập số tiền'); return; }
    setLoading(true);
    try {
      await api.post(`/payroll/entries/${entryId}/lines`, { ...form, amount: Number(form.amount) });
      onAdded();
    } catch (err) { alert(errorMessage(err, 'Lỗi')); }
    setLoading(false);
  };

  return (
    <ModalOverlay
      onClose={onClose}
      title="Thêm dòng lương"
      size="sm"
      footer={(
        <>
          <Button onClick={onClose}>Hủy</Button>
          <Button variant="primary" type="submit" form="add-line-form" loading={loading}>Thêm</Button>
        </>
      )}
    >
      <form id="add-line-form" onSubmit={submit}>
        <FormGrid>
          <Field label="Danh mục">
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value, lineType: e.target.value === 'INCOME' ? 'BONUS' : 'OTHER' })}
            >
              <option value="INCOME">Thu nhập</option>
              <option value="DEDUCTION">Khấu trừ</option>
            </Select>
          </Field>
          <Field label="Loại khoản">
            <Select value={form.lineType} onChange={(e) => setForm({ ...form, lineType: e.target.value })}>
              {types.map((t) => <option key={t} value={t}>{LINE_TYPE_LABELS[t] || t}</option>)}
            </Select>
          </Field>
          <Field label="Mô tả" full>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Số tiền (VNĐ)" full>
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="VD: 500000" />
          </Field>
        </FormGrid>
      </form>
    </ModalOverlay>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 4: Bonus/Penalty
   ═══════════════════════════════════════════════════════════════════ */

function BonusPenaltyTab({ period }: { period: Period | null }) {
  const [allLines, setAllLines] = useState<(PayrollLine & { employeeName: string })[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!period) return;
    setLoading(true);
    try {
      const res = await api.get('/payroll/entries', { params: { periodId: period.id } });
      const entryList: Entry[] = res.data.data || [];

      const linePromises = entryList.map(async (e) => {
        const r = await api.get(`/payroll/entries/${e.id}`);
        const lines: PayrollLine[] = r.data.data?.PayrollLine || [];
        return lines
          .filter((l) => ['BONUS', 'PENALTY', 'ADVANCE'].includes(l.lineType) || l.source === 'TOUR')
          .map((l) => ({ ...l, employeeName: e.Employee.fullName }));
      });
      const result = (await Promise.all(linePromises)).flat();
      setAllLines(result);
    } catch { setAllLines([]); }
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (!period) return <NoPeriodSelected />;

  return (
    <Card>
      <CardHeader title="Thưởng / Phạt / Tạm ứng" />
      {loading ? (
        <LoadingBlock />
      ) : allLines.length === 0 ? (
        <div className="tbl-empty">Chưa có khoản thưởng/phạt trong kỳ</div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl tbl-hover">
            <thead>
              <tr>
                <th>Nhân sự</th>
                <th>Loại</th>
                <th>Mô tả</th>
                <th className="num">Số tiền</th>
                <th className="center">Nguồn</th>
              </tr>
            </thead>
            <tbody>
              {allLines.map((l) => (
                <tr key={l.id}>
                  <td className="cell-title">{l.employeeName}</td>
                  <td><LineTypePill line={l} /></td>
                  <td style={{ color: 'var(--muted)' }}>{l.description || '—'}</td>
                  <td className="num mono cell-title">{money(l.amount)}</td>
                  <td className="center" style={{ fontSize: 12, color: 'var(--muted)' }}>{l.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 5: Attendance (placeholder)
   ═══════════════════════════════════════════════════════════════════ */

function AttendanceTab({ period }: { period: Period | null }) {
  if (!period) return <NoPeriodSelected />;
  return (
    <Card>
      <EmptyState
        icon={<CalendarDays />}
        title="Chấm công"
        description="Tính năng đang phát triển — đối chiếu công thực tế (kỳ văn phòng)"
      />
    </Card>
  );
}

/* ── Shared helpers ──────────────────────────────────────────────── */

function NoPeriodSelected() {
  return (
    <Card>
      <EmptyState title={'Chọn kỳ lương từ tab "Quản lý kỳ" trước'} />
    </Card>
  );
}
