-- Migration 001: Foundation — Employee, User, Role, Permissions, AuditLog
-- Idempotent: safe to run multiple times
-- Why: These tables form the auth & permission backbone for every other module.

-- =============================================================================
-- ROLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Role" (
  "id"          SERIAL PRIMARY KEY,
  "name"        VARCHAR(100) NOT NULL UNIQUE,
  "description" VARCHAR(500),
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- EMPLOYEES
-- Why Employee is separate from User: some employees (warehouse, drivers) may
-- not have a login, and some Users (system bots) are not employees.
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Employee" (
  "id"          SERIAL PRIMARY KEY,
  "code"        VARCHAR(50)  NOT NULL UNIQUE,
  "fullName"    VARCHAR(200) NOT NULL,
  "phone"       VARCHAR(20),
  "position"    VARCHAR(100),          -- chức danh: "Tài xế", "Điều độ", etc.
  "department"  VARCHAR(100),
  "isDriver"    BOOLEAN      NOT NULL DEFAULT FALSE,
  "status"      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  "joinDate"    DATE,
  "version"     INTEGER      NOT NULL DEFAULT 1,
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- USERS (login accounts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "User" (
  "id"           SERIAL PRIMARY KEY,
  "username"     VARCHAR(100) NOT NULL UNIQUE,
  "passwordHash" VARCHAR(500) NOT NULL,
  "roleId"       INTEGER      NOT NULL REFERENCES "Role"("id"),
  "employeeId"   INTEGER      UNIQUE REFERENCES "Employee"("id"),
  "isActive"     BOOLEAN      NOT NULL DEFAULT TRUE,
  "lastLoginAt"  TIMESTAMPTZ,
  "version"      INTEGER      NOT NULL DEFAULT 1,
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- MODULE PERMISSIONS
-- Why per-module: dispatcher sees trips but not pricing; accountant sees pricing
-- but not vehicle finance. This is the row in the permission matrix.
-- =============================================================================
CREATE TABLE IF NOT EXISTS "ModulePermission" (
  "id"        SERIAL PRIMARY KEY,
  "roleId"    INTEGER     NOT NULL REFERENCES "Role"("id") ON DELETE CASCADE,
  "module"    VARCHAR(50) NOT NULL,
  "canView"   BOOLEAN     NOT NULL DEFAULT FALSE,
  "canEdit"   BOOLEAN     NOT NULL DEFAULT FALSE,
  "canDelete" BOOLEAN     NOT NULL DEFAULT FALSE,
  UNIQUE ("roleId", "module")
);

-- =============================================================================
-- COLUMN PERMISSIONS
-- Why per-column: a dispatcher must see trip details but must NOT see purchase
-- price, loan amount, or driver salary. Column-level hiding solves this without
-- duplicating entire endpoints.
-- =============================================================================
CREATE TABLE IF NOT EXISTS "ColumnPermission" (
  "id"       SERIAL PRIMARY KEY,
  "roleId"   INTEGER     NOT NULL REFERENCES "Role"("id") ON DELETE CASCADE,
  "module"   VARCHAR(50) NOT NULL,
  "column"   VARCHAR(100) NOT NULL,
  "canView"  BOOLEAN     NOT NULL DEFAULT FALSE,
  "canEdit"  BOOLEAN     NOT NULL DEFAULT FALSE,
  UNIQUE ("roleId", "module", "column")
);

-- =============================================================================
-- AUDIT LOG
-- Why: every change to money or status fields must be traceable. This is a
-- compliance requirement, not a nice-to-have — NAK lost real money from
-- untracked changes.
-- =============================================================================
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"         SERIAL PRIMARY KEY,
  "userId"     INTEGER,
  "action"     VARCHAR(20) NOT NULL,  -- CREATE, UPDATE, DELETE
  "tableName"  VARCHAR(100) NOT NULL,
  "recordId"   INTEGER NOT NULL,
  "oldValues"  JSONB,
  "newValues"  JSONB,
  "ipAddress"  VARCHAR(50),
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_employee_code" ON "Employee"("code");
CREATE INDEX IF NOT EXISTS "idx_employee_status" ON "Employee"("status");
CREATE INDEX IF NOT EXISTS "idx_employee_isDriver" ON "Employee"("isDriver");
CREATE INDEX IF NOT EXISTS "idx_user_employeeId" ON "User"("employeeId");
CREATE INDEX IF NOT EXISTS "idx_user_roleId" ON "User"("roleId");
CREATE INDEX IF NOT EXISTS "idx_module_perm_roleId" ON "ModulePermission"("roleId");
CREATE INDEX IF NOT EXISTS "idx_column_perm_roleId" ON "ColumnPermission"("roleId");
CREATE INDEX IF NOT EXISTS "idx_audit_tableName_recordId" ON "AuditLog"("tableName", "recordId");
CREATE INDEX IF NOT EXISTS "idx_audit_createdAt" ON "AuditLog"("createdAt");
