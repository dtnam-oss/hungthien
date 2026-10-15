import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { Plus } from 'lucide-react';
import api from '../../shared/api';
import { useAuth } from '../../shared/auth-context';
import { DataTable } from '../../shared/components/DataTable';
import type { Column } from '../../shared/components/DataTable';
import { DetailPanel } from '../../shared/components/DetailPanel';
import { ModalOverlay } from '../../shared/components/ModalOverlay';
import { FieldRow, EditFieldRow, EDIT_INPUT_CLASS, EDIT_SELECT_CLASS, EDIT_TEXTAREA_CLASS } from '../../shared/components/FieldRow';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import type { SearchableOption } from '../../shared/components/SearchableSelect';
import {
  PageHeader, Card, SubCard, Button, StatusPill, Alert, LoadingBlock, Field, FormGrid, Input, Select, Textarea,
} from '../../shared/ui';
import { formatMoney, formatDate, todayInputDate, errorMessage } from '../../shared/format';

/* ── Types ─────────────────────────────────────────────────────────── */

interface Pricing {
  id: number;
  version: number;
  customerId: number;
  routeId: number;
  tripType: string;
  unitPrice: string | number;
  currency: string;
  validFrom: string;
  validTo: string | null;
  status: string;
  priceType: string;
  notes: string | null;
  Customer?: { id: number; code: string; name: string };
  Route?: { id: number; code: string; name: string; origin: string | null; destination: string | null };
}

interface PricingEditForm {
  tripType: string;
  unitPrice: string | number;
  validFrom: string;
  validTo: string;
  status: string;
  notes: string;
  version: number;
}

interface PartyRecord { id: number; code: string; name: string }
interface RouteRecord extends PartyRecord { origin: string | null; destination: string | null }

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Đang áp dụng', INACTIVE: 'Ngừng sử dụng' };
const TRIP_LABELS: Record<string, string> = { STANDARD: 'Tiêu chuẩn', EXPRESS: 'Nhanh', SPECIAL: 'Đặc biệt' };

const TRIP_OPTIONS = Object.entries(TRIP_LABELS);

/* ── Component ─────────────────────────────────────────────────────── */

