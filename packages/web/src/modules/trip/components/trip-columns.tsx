/* Cột bảng chuyến (ServerDataTable) */

import { Plate, StatusPill } from '../../../shared/ui';
import type { ServerDataColumn } from '../../../shared/components/ServerDataTable';
import type { TripRow } from './types';

/* sortIndex PHẢI khớp SORTABLE_COLUMNS ở backend (trips-dt.service.ts) */
export const TRIP_COLUMNS: ServerDataColumn<TripRow>[] = [
  {
    key: 'route', label: 'Chuyến / Tuyến', sortIndex: 0, minWidth: 200,
    render: (row) => (
      <div className="flex flex-col items-start gap-0.5 text-left text-ink">
        <span className="cell-title">
          {row.Route?.origin || '—'} <span className="text-muted">→</span> {row.Route?.destination || '—'}
        </span>
        <span className="flex gap-2 text-xs text-muted">
          <span className="mono text-ink-3">{row.tripCode}</span>
          <span>·</span>
          <span>Nhận {row.departureTime || '—'}</span>
        </span>
      </div>
    ),
  },
  {
    key: 'customer', label: 'Khách hàng', sortIndex: 1,
    render: (row) => (
      <>
        <div className="max-w-[130px] truncate">{row.Customer?.name || '—'}</div>
        <div className="cell-sub mono">{row.Customer?.code || ''}</div>
      </>
    ),
  },
  {
    key: 'plate', label: 'Xe · Tài xế', sortIndex: 2,
    render: (row) => (
      <div className="flex flex-col items-start gap-0.5">
        {row.Vehicle?.plateNumber
          ? <Plate>{row.Vehicle.plateNumber}</Plate>
          : <span className="text-xs font-semibold text-warn">Chưa gán xe</span>}
        <span className="text-xs text-muted">{row.primaryDriver?.fullName || 'Chưa gán tài xế'}</span>
      </div>
    ),
  },
  {
    key: 'cargoWeight', label: 'SL', align: 'right',
    render: (row) => (row.cargoWeight ? <>{Number(row.cargoWeight)} <span className="text-muted">tấn</span></> : '—'),
  },
  { key: 'status', label: 'Trạng thái', sortIndex: 3, render: (row) => <StatusPill status={row.status} size="sm" /> },
  { key: 'supplier', label: 'Nhà xe', sortIndex: 4, render: (row) => <div className="max-w-[120px] truncate" title={row.Vehicle?.Supplier?.name}>{row.Vehicle?.Supplier?.name || '—'}</div> },
];
