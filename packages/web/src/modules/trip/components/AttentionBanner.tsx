/* Cảnh báo chuyến sắp chạy chưa gán đủ xe / tài xế / nhà xe */

import { AlertTriangle } from 'lucide-react';
import { Button } from '../../../shared/ui';

interface Props {
  count: number;
  filtering: boolean;
  onToggle: () => void;
}

export function AttentionBanner({ count, filtering, onToggle }: Props) {
  if (count === 0) return null;

  return (
    <div className="alert alert-warn items-center" role="status">
      <AlertTriangle />
      <span className="flex-1">
        <strong>{count} chuyến</strong> sắp chạy chưa gán đủ xe, tài xế hoặc nhà xe.
      </span>
      <Button size="sm" onClick={onToggle}>
        {filtering ? 'Hiện tất cả' : 'Lọc các chuyến này'}
      </Button>
    </div>
  );
}
