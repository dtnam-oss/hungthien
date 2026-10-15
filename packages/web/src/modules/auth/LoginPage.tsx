import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../shared/auth-context';
import { Button, Field, Input, Alert } from '../../shared/ui';
import { errorMessage } from '../../shared/format';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      const stored = localStorage.getItem('user');
      const user = stored ? JSON.parse(stored) : null;
      navigate(user?.isDriver ? '/driver' : '/');
    } catch (err: unknown) {
      setError(errorMessage(err, 'Đăng nhập thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card animate-slide-up">
        <div className="flex items-center gap-3 mb-7">
          <span className="brand-mark" style={{ width: 40, height: 40, fontSize: 20, borderRadius: 'var(--radius-lg)' }}>H</span>
          <div style={{ lineHeight: 1.2 }}>
            <div className="brand-name" style={{ fontSize: 20 }}>HT-TMS</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Hệ thống quản lý vận tải</div>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Đăng nhập</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, marginBottom: 24 }}>Nhập tài khoản được cấp để tiếp tục.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Field label="Tên đăng nhập" htmlFor="login-username" required>
            <Input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ví dụ: admin"
              autoComplete="username"
              required
              autoFocus
            />
          </Field>

          <Field label="Mật khẩu" htmlFor="login-password" required>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="icon-btn icon-btn-sm absolute right-1.5 top-1/2 -translate-y-1/2"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </Field>

          <Button type="submit" variant="primary" size="lg" block loading={loading} icon={<LogIn />} className="mt-2">
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>

        <p className="text-center" style={{ fontSize: 12, color: 'var(--faint)', marginTop: 24 }}>
          © {new Date().getFullYear()} HT-TMS · Nội bộ công ty
        </p>
      </div>
    </div>
  );
}
