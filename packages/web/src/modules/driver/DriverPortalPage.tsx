import { useNavigate } from 'react-router-dom';
import { Truck, LogOut, Construction } from 'lucide-react';
import { useAuth } from '../../shared/auth-context';
import { Avatar, Card, EmptyState, IconButton } from '../../shared/ui';

export function DriverPortalPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header className="topbar" style={{ gap: 10 }}>
        <span className="brand-mark"><Truck style={{ width: 18, height: 18 }} /></span>
        <div className="flex-1 min-w-0" style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Cổng tài xế</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>HT-TMS</div>
        </div>
        <div className="flex items-center gap-2">
          <Avatar name={user?.username} size="sm" soft />
          <span className="hidden sm:inline" style={{ fontSize: 13, fontWeight: 500 }}>{user?.username}</span>
          <IconButton label="Đăng xuất" onClick={handleLogout}><LogOut /></IconButton>
        </div>
      </header>

      <main className="page" style={{ maxWidth: 560, margin: '0 auto' }}>
        <Card>
          <EmptyState
            icon={<Construction />}
            title={`Xin chào, ${user?.username || 'tài xế'}!`}
            description="Chức năng xem chuyến, nhận chuyến và chụp ODO sẽ sớm được bổ sung tại đây."
          />
        </Card>
      </main>
    </div>
  );
}
