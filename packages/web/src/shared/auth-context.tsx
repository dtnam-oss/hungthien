import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from './api';

interface User {
  userId: number;
  username: string;
  roleId: number;
  roleName: string;
  employeeId: number | null;
  isDriver: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  permissions: Array<{ module: string; canView: boolean; canEdit: boolean; canDelete: boolean }>;
  columnPermissions: Array<{ module: string; column: string; canView: boolean; canEdit: boolean }>;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (module: string, level: 'canView' | 'canEdit' | 'canDelete') => boolean;
  canViewColumn: (module: string, column: string) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    permissions: [],
    columnPermissions: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        const data = res.data.data;
        setState({
          user: {
            userId: data.userId,
            username: data.username,
            roleId: data.roleId ?? 0,
            roleName: data.roleName,
            employeeId: data.employeeId,
            isDriver: data.isDriver,
          },
          token,
          permissions: data.permissions || [],
          columnPermissions: data.columnPermissions || [],
        });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setState({ user: null, token: null, permissions: [], columnPermissions: [] });
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    const { token, user } = res.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    const meRes = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = meRes.data.data;
    setState({
      user,
      token,
      permissions: meData.permissions || [],
      columnPermissions: meData.columnPermissions || [],
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ user: null, token: null, permissions: [], columnPermissions: [] });
  };

  const hasPermission = (module: string, level: 'canView' | 'canEdit' | 'canDelete') => {
    if (state.user?.roleName === 'admin') return true;
    const perm = state.permissions.find((p) => p.module === module);
    return perm?.[level] ?? false;
  };

  const canViewColumn = (module: string, column: string) => {
    if (state.user?.roleName === 'admin') return true;
    const colPerm = state.columnPermissions.find(
      (cp) => cp.module === module && cp.column === column,
    );
    if (!colPerm) return true;
    return colPerm.canView;
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasPermission, canViewColumn, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
