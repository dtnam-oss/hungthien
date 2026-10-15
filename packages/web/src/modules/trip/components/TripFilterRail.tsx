/* Cột lọc bên trái trang Chuyến đi: đếm theo trạng thái xếp dọc + bộ lọc khách hàng / nhà xe / tài xế */

import clsx from 'clsx';
import { SectionTitle, Select, STATUS_TONES } from '../../../shared/ui';

export interface RailOption { id: number; name?: string; fullName?: string }

interface Props {
  stats: { status: string; count: number }[];
  total: number;
  /** '' = tất cả */
  status: string;
  onStatusChange: (status: string) => void;
  customers: RailOption[];
  drivers: RailOption[];
  suppliers: RailOption[];
  customer: string;
  driver: string;
  supplier: string;
  onCustomerChange: (v: string) => void;
  onDriverChange: (v: string) => void;
  onSupplierChange: (v: string) => void;
}

const STATUS_ORDER = ['PLANNED', 'DISPATCHED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];

export function TripFilterRail({
  stats, total, status, onStatusChange,
  customers, drivers, suppliers,
  customer, driver, supplier, onCustomerChange, onDriverChange, onSupplierChange,
}: Props) {
  const countOf = (key: string) => stats.find((s) => s.status === key)?.count ?? 0;
  const statusKeys = [
    ...STATUS_ORDER.filter((k) => stats.some((s) => s.status === k)),
    ...stats.map((s) => s.status).filter((k) => !STATUS_ORDER.includes(k)),
  ];

  return (
    <aside className="filter-rail" aria-label="Bộ lọc chuyến đi">
      <div className="rail-section">
        <SectionTitle>Trạng thái</SectionTitle>
        <div className="rail-stats" role="group" aria-label="Lọc theo trạng thái">
          <button type="button" className={clsx('rail-stat', status === '' && 'is-active')} aria-pressed={status === ''} onClick={() => onStatusChange('')}>
            <span className="label">Tổng chuyến</span>
            <span className="count">{total}</span>
          </button>
          {statusKeys.map((key) => {
            const tone = STATUS_TONES[key];
            return (
              <button key={key} type="button" data-tone={tone?.tone ?? 'neutral'}
                className={clsx('rail-stat', status === key && 'is-active')} aria-pressed={status === key}
                onClick={() => onStatusChange(status === key ? '' : key)}>
                <span className="label">{tone?.label ?? key}</span>
                <span className="count">{countOf(key)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rail-section">
        <SectionTitle>Khách hàng</SectionTitle>
        <Select size="sm" value={customer} onChange={(e) => onCustomerChange(e.target.value)} aria-label="Khách hàng">
          <option value="">Tất cả khách hàng</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      <div className="rail-section">
        <SectionTitle>Nhà xe</SectionTitle>
        <Select size="sm" value={supplier} onChange={(e) => onSupplierChange(e.target.value)} aria-label="Nhà xe">
          <option value="">Tất cả nhà xe</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>

      <div className="rail-section">
        <SectionTitle>Tài xế</SectionTitle>
        <Select size="sm" value={driver} onChange={(e) => onDriverChange(e.target.value)} aria-label="Tài xế">
          <option value="">Tất cả tài xế</option>
          {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
        </Select>
      </div>
    </aside>
  );
}
