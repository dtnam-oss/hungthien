/**
 * Seed data — creates default roles, permissions, and admin user.
 * Safe to run multiple times (checks existence before creating).
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  // 1. Create roles
  const roles = [
    { name: 'admin', description: 'Quản trị viên - toàn quyền' },
    { name: 'dispatcher', description: 'Điều độ viên - quản lý chuyến' },
    { name: 'accountant', description: 'Kế toán - quản lý tài chính' },
    { name: 'driver', description: 'Tài xế - xem/cập nhật chuyến được giao' },
    { name: 'viewer', description: 'Chỉ xem - không chỉnh sửa' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('  ✓ Roles created');

  // 2. Module permissions for each role
  const modules = ['employee', 'vehicle', 'supplier', 'pricing', 'trip'];
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  const dispatcherRole = await prisma.role.findUnique({ where: { name: 'dispatcher' } });
  const accountantRole = await prisma.role.findUnique({ where: { name: 'accountant' } });
  const driverRole = await prisma.role.findUnique({ where: { name: 'driver' } });
  const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } });

  if (!adminRole || !dispatcherRole || !accountantRole || !driverRole || !viewerRole) {
    throw new Error('Failed to create roles');
  }

  // Admin: full access to everything
  for (const mod of modules) {
    await prisma.modulePermission.upsert({
      where: { roleId_module: { roleId: adminRole.id, module: mod } },
      update: { canView: true, canEdit: true, canDelete: true },
      create: { roleId: adminRole.id, module: mod, canView: true, canEdit: true, canDelete: true },
    });
  }

  // Dispatcher: view/edit trips and employees, view vehicles
  const dispatcherPerms: Record<string, { canView: boolean; canEdit: boolean; canDelete: boolean }> = {
    employee: { canView: true, canEdit: false, canDelete: false },
    vehicle:  { canView: true, canEdit: false, canDelete: false },
    supplier: { canView: true, canEdit: false, canDelete: false },
    pricing:  { canView: false, canEdit: false, canDelete: false },
    trip:     { canView: true, canEdit: true, canDelete: false },
  };
  for (const [mod, perms] of Object.entries(dispatcherPerms)) {
    await prisma.modulePermission.upsert({
      where: { roleId_module: { roleId: dispatcherRole.id, module: mod } },
      update: perms,
      create: { roleId: dispatcherRole.id, module: mod, ...perms },
    });
  }

  // Accountant: view everything, edit pricing and trips
  const accountantPerms: Record<string, { canView: boolean; canEdit: boolean; canDelete: boolean }> = {
    employee: { canView: true, canEdit: false, canDelete: false },
    vehicle:  { canView: true, canEdit: false, canDelete: false },
    supplier: { canView: true, canEdit: true, canDelete: false },
    pricing:  { canView: true, canEdit: true, canDelete: false },
    trip:     { canView: true, canEdit: true, canDelete: false },
  };
  for (const [mod, perms] of Object.entries(accountantPerms)) {
    await prisma.modulePermission.upsert({
      where: { roleId_module: { roleId: accountantRole.id, module: mod } },
      update: perms,
      create: { roleId: accountantRole.id, module: mod, ...perms },
    });
  }

  // Driver: view trips only
  await prisma.modulePermission.upsert({
    where: { roleId_module: { roleId: driverRole.id, module: 'trip' } },
    update: { canView: true, canEdit: true, canDelete: false },
    create: { roleId: driverRole.id, module: 'trip', canView: true, canEdit: true, canDelete: false },
  });

  // Viewer: view everything, edit nothing
  for (const mod of modules) {
    await prisma.modulePermission.upsert({
      where: { roleId_module: { roleId: viewerRole.id, module: mod } },
      update: { canView: true, canEdit: false, canDelete: false },
      create: { roleId: viewerRole.id, module: mod, canView: true, canEdit: false, canDelete: false },
    });
  }
  console.log('  ✓ Module permissions created');

  // 3. Column permissions: dispatcher cannot see financial data
  const sensitiveColumns = ['purchasePrice', 'loanAmount', 'interestRate', 'driverSalary', 'revenue'];
  for (const col of sensitiveColumns) {
    for (const mod of ['vehicle', 'trip', 'pricing']) {
      await prisma.columnPermission.upsert({
        where: {
          roleId_module_column: { roleId: dispatcherRole.id, module: mod, column: col },
        },
        update: { canView: false, canEdit: false },
        create: { roleId: dispatcherRole.id, module: mod, column: col, canView: false, canEdit: false },
      });
    }
  }
  console.log('  ✓ Column permissions created');

  // 4. Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    },
  });
  console.log('  ✓ Admin user created (admin/admin123)');

  // 5. Create sample employees
  const sampleEmployees = [
    { code: 'NV001', fullName: 'Nguyễn Văn Admin', position: 'Quản trị', department: 'Ban Giám đốc', isDriver: false },
    { code: 'NV002', fullName: 'Trần Thị Điều Độ', position: 'Điều độ viên', department: 'Phòng Điều độ', isDriver: false },
    { code: 'TX001', fullName: 'Lê Văn Tài Xế', position: 'Tài xế', department: 'Đội xe', isDriver: true },
    { code: 'TX002', fullName: 'Phạm Minh Phụ Xe', position: 'Tài xế phụ', department: 'Đội xe', isDriver: true },
    { code: 'KT001', fullName: 'Hoàng Thị Kế Toán', position: 'Kế toán', department: 'Phòng Kế toán', isDriver: false },
  ];

  for (const emp of sampleEmployees) {
    await prisma.employee.upsert({
      where: { code: emp.code },
      update: {},
      create: {
        ...emp,
        status: 'ACTIVE',
        joinDate: new Date('2024-01-01'),
      },
    });
  }
  console.log('  ✓ Sample employees created');

  // 6. Link admin user to admin employee and create driver user
  const adminEmployee = await prisma.employee.findUnique({ where: { code: 'NV001' } });
  if (adminEmployee) {
    await prisma.user.update({
      where: { username: 'admin' },
      data: { employeeId: adminEmployee.id },
    });
  }

  // Create driver user for testing driver portal
  const driverEmployee = await prisma.employee.findUnique({ where: { code: 'TX001' } });
  if (driverEmployee) {
    const driverPasswordHash = await bcrypt.hash('driver123', 10);
    await prisma.user.upsert({
      where: { username: 'taixe1' },
      update: {},
      create: {
        username: 'taixe1',
        passwordHash: driverPasswordHash,
        roleId: driverRole.id,
        employeeId: driverEmployee.id,
        isActive: true,
      },
    });
    console.log('  ✓ Driver user created (taixe1/driver123)');
  }

  // Create dispatcher user
  const dispatcherEmployee = await prisma.employee.findUnique({ where: { code: 'NV002' } });
  if (dispatcherEmployee) {
    const dispatcherPasswordHash = await bcrypt.hash('dieubo123', 10);
    await prisma.user.upsert({
      where: { username: 'dieubo1' },
      update: {},
      create: {
        username: 'dieubo1',
        passwordHash: dispatcherPasswordHash,
        roleId: dispatcherRole.id,
        employeeId: dispatcherEmployee.id,
        isActive: true,
      },
    });
    console.log('  ✓ Dispatcher user created (dieubo1/dieubo123)');
  }

  console.log('\n✓ Seed completed successfully');
}

seed()
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
