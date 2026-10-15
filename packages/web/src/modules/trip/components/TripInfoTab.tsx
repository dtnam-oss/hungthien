/* Tab "Thông tin" của drawer: xem (lộ trình, tài chính, tài xế, chi tiết) hoặc sửa */

import { Lock } from 'lucide-react';
import { SubCard, STATUS_TONES } from '../../../shared/ui';
import { SearchableMultiSelect } from '../../../shared/components/SearchableMultiSelect';
import { EditFieldRow, FieldRow, EDIT_INPUT_CLASS, EDIT_TEXTAREA_CLASS } from '../../../shared/components/FieldRow';
import { formatDate, formatMoney } from '../../../shared/format';
import { TRIP_STATUSES, canTransition } from './trip-status-flow';
import type { TripDetailData, TripEditForm } from './types';

interface Props {
  detail: TripDetailData;
  isEditing: boolean;
  editForm: TripEditForm | null;
  onPatch: (patch: Partial<TripEditForm>) => void;
}

const dash = (v: string | null | undefined) => v || '—';

export function TripInfoTab({ detail, isEditing, editForm, onPatch }: Props) {
  const costTotal = detail.TripCost?.reduce((a, c) => a + Number(c.amount), 0) ?? 0;
  const revenue = Number(detail.revenue) || 0;
  const profit = revenue - costTotal;

  const lockedBanner = detail.isLocked && (
    <div className="alert alert-error"><Lock />Chuyến thuộc kỳ đã khóa sổ — không thể chỉnh sửa</div>
  );

  if (isEditing && editForm) {
    const text = (field: keyof TripEditForm, type = 'text', placeholder?: string) => (
      <input
        type={type} className={EDIT_INPUT_CLASS} placeholder={placeholder}
        value={String(editForm[field] ?? '')}
        onChange={(e) => onPatch({ [field]: e.target.value })}
      />
    );
    return (
      <>
        {lockedBanner}
        <SubCard title="Chỉnh sửa chuyến">
          <div className="kv">
            <EditFieldRow label="Ngày">{text('tripDate', 'date')}</EditFieldRow>
            <EditFieldRow label="Loại">{text('tripType', 'text', 'VD: nội thành')}</EditFieldRow>
            <EditFieldRow label="Trạng thái">
              <SearchableMultiSelect
                mode="single" searchable="auto" size="sm" allowClear={false} aria-label="Trạng thái"
                value={editForm.status}
                onChange={(v) => { if (v) onPatch({ status: String(v) }); }}
                options={TRIP_STATUSES.filter((s) => s === detail.status || canTransition(detail.status, s)).map((s) => ({ value: s, label: STATUS_TONES[s]?.label ?? s }))}
              />
            </EditFieldRow>
            <EditFieldRow label="Doanh thu">{text('revenue', 'number', '0')}</EditFieldRow>
            <EditFieldRow label="Đơn giá">{text('unitPrice', 'number', '0')}</EditFieldRow>
            <EditFieldRow label="Tải trọng (tấn)">{text('cargoWeight', 'number', '0')}</EditFieldRow>
            <EditFieldRow label="Xuất phát">{text('departureTime', 'datetime-local')}</EditFieldRow>
            <EditFieldRow label="Đến nơi">{text('arrivalTime', 'datetime-local')}</EditFieldRow>
            <EditFieldRow label="Km thực tế">{text('actualKm', 'number', '0')}</EditFieldRow>
            <EditFieldRow label="Mô tả hàng" full>{text('cargoDescription', 'text', 'Mô tả hàng hóa')}</EditFieldRow>
            <EditFieldRow label="Ghi chú" full>
              <textarea className={EDIT_TEXTAREA_CLASS} rows={3} placeholder="Ghi chú…"
                value={editForm.notes} onChange={(e) => onPatch({ notes: e.target.value })} />
            </EditFieldRow>
          </div>
        </SubCard>
      </>
    );
  }

  return (
    <>
      {lockedBanner}

      <SubCard title={`Lộ trình · ${detail.Route?.code || '—'}`}>
        <div className="timeline">
          <div className="timeline-item">
            <span className="timeline-dot is-brand" />
            <div className="timeline-body"><div className="timeline-title">{detail.Route?.origin || '—'}</div></div>
            <div className="text-right text-[13px]">
              <div className="font-semibold">{dash(detail.departureTime)}</div>
              <div className="text-muted">Nhận hàng</div>
            </div>
          </div>
          <div className="timeline-item">
            <span className="timeline-dot" />
            <div className="timeline-body"><div className="timeline-title">{detail.Route?.destination || '—'}</div></div>
            <div className="text-right text-[13px]">
              <div className="font-semibold">{dash(detail.arrivalTime)}</div>
              <div className="text-muted">Dự kiến giao</div>
            </div>
          </div>
        </div>
      </SubCard>

      <div className="stat-inline">
        <div><div className="k">Doanh thu</div><div className="v">{formatMoney(revenue, '0 đ')}</div></div>
        <div><div className="k">Chi phí</div><div className="v">{formatMoney(costTotal, '0 đ')}</div></div>
        <div><div className="k">Lợi nhuận</div><div className={profit > 0 ? 'v text-success' : 'v'}>{formatMoney(profit, '0 đ')}</div></div>
      </div>

      <SubCard title="Tài xế & phương tiện">
        <div className="kv">
          <FieldRow label="Xe" value={detail.Vehicle?.plateNumber} mono strong />
          <FieldRow label="Nhà xe" value={detail.Vehicle?.Supplier?.name} />
          <FieldRow label="TX chính" value={detail.primaryDriver?.fullName} />
          <FieldRow label="TX phụ" value={detail.secondaryDriver?.fullName} />
        </div>
      </SubCard>

      <SubCard title="Thông tin chuyến">
        <div className="kv">
          <FieldRow label="Khách hàng" value={detail.Customer ? `${detail.Customer.code} ${detail.Customer.name}` : null} />
          <FieldRow label="Loại chuyến" value={detail.tripType === 'STANDARD' ? 'Tiêu chuẩn (STANDARD)' : detail.tripType} />
          <FieldRow label="Số lượng" value={detail.cargoWeight ? `${Number(detail.cargoWeight)} tấn` : null} />
          <FieldRow label="Đơn giá" value={detail.unitPrice ? formatMoney(detail.unitPrice) : null} />
          <FieldRow label="Ngày chạy" value={formatDate(detail.tripDate, '')} />
          <FieldRow label="Kỳ kế toán" value={detail.AccountingPeriod?.code} />
          <FieldRow label="Km thực tế" value={detail.actualKm ? `${Number(detail.actualKm).toLocaleString('vi-VN')} km` : null} />
          <FieldRow label="Mô tả hàng" value={detail.cargoDescription} full />
          <FieldRow label="Ghi chú" value={detail.notes} full />
        </div>
      </SubCard>
    </>
  );
}
