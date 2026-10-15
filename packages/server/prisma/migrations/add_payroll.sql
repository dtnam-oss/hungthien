-- ═══════════════════════════════════════════════════════════════════
-- Payroll Module Migration
-- ═══════════════════════════════════════════════════════════════════

-- 1. Region
CREATE TABLE IF NOT EXISTS "Region" (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Employee expand
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "regionId" INT REFERENCES "Region"(id);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "salaryType" VARCHAR(20) NOT NULL DEFAULT 'PER_TRIP';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "baseSalary" DECIMAL(18,2) DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_employee_regionid ON "Employee" ("regionId");

-- 3. Trip expand
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "driverSalary" DECIMAL(18,2);

-- 4. PayrollPeriod
CREATE TABLE IF NOT EXISTS "PayrollPeriod" (
  id SERIAL PRIMARY KEY,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year BETWEEN 2020 AND 2099),
  type VARCHAR(20) NOT NULL CHECK (type IN ('DRIVER','OFFICE')),
  mode VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (mode IN ('MANUAL','AUTO')),
  "regionId" INT REFERENCES "Region"(id),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','PAID')),
  "confirmedBy" INT,
  "confirmedAt" TIMESTAMPTZ,
  "paidAt" TIMESTAMPTZ,
  notes TEXT,
  version INT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique indexes for period uniqueness (handles NULL regionId)
CREATE UNIQUE INDEX IF NOT EXISTS idx_period_unique_with_region
  ON "PayrollPeriod" (month, year, type, "regionId")
  WHERE "regionId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_period_unique_null_region
  ON "PayrollPeriod" (month, year, type)
  WHERE "regionId" IS NULL;

CREATE INDEX IF NOT EXISTS idx_period_status ON "PayrollPeriod" (status);
CREATE INDEX IF NOT EXISTS idx_period_year_month ON "PayrollPeriod" (year, month);

-- 5. PayrollEntry
CREATE TABLE IF NOT EXISTS "PayrollEntry" (
  id SERIAL PRIMARY KEY,
  "periodId" INT NOT NULL REFERENCES "PayrollPeriod"(id) ON DELETE CASCADE,
  "employeeId" INT NOT NULL REFERENCES "Employee"(id),
  "totalIncome" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "totalDeduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "netPay" DECIMAL(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  version INT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("periodId", "employeeId")
);
CREATE INDEX IF NOT EXISTS idx_payrollentry_period ON "PayrollEntry" ("periodId");
CREATE INDEX IF NOT EXISTS idx_payrollentry_employee ON "PayrollEntry" ("employeeId");

-- 6. PayrollLine
CREATE TABLE IF NOT EXISTS "PayrollLine" (
  id SERIAL PRIMARY KEY,
  "entryId" INT NOT NULL REFERENCES "PayrollEntry"(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('INCOME','DEDUCTION')),
  "lineType" VARCHAR(50) NOT NULL,
  description TEXT,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL','AUTO','TOUR')),
  "tripId" INT REFERENCES "Trip"(id),
  "tripDate" DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payrollline_entry ON "PayrollLine" ("entryId");
CREATE INDEX IF NOT EXISTS idx_payrollline_trip ON "PayrollLine" ("tripId");
