/**
 * Role service — CRUD for roles, permission matrix management, and user-role assignment.
 */

import type { PrismaClient } from '@prisma/client';

interface PermissionInput {
  module: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export class RoleService {
  constructor(private prisma: PrismaClient) {}

  /** List all roles with user count */
  async list() {
    const roles = await this.prisma.role.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { User: true } },
      },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      userCount: r._count.User,
      createdAt: r.createdAt,
    }));
  }

  /** Get role detail with permissions */
  async getById(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        ModulePermission: true,
        ColumnPermission: true,
        _count: { select: { User: true } },
      },
    });
    if (!role) return null;
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count.User,
      permissions: role.ModulePermission.map((p) => ({
        module: p.module,
        canView: p.canView,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
      })),
      columnPermissions: role.ColumnPermission,
    };
  }

  /** Create a new role */
  async create(data: { name: string; description?: string }) {
    return this.prisma.role.create({
      data: { name: data.name, description: data.description || null },
    });
  }

  /** Update role name/description */
  async update(id: number, data: { name?: string; description?: string }) {
    return this.prisma.role.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        updatedAt: new Date(),
      },
    });
  }

  /** Delete a role (block if users are assigned) */
  async delete(id: number) {
    const userCount = await this.prisma.user.count({ where: { roleId: id } });
    if (userCount > 0) {
      throw new Error(`Không thể xóa vai trò — còn ${userCount} người dùng đang sử dụng`);
    }
    return this.prisma.role.delete({ where: { id } });
  }

  /** Save permission matrix — delete old + insert new in transaction */
  async savePermissions(roleId: number, permissions: PermissionInput[]) {
    await this.prisma.$transaction([
      this.prisma.modulePermission.deleteMany({ where: { roleId } }),
      ...permissions.map((p) =>
        this.prisma.modulePermission.create({
          data: {
            roleId,
            module: p.module,
            canView: p.canView,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
          },
        }),
      ),
    ]);
    return this.getById(roleId);
  }

  /** List all users with their employee info and role */
  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      include: {
        Role: { select: { id: true, name: true } },
        Employee: { select: { id: true, code: true, fullName: true, position: true, department: true, isDriver: true, status: true } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      roleId: u.roleId,
      roleName: u.Role.name,
      isActive: u.isActive,
      employeeId: u.employeeId,
      employee: u.Employee,
    }));
  }

  /** List all employees with their user account info (if any) */
  async listEmployeesWithUsers() {
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ fullName: 'asc' }],
      include: {
        User: {
          select: { id: true, username: true, roleId: true, isActive: true, Role: { select: { id: true, name: true } } },
        },
      },
    });
    return employees.map((e) => ({
      id: e.id,
      code: e.code,
      fullName: e.fullName,
      position: e.position,
      department: e.department,
      isDriver: e.isDriver,
      user: e.User ? {
        id: e.User.id,
        username: e.User.username,
        roleId: e.User.roleId,
        roleName: e.User.Role.name,
        isActive: e.User.isActive,
      } : null,
    }));
  }

  /** Assign a role to a user */
  async assignRole(userId: number, roleId: number) {
    // Verify role exists
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new Error('Vai trò không tồn tại');

    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId, updatedAt: new Date() },
      include: { Role: { select: { name: true } } },
    });
  }
}
