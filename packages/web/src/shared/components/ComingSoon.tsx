import { Construction } from 'lucide-react';
import { PageHeader, Card, EmptyState } from '../ui';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="page">
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState
          icon={<Construction />}
          title="Tính năng đang phát triển"
          description="Màn hình này sẽ sớm được bổ sung. Bạn có thể quay lại trang chủ để chọn chức năng khác."
        />
      </Card>
    </div>
  );
}
