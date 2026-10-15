import { useState, useEffect, useMemo } from 'react';
import { UserCheck } from 'lucide-react';
import api from '../../shared/api';
import { useAuth } from '../../shared/auth-context';
import { Alert, Avatar, Card, CardHeader, EmptyState, LoadingBlock, PageHeader, Pill, SearchBox } from '../../shared/ui';
import type { PillTone } from '../../shared/ui';

export interface Role {
  id: number;
  name: string;
  description: string;
}

export interface EmployeeUser {
  id: number;
  username: string;
  roleId: number | null;
  roleName: string | null;
  isActive: boolean;
}

export interface Employee {
  id: number;
  code: string;
  fullName: string;
  position: string;
  department: string;
  isDriver: boolean;
  user: EmployeeUser | null;
}

const getRoleTone = (roleName: string | null): PillTone => {
  const name = roleName?.toUpperCase() || '';
  if (!name) return 'neutral';
  if (name.includes('ADMIN')) return 'danger';
  if (name.includes('MANAGER')) return 'info';
  if (name.includes('ACCOUNTANT')) return 'warn';
  if (name.includes('DRIVER')) return 'success';
  if (name.includes('VIEWER')) return 'neutral';
  return 'violet';
};

export function AssignRolesPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('role', 'canEdit');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, roleRes] = await Promise.all([
        api.get('/roles/employees'),
        api.get('/roles')
      ]);
      
      setEmployees(empRes.data.data || empRes.data || []);
      setRoles(roleRes.data.data || roleRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.fullName.toLowerCase().includes(term) ||
        emp.code.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  const handleAssignRole = async (roleId: number) => {
    if (!selectedEmployee?.user || !canEdit) return;

    const userId = selectedEmployee.user.id;
    setSavingId(roleId);
    setSaveSuccess(false);

    try {
      const res = await api.put(`/roles/assign/${userId}`, { roleId });
      if (res.data.success !== false) {
        setSaveSuccess(true);
        // Cập nhật lại state employees để reflect thay đổi
        const updatedRole = roles.find(r => r.id === roleId);
        if (updatedRole) {
          const updatedEmployees = employees.map(emp => {
            if (emp.id === selectedEmployee.id && emp.user) {
              return {
                ...emp,
                user: {
                  ...emp.user,
                  roleId: updatedRole.id,
                  roleName: updatedRole.name
                }
              };
            }
            return emp;
          });
          setEmployees(updatedEmployees);
          
          // Cập nhật selected employee
          setSelectedEmployee({
            ...selectedEmployee,
            user: {
              ...selectedEmployee.user,
              roleId: updatedRole.id,
              roleName: updatedRole.name
            }
          });
        }
        
        setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error assigning role:', error);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="page page-fill">
      <PageHeader
        title="Gán vai trò"
        description="Chọn nhân viên và gán vai trò truy cập hệ thống"
      />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-4">
        {/* Cột trái: Danh sách nhân viên */}
        <Card className="w-full lg:w-[360px] shrink-0 flex flex-col min-h-0">
          <CardHeader title="Danh sách nhân viên">
            <Pill tone="info" size="sm">{filteredEmployees.length}</Pill>
          </CardHeader>
          <div className="card-body" style={{ paddingBottom: 8 }}>
            <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Tìm theo tên, mã..." width="100%" />
          </div>

          <div className="tbl-wrap flex-1 min-h-0">
            {loading ? (
              <LoadingBlock />
            ) : filteredEmployees.length === 0 ? (
              <EmptyState compact title="Không tìm thấy nhân viên" />
            ) : (
              <table className="tbl tbl-hover tbl-click">
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className={selectedEmployee?.id === emp.id ? 'is-selected' : undefined}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.fullName} soft />
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedEmployee(emp)}
                              className="cell-title block truncate text-left"
                            >
                              {emp.fullName}
                            </button>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="cell-sub truncate">{emp.position}</span>
                              {emp.user ? (
                                <Pill tone={getRoleTone(emp.user.roleName)} size="sm">
                                  {emp.user.roleName || 'Chưa gán'}
                                </Pill>
                              ) : (
                                <span className="cell-sub italic">Chưa có tài khoản</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Cột phải: Gán vai trò */}
        <Card className="flex-1 min-w-0 flex flex-col min-h-0">
          {selectedEmployee ? (
            <>
              <CardHeader title="Gán vai trò cho nhân viên" />
              <div className="card-body flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Nhân viên: <strong style={{ color: 'var(--text)' }}>{selectedEmployee.fullName}</strong> | {selectedEmployee.position} | Vai trò hiện tại:{' '}
                  <strong style={{ color: 'var(--text)' }}>{selectedEmployee.user?.roleName || 'Chưa gán'}</strong>
                </p>

                {saveSuccess && <Alert tone="success">Cập nhật vai trò thành công</Alert>}

                {!selectedEmployee.user ? (
                  <Alert tone="warn" icon={<UserCheck />}>
                    Nhân viên chưa có tài khoản đăng nhập. Vui lòng tạo tài khoản trong trang Nhân viên trước.
                  </Alert>
                ) : (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Vai trò</th>
                          <th>Mã</th>
                          <th>Mô tả</th>
                          <th className="center" style={{ width: 120 }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roles.map((role) => {
                          const isCurrentRole = selectedEmployee.user?.roleId === role.id;
                          return (
                            <tr key={role.id} className={isCurrentRole ? 'is-selected' : undefined}>
                              <td>
                                <Pill tone={getRoleTone(role.name)}>{role.name}</Pill>
                              </td>
                              <td className="cell-mono">{role.name.toUpperCase()}</td>
                              <td>{role.description}</td>
                              <td className="center">
                                {canEdit ? (
                                  <button
                                    type="button"
                                    disabled={savingId !== null}
                                    onClick={() => handleAssignRole(role.id)}
                                    aria-pressed={isCurrentRole}
                                    aria-label={isCurrentRole ? `Vai trò hiện tại: ${role.name}` : `Gán vai trò ${role.name}`}
                                    className={`btn btn-xs ${isCurrentRole ? 'btn-primary' : 'btn-secondary'}`}
                                  >
                                    {savingId === role.id ? <span className="spinner" aria-hidden /> : null}
                                    {isCurrentRole ? 'Đang dùng' : 'Gán'}
                                  </button>
                                ) : isCurrentRole ? (
                                  <Pill tone="success" size="sm">Đang dùng</Pill>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyState
              className="flex-1"
              icon={<UserCheck />}
              title="Chưa chọn nhân viên"
              description="Chọn một nhân viên từ danh sách bên trái để xem và gán vai trò"
            />
          )}
        </Card>
      </div>
    </div>
  );
}