export function PricingListPage({ priceType = 'CUSTOMER' }: { priceType?: 'CUSTOMER' | 'SUPPLIER' }) {
  const isCustomer = priceType === 'CUSTOMER';
  const pageTitle = isCustomer ? 'Giá KH' : 'Giá bán NCC';
  const pageDesc = isCustomer ? 'Giá nhận từ khách hàng' : 'Giá bán lại cho nhà thầu phụ';

  const { hasPermission } = useAuth();
  const canEdit = hasPermission('pricing', 'canEdit');
  const canDelete = hasPermission('pricing', 'canDelete');

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Responsive
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsLg(e.matches);
    handler(mq);
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  // Panel
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Pricing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<PricingEditForm | null>(null);
  const [saving, setSaving] = useState(false);

  // Create
  const [showCreate, setShowCreate] = useState(false);

  const panelOpen = selectedId !== null;

  /* ── Load detail ─────────────────────────────────────────────────── */
  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await api.get<{ data: Pricing }>(`/pricing/${id}`);
      setDetail(res.data.data);
    } catch { setDetail(null); }
    setDetailLoading(false);
  }, []);

  const handleRowClick = useCallback((row: Pricing) => {
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
    if (!detail || !confirm('Xóa bảng giá này?')) return;
    try {
      await api.delete(`/pricing/${detail.id}`);
      handleClose();
      reload();
    } catch (err) {
      alert(errorMessage(err, 'Lỗi xóa'));
    }
  }, [detail, handleClose, reload]);

  /* ── Edit ─────────────────────────────────────────────────────────── */
  const handleToggleEdit = useCallback(() => {
    if (!isEditing && detail) {
      setEditForm({
        tripType: detail.tripType,
        unitPrice: detail.unitPrice,
        validFrom: detail.validFrom ? detail.validFrom.split('T')[0] : '',
        validTo: detail.validTo ? detail.validTo.split('T')[0] : '',
        status: detail.status,
        notes: detail.notes || '',
        version: detail.version,
      });
    }
    setIsEditing((prev) => !prev);
  }, [isEditing, detail]);

  const handleSave = useCallback(async () => {
    if (!detail || !editForm) return;
    setSaving(true);
    try {
      await api.put(`/pricing/${detail.id}`, editForm);
      setIsEditing(false);
      loadDetail(detail.id);
      reload();
    } catch (err) {
      alert(errorMessage(err, 'Lỗi lưu'));
    }
    setSaving(false);
  }, [detail, editForm, loadDetail, reload]);

  /* ── Columns ─────────────────────────────────────────────────────── */
  const columns: Column<Pricing>[] = [
    {
      key: 'Customer', label: isCustomer ? 'Khách hàng' : 'Nhà cung cấp', sortable: true,
      render: (row) => <span className="cell-title">{row.Customer?.name || '—'}</span>,
    },
    {
      key: 'Route', label: 'Tuyến', sortable: true,
      render: (row) => row.Route
        ? <><span className="code">{row.Route.code}</span> {row.Route.name}</>
        : '—',
    },
    {
      key: 'tripType', label: 'Loại', className: 'w-28 whitespace-nowrap hidden md:table-cell',
      render: (row) => TRIP_LABELS[row.tripType] || row.tripType,
    },
    {
      key: 'unitPrice', label: 'Đơn giá', className: 'w-36', align: 'right',
      render: (row) => <span className="money">{formatMoney(row.unitPrice)}</span>,
    },
    {
      key: 'validFrom', label: 'Hiệu lực', className: 'w-28 hidden lg:table-cell',
      render: (row) => formatDate(row.validFrom),
    },
    {
      key: 'status', label: 'Trạng thái', className: 'w-36',
      render: (row) => <StatusPill status={row.status} label={STATUS_LABELS[row.status]} />,
    },
  ];

  const panel = (inline: boolean) => (
    <DetailPanel
      isOpen={panelOpen}
      onClose={handleClose}
      title={detail ? `${detail.Customer?.name || ''} → ${detail.Route?.name || ''}` : 'Đang tải…'}
      subtitle={detail ? formatMoney(detail.unitPrice) : undefined}
      titleAddon={detail && <StatusPill status={detail.status} label={STATUS_LABELS[detail.status]} />}
      canEdit={canEdit}
      canDelete={canDelete}
      isEditing={isEditing}
      onToggleEdit={handleToggleEdit}
      onSave={handleSave}
      saving={saving}
      onDelete={handleDelete}
      inlineMode={inline}
    >
      {detailLoading ? (
        <LoadingBlock />
      ) : detail ? (
        <SubCard title="Thông tin giá">
          <div className="kv">
            <FieldRow label={isCustomer ? 'Khách hàng' : 'Nhà cung cấp'} value={detail.Customer?.name} full />
            <FieldRow label="Tuyến" value={detail.Route ? `${detail.Route.code} - ${detail.Route.name}` : null} full />
            {isEditing && editForm ? (
              <>
                <EditFieldRow label="Loại chuyến">
                  <select className={EDIT_SELECT_CLASS} value={editForm.tripType} onChange={(e) => setEditForm({ ...editForm, tripType: e.target.value })}>
                    {TRIP_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </EditFieldRow>
                <EditFieldRow label="Đơn giá">
                  <input className={EDIT_INPUT_CLASS} type="number" value={editForm.unitPrice} onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })} />
                </EditFieldRow>
                <EditFieldRow label="Hiệu lực từ">
                  <input className={EDIT_INPUT_CLASS} type="date" value={editForm.validFrom} onChange={(e) => setEditForm({ ...editForm, validFrom: e.target.value })} />
                </EditFieldRow>
                <EditFieldRow label="Hiệu lực đến">
                  <input className={EDIT_INPUT_CLASS} type="date" value={editForm.validTo} onChange={(e) => setEditForm({ ...editForm, validTo: e.target.value })} />
                </EditFieldRow>
                <EditFieldRow label="Trạng thái" full>
                  <select className={EDIT_SELECT_CLASS} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="ACTIVE">Đang áp dụng</option>
                    <option value="INACTIVE">Ngừng sử dụng</option>
                  </select>
                </EditFieldRow>
                <EditFieldRow label="Ghi chú" full>
                  <textarea className={EDIT_TEXTAREA_CLASS} rows={3} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                </EditFieldRow>
              </>
            ) : (
              <>
                <FieldRow label="Loại chuyến" value={TRIP_LABELS[detail.tripType] || detail.tripType} />
                <FieldRow label="Đơn giá" value={<span className="money">{formatMoney(detail.unitPrice)}</span>} strong />
                <FieldRow label="Hiệu lực từ" value={detail.validFrom ? formatDate(detail.validFrom) : null} />
                <FieldRow label="Hiệu lực đến" value={detail.validTo ? formatDate(detail.validTo) : 'Không giới hạn'} />
                <FieldRow label="Trạng thái" value={<StatusPill status={detail.status} label={STATUS_LABELS[detail.status]} />} full />
                <FieldRow label="Ghi chú" value={detail.notes} full />
              </>
            )}
          </div>
        </SubCard>
      ) : (
        <Alert tone="warn">Không tìm thấy thông tin</Alert>
      )}
    </DetailPanel>
  );

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="page page-fill">
      <PageHeader
        title={pageTitle}
        description={pageDesc}
        actions={canEdit && <Button variant="primary" icon={<Plus />} onClick={() => setShowCreate(true)}>Thêm mới</Button>}
      />

      <div className="flex flex-1 min-h-0 gap-4">
        <Card className="flex-1 min-w-0 flex flex-col">
          <DataTable<Pricing>
            key={`${priceType}-${reloadKey}`}
            endpoint="/pricing"
            columns={columns}
            searchPlaceholder={isCustomer ? 'Tìm KH, tuyến...' : 'Tìm NCC, tuyến...'}
            onRowClick={handleRowClick}
            rowKey="id"
            selectedKey={selectedId}
            extraParams={{ priceType }}
            emptyTitle="Chưa có bảng giá"
          />
        </Card>

        {panelOpen && isLg && (
          <aside className="card flex flex-col shrink-0" style={{ width: 480 }}>
            {panel(true)}
          </aside>
        )}
      </div>

      {panelOpen && !isLg && panel(false)}

      {showCreate && (
        <CreatePricingForm
          title={`Thêm ${pageTitle}`}
          priceType={priceType}
          onSuccess={() => { setShowCreate(false); reload(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

/* ── Create Form ───────────────────────────────────────────────────── */

function CreatePricingForm({ title, priceType, onSuccess, onCancel }: {
  title: string;
  priceType: 'CUSTOMER' | 'SUPPLIER';
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isCustomer = priceType === 'CUSTOMER';

  const [form, setForm] = useState({
    customerId: '' as string | number,
    routeId: '' as string | number,
    tripType: 'STANDARD',
    unitPrice: '',
    validFrom: todayInputDate(),
    validTo: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load options
  const [customerOptions, setCustomerOptions] = useState<SearchableOption[]>([]);
  const [routeOptions, setRouteOptions] = useState<SearchableOption[]>([]);

  useEffect(() => {
    // Load customers or suppliers based on priceType
    const endpoint = isCustomer ? '/customers?pageSize=500' : '/suppliers?pageSize=500';
    api.get<{ data?: PartyRecord[] }>(endpoint).then((res) => {
      const data = res.data.data || [];
      setCustomerOptions(data.map((c) => ({
        value: c.id,
        label: c.name,
        sublabel: c.code,
      })));
    }).catch(() => {});

    api.get<{ data?: RouteRecord[] }>('/routes?pageSize=500').then((res) => {
      const data = res.data.data || [];
      setRouteOptions(data.map((r) => ({
        value: r.id,
        label: `${r.code} - ${r.name}`,
        sublabel: r.origin && r.destination ? `${r.origin} → ${r.destination}` : undefined,
      })));
    }).catch(() => {});
  }, [isCustomer]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // PricingRow.customerId chỉ liên kết Customer; backend chưa có cột nhà cung cấp → chặn để không lưu nhầm KH có cùng id
    if (!isCustomer) {
      setError('Backend chưa hỗ trợ lưu giá theo nhà cung cấp (PricingRow chỉ có customerId). Cần bổ sung ở server trước.');
      return;
    }
    if (!form.customerId || !form.routeId || !form.unitPrice) {
      setError('Vui lòng nhập đầy đủ: KH/NCC, tuyến, đơn giá');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/pricing', {
        ...form,
        priceType,
        unitPrice: Number(form.unitPrice),
      });
      onSuccess();
    } catch (err) {
      setError(errorMessage(err, 'Lỗi tạo bảng giá'));
    }
    setLoading(false);
  };

  return (
    <ModalOverlay
      isOpen
      onClose={() => !loading && onCancel()}
      title={title}
      size="lg"
      footer={
        <>
          <Button onClick={onCancel} disabled={loading}>Hủy</Button>
          <Button variant="primary" type="submit" form="pricing-create-form" loading={loading}>Tạo bảng giá</Button>
        </>
      }
    >
      <form id="pricing-create-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}

        <FormGrid>
          <Field label={isCustomer ? 'Khách hàng' : 'Nhà cung cấp'} required full>
            <SearchableSelect
              options={customerOptions}
              value={form.customerId}
              onChange={(v) => setForm({ ...form, customerId: v })}
              placeholder={isCustomer ? 'Chọn khách hàng...' : 'Chọn nhà cung cấp...'}
            />
          </Field>
          <Field label="Tuyến đường" required full>
            <SearchableSelect
              options={routeOptions}
              value={form.routeId}
              onChange={(v) => setForm({ ...form, routeId: v })}
              placeholder="Chọn tuyến..."
            />
          </Field>
          <Field label="Loại chuyến">
            <Select value={form.tripType} onChange={(e) => setForm({ ...form, tripType: e.target.value })}>
              {TRIP_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Đơn giá (VNĐ)" required>
            <Input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder="VD: 5000000" />
          </Field>
          <Field label="Hiệu lực từ" required>
            <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
          </Field>
          <Field label="Hiệu lực đến">
            <Input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
          </Field>
          <Field label="Ghi chú" full>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </FormGrid>

        <Alert tone="info">
          Nếu đã có bảng giá ACTIVE cho cùng (KH/NCC + tuyến + loại), bảng giá cũ sẽ tự động chuyển <strong>Ngừng sử dụng</strong>.
        </Alert>
      </form>
    </ModalOverlay>
  );
}
