import { useState, useEffect, Fragment } from 'react';
import type { FC } from 'react';
import { Plus, Pencil, Trash2, Save, Shield, Users, ArrowLeft } from 'lucide-react';
import api from '../../shared/api';
import { useAuth } from '../../shared/auth-context';
import { ModalOverlay } from '../../shared/components/ModalOverlay';
import { Button, IconButton, Card, CardHeader, PageHeader, Field, Input, Textarea, Pill, EmptyState, LoadingBlock } from '../../shared/ui';

interface Permission {
  module: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface Role {
  id: number;
  name: string;
  description?: string;
  userCount: number;
}

interface RoleDetail extends Role {
  permissions: Permission[];
}

const PERMISSION_GROUPS = [
  {
    name: 'VẬN HÀNH',
    modules: [
      { key: 'trip', label: 'Chuyến đi & Kế hoạch' },
      { key: 'vehicle', label: 'Phương tiện' }
    ]
  },
  {
    name: 'DANH MỤC',
    modules: [
      { key: 'customer', label: 'Khách hàng' },
      { key: 'supplier', label: 'Nhà cung cấp' },
      { key: 'employee', label: 'Nhân viên' }
    ]
  },
  {
    name: 'TÀI CHÍNH',
    modules: [
      { key: 'pricing', label: 'Bảng giá' },
      { key: 'payroll', label: 'Bảng lương' }
    ]
  },
  {
    name: 'HỆ THỐNG',
    modules: [
      { key: 'role', label: 'Phân quyền' }
    ]
  }
];

interface RoleFormState {
  name: string;
  description: string;
}

type PermMatrixState = Record<string, { canView: boolean; canEdit: boolean; canDelete: boolean }>;

export const RolesPermissionsPage: FC = () => {
  const { hasPermission } = useAuth();
  const canEditRole = hasPermission('role', 'canEdit');
  const canDeleteRole = hasPermission('role', 'canDelete');

  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  
  const [activeRoleId, setActiveRoleId] = useState<number | null>(null);
  const [activeRoleDetail, setActiveRoleDetail] = useState<RoleDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  const [permMatrix, setPermMatrix] = useState<PermMatrixState>({});
  const [savingMatrix, setSavingMatrix] = useState(false);

  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsLg(e.matches);
    setIsLg(mq.matches);
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const res = await api.get('/roles');
      const roles = res.data.data || res.data;
      if (Array.isArray(roles)) {
        setRoles(roles);
        if (!activeRoleId && roles.length > 0) {
          setActiveRoleId(roles[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching roles', error);
      alert('Không thể tải danh sách vai trò');
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchRoleDetail = async (id: number) => {
    try {
      setLoadingDetail(true);
      const res = await api.get(`/roles/${id}`);
      const detail = res.data.data || res.data;
      if (detail) {
        setActiveRoleDetail(detail);
        
        // Initialize matrix
        const newMatrix: PermMatrixState = {};
        PERMISSION_GROUPS.forEach(g => {
          g.modules.forEach(m => {
            const existing = detail.permissions?.find((p: Permission) => p.module === m.key);
            newMatrix[m.key] = {
              canView: existing?.canView ?? false,
              canEdit: existing?.canEdit ?? false,
              canDelete: existing?.canDelete ?? false,
            };
          });
        });
        // Giữ nguyên quyền của module chưa có trong bảng (server xóa toàn bộ rồi ghi lại đúng những gì được gửi)
        (detail.permissions ?? []).forEach((p: Permission) => {
          if (!newMatrix[p.module]) newMatrix[p.module] = { canView: p.canView, canEdit: p.canEdit, canDelete: p.canDelete };
        });
        setPermMatrix(newMatrix);
      }
    } catch (error) {
      console.error('Error fetching role detail', error);
      alert('Không thể tải chi tiết phân quyền');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (activeRoleId) {
      fetchRoleDetail(activeRoleId);
    }
  }, [activeRoleId]);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormState>({ name: '', description: '' });
  const [savingRole, setSavingRole] = useState(false);

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '' });
    setShowRoleModal(true);
  };

  const openEditModal = (e: React.MouseEvent, role: Role) => {
    e.stopPropagation();
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description || '' });
    setShowRoleModal(true);
  };

