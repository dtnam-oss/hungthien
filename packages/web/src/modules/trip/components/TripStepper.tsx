/* 5-step progress bar — Kế hoạch → Điều xe → Đang chạy → Đã giao → Hoàn thành */

import clsx from 'clsx';

const STEP_LABELS = ['Kế hoạch', 'Điều xe', 'Đang chạy', 'Đã giao', 'Hoàn thành'];
const STATUS_STEP: Record<string, number> = {
  PLANNED: 0, DISPATCHED: 1, IN_TRANSIT: 2, COMPLETED: 4, CANCELLED: -1,
};

export function TripStepper({ status }: { status: string }) {
  const cur = STATUS_STEP[status] ?? -1;
  const cancelled = cur < 0;

  return (
    <div className="grid grid-cols-5 gap-1 pt-1 pb-0.5">
      {STEP_LABELS.map((label, i) => {
        const isDone = !cancelled && i < cur;
        const isCur = !cancelled && i === cur;
        return (
          <div key={label} className="flex flex-col gap-1.5">
            <div className={clsx('h-1 rounded-full', isDone ? 'bg-brand' : isCur ? 'bg-brand/60' : 'bg-track')} />
            <span className={clsx('whitespace-nowrap text-[11px]', isCur ? 'font-semibold text-ink' : isDone ? 'text-ink-3' : 'text-muted-2')}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
