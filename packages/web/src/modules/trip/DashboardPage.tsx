import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Truck, Wallet, CalendarDays, ArrowRight } from 'lucide-react';
import api from '../../shared/api';
import { PageHeader, StatCard, Card, CardHeader, CardBody, DateRange, LoadingBlock, Alert, StatusPill } from '../../shared/ui';
import { formatMoney, toInputDate, errorMessage } from '../../shared/format';

interface DashboardData {
  totalTrips: number;
  byStatus: Record<string, number>;
  revenue: number;
  totalCost: number;
  profit: number;
}

const STATUS_ORDER = ['PLANNED', 'DISPATCHED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return toInputDate(d); });
  const [dateTo, setDateTo] = useState(() => toInputDate(new Date()));

  useEffect(() => {
    let cancelled = false;
    setError('');
    api.get(`/trips/dashboard?dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then((r) => { if (!cancelled) setData(r.data.data); })
      .catch((err) => { if (!cancelled) setError(errorMessage(err, 'Không tải được số liệu')); });
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  const margin = data && data.revenue > 0 ? Math.round((data.profit / data.revenue) * 100) : null;
  const statusKeys = data
    ? [...STATUS_ORDER.filter((k) => k in data.byStatus), ...Object.keys(data.byStatus).filter((k) => !STATUS_ORDER.includes(k))]
    : [];

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        description="Tổng quan chuyến đi, doanh thu và lợi nhuận trong kỳ."
        actions={<DateRange from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} icon={<CalendarDays />} />}
      />

      {error && <Alert tone="error">{error}</Alert>}

      {!data && !error ? (
        <LoadingBlock minHeight={240} />
      ) : data && (
        <>
          <div className="stat-grid">
            <StatCard label="Tổng chuyến" value={data.totalTrips} icon={<Truck />} sub="Trong khoảng ngày đã chọn" />
            <StatCard label="Doanh thu" value={formatMoney(data.revenue)} icon={<Wallet />} tone="success" />
            <StatCard label="Chi phí" value={formatMoney(data.totalCost)} icon={<TrendingDown />} tone="warn" />
            <StatCard
              label="Lợi nhuận"
              value={formatMoney(data.profit)}
              icon={<TrendingUp />}
              tone={data.profit >= 0 ? 'info' : 'danger'}
              sub={margin !== null ? `Biên lợi nhuận ${margin}%` : undefined}
            />
          </div>

          <Card>
            <CardHeader
              title="Chuyến theo trạng thái"
              actions={<Link to="/trips" className="btn btn-ghost btn-sm">Xem danh sách <ArrowRight /></Link>}
            />
            <CardBody>
              {statusKeys.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>Chưa có chuyến nào trong kỳ.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                  {statusKeys.map((key) => {
                    const count = data.byStatus[key] || 0;
                    const pct = data.totalTrips > 0 ? Math.round((count / data.totalTrips) * 100) : 0;
                    return (
                      <div key={key} className="sub-card" style={{ gap: 8 }}>
                        <StatusPill status={key} />
                        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }} className="tabular-nums">{count}</div>
                        <div className="progress" aria-hidden><span style={{ width: `${pct}%` }} /></div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{pct}% tổng chuyến</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