  const saveRole = async () => {
    if (!roleForm.name.trim()) {
      alert('Tên vai trò không được để trống');
      return;
    }
    try {
      setSavingRole(true);
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, roleForm);
      } else {
        await api.post('/roles', roleForm);
      }
      setShowRoleModal(false);
      fetchRoles();
    } catch (error) {
      console.error('Save role error', error);
      alert('Không thể lưu vai trò');
    } finally {
      setSavingRole(false);
    }
  };

  const deleteRole = async (e: React.MouseEvent, role: Role) => {
    e.stopPropagation();
    if (role.userCount > 0) {
      alert('Không thể xóa vai trò đang có nhân viên sử dụng');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa vai trò "${role.name}"?`)) {
      return;
    }
    try {
      await api.delete(`/roles/${role.id}`);
      if (activeRoleId === role.id) {
        setActiveRoleId(null);
        setActiveRoleDetail(null);
      }
      fetchRoles();
    } catch (error) {
      console.error('Delete role error', error);
      alert('Không thể xóa vai trò');
    }
  };

  const handleToggle = (moduleKey: string, field: 'canView' | 'canEdit' | 'canDelete') => {
    if (!canEditRole) return;
    setPermMatrix(prev => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [field]: !prev[moduleKey][field]
      }
    }));
  };

  const handleToggleAll = (moduleKey: string) => {
    if (!canEditRole) return;
    const current = permMatrix[moduleKey];
    const allChecked = current.canView && current.canEdit && current.canDelete;
    setPermMatrix(prev => ({
      ...prev,
      [moduleKey]: {
        canView: !allChecked,
        canEdit: !allChecked,
        canDelete: !allChecked
      }
    }));
  };

  const saveMatrix = async () => {
    if (!activeRoleId) return;
    try {
      setSavingMatrix(true);
      const permissionsToSave = Object.keys(permMatrix).map(moduleKey => ({
        module: moduleKey,
        ...permMatrix[moduleKey]
      }));
      await api.put(`/roles/${activeRoleId}/permissions`, { permissions: permissionsToSave });
      alert('Lưu phân quyền thành công');
      fetchRoleDetail(activeRoleId);
    } catch (error) {
      console.error('Save matrix error', error);
      alert('Không thể lưu phân quyền');
    } finally {
      setSavingMatrix(false);
    }
  };

  const renderCheck = (checked: boolean, onChange: () => void, label: string) => (
    <input
      type="checkbox"
      className="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={!canEditRole}
      aria-label={label}
    />
  );

  const showList = isLg || !activeRoleId;
  const showMatrix = isLg || !!activeRoleId;

  return (
    <div className="page page-fill">
      <PageHeader
        title="Phân quyền"
        description="Quản lý vai trò và ma trận quyền truy cập theo module"
        actions={canEditRole && activeRoleId && !loadingDetail && activeRoleDetail ? (
          <Button variant="primary" icon={<Save />} onClick={saveMatrix} loading={savingMatrix}>
            Lưu phân quyền
          </Button>
        ) : undefined}
      />

      <div className="flex flex-1 min-h-0 gap-4">
        {showList && (
          <Card className={`${isLg ? 'w-[300px] shrink-0' : 'w-full'} flex flex-col min-h-0`}>
            <CardHeader
              title={<span className="inline-flex items-center gap-2"><Shield size={16} />Danh sách vai trò</span>}
              actions={canEditRole && (
                <IconButton label="Thêm vai trò" tone="brand" onClick={openCreateModal}><Plus /></IconButton>
              )}
            />
            <div className="flex-1 overflow-y-auto p-2">
              {loadingRoles ? (
                <LoadingBlock />
              ) : roles.length === 0 ? (
                <EmptyState compact title="Chưa có vai trò" />
              ) : (
                <div className="flex flex-col gap-1">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveRoleId(role.id)}
                        className={`menu-item flex-1 min-w-0 text-left ${activeRoleId === role.id ? 'is-active' : ''}`}
                        style={{ height: 'auto', padding: '8px 10px', alignItems: 'flex-start' }}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block truncate font-medium">{role.name}</span>
                          {role.description && (
                            <span className="block text-xs line-clamp-2" style={{ color: 'var(--muted)', fontWeight: 400 }}>{role.description}</span>
                          )}
                        </span>
                        <Pill tone="outline" size="sm"><Users size={11} />{role.userCount}</Pill>
                      </button>
                      {canEditRole && (
                        <div className="flex shrink-0">
                          <IconButton label={`Sửa vai trò ${role.name}`} size="sm" onClick={(e) => openEditModal(e, role)}><Pencil /></IconButton>
                          {canDeleteRole && (
                            <IconButton label={`Xóa vai trò ${role.name}`} size="sm" tone="danger" onClick={(e) => deleteRole(e, role)}><Trash2 /></IconButton>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {showMatrix && (
          <Card className="flex-1 min-w-0 flex flex-col min-h-0">
            {!isLg && activeRoleId && (
              <div className="card-body" style={{ paddingBottom: 0 }}>
                <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={() => setActiveRoleId(null)}>
                  Quay lại danh sách
                </Button>
              </div>
            )}

            {activeRoleId && !loadingDetail && activeRoleDetail ? (
              <>
                <CardHeader title={`Ma trận Phân quyền: ${activeRoleDetail.name}`}>
                  {activeRoleDetail.description && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{activeRoleDetail.description}</span>
                  )}
                </CardHeader>
                <div className="tbl-wrap flex-1 min-h-0">
                  <table className="tbl tbl-compact">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        <th>Module</th>
                        <th className="center" style={{ width: 96 }}>Xem</th>
                        <th className="center" style={{ width: 96 }}>Sửa</th>
                        <th className="center" style={{ width: 96 }}>Xóa</th>
                        <th className="center" style={{ width: 112 }}>Tất cả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_GROUPS.map(group => (
                        <Fragment key={group.name}>
                          <tr className="tbl-group-row">
                            <td colSpan={5}>{group.name}</td>
                          </tr>
                          {group.modules.map(mod => {
                            const perms = permMatrix[mod.key] || { canView: false, canEdit: false, canDelete: false };
                            const allChecked = perms.canView && perms.canEdit && perms.canDelete;
                            return (
                              <tr key={mod.key}>
                                <td><span className="cell-title">{mod.label}</span></td>
                                <td className="center">{renderCheck(perms.canView, () => handleToggle(mod.key, 'canView'), `Xem ${mod.label}`)}</td>
                                <td className="center">{renderCheck(perms.canEdit, () => handleToggle(mod.key, 'canEdit'), `Sửa ${mod.label}`)}</td>
                                <td className="center">{renderCheck(perms.canDelete, () => handleToggle(mod.key, 'canDelete'), `Xóa ${mod.label}`)}</td>
                                <td className="center">{renderCheck(allChecked, () => handleToggleAll(mod.key), `Tất cả quyền ${mod.label}`)}</td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : loadingDetail ? (
              <LoadingBlock className="flex-1" />
            ) : (
              <EmptyState
                className="flex-1"
                icon={<Shield />}
                title="Chưa chọn vai trò"
                description="Chọn một vai trò để xem và chỉnh sửa phân quyền"
              />
            )}
          </Card>
        )}
      </div>

      {showRoleModal && (
        <ModalOverlay
          title={editingRole ? 'Cập nhật Vai trò' : 'Thêm Vai trò mới'}
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          footer={(
            <>
              <Button onClick={() => setShowRoleModal(false)}>Hủy bỏ</Button>
              <Button variant="primary" onClick={saveRole} loading={savingRole}>Lưu lại</Button>
            </>
          )}
        >
          <div className="flex flex-col gap-4">
            <Field label="Tên vai trò" required>
              <Input
                type="text"
                value={roleForm.name}
                onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="VD: Quản trị hệ thống, Kế toán..."
              />
            </Field>
            <Field label="Mô tả">
              <Textarea
                value={roleForm.description}
                onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Mô tả quyền hạn của vai trò này..."
                rows={3}
              />
            </Field>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};
