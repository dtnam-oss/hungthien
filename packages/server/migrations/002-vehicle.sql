-- Phase 2: Vehicle Module
-- Tables: Vehicle, VehicleFinance, VehicleInspection

-- ============================================================
-- Vehicle — thông tin cơ bản phương tiện
-- ============================================================
CREATE TABLE IF NOT EXISTS "Vehicle" (
    "id"              SERIAL PRIMARY KEY,
    "plateNumber"     VARCHAR(20) NOT NULL UNIQUE,
    "type"            VARCHAR(50),           -- container, truck, trailer
    "brand"           VARCHAR(100),
    "model"           VARCHAR(100),
    "yearMfg"         INT,
    "tonnage"         NUMERIC(10,2),         -- trọng tải (tấn)
    "cubicMeters"     NUMERIC(10,2),         -- thể tích (m³)
    "fuelType"        VARCHAR(20) DEFAULT 'DIESEL',
    "ownerType"       VARCHAR(20) NOT NULL DEFAULT 'INTERNAL',  -- INTERNAL, EXTERNAL
    "supplierId"      INT,                   -- null = xe nội bộ, NOT null = xe ngoài
    "primaryDriverId" INT,
    "secondaryDriverId" INT,
    "status"          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "notes"           TEXT,
    "version"         INT NOT NULL DEFAULT 1,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "Vehicle_status_check" CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DISPOSED')),
    CONSTRAINT "Vehicle_ownerType_check" CHECK ("ownerType" IN ('INTERNAL', 'EXTERNAL')),
    CONSTRAINT "Vehicle_fuelType_check" CHECK ("fuelType" IN ('DIESEL', 'GASOLINE', 'ELECTRIC', 'CNG'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_vehicle_plateNumber" ON "Vehicle" ("plateNumber");
CREATE INDEX IF NOT EXISTS "idx_vehicle_status" ON "Vehicle" ("status");
CREATE INDEX IF NOT EXISTS "idx_vehicle_ownerType" ON "Vehicle" ("ownerType");
CREATE INDEX IF NOT EXISTS "idx_vehicle_supplierId" ON "Vehicle" ("supplierId");
CREATE INDEX IF NOT EXISTS "idx_vehicle_primaryDriverId" ON "Vehicle" ("primaryDriverId");

-- Foreign keys (safe: only if columns exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_vehicle_supplier') THEN
        ALTER TABLE "Vehicle" ADD CONSTRAINT "fk_vehicle_supplier"
            FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN undefined_table THEN
    -- Supplier table doesn't exist yet (Phase 3) — skip FK
    NULL;
END $$;

ALTER TABLE "Vehicle" DROP CONSTRAINT IF EXISTS "fk_vehicle_primaryDriver";
ALTER TABLE "Vehicle" ADD CONSTRAINT "fk_vehicle_primaryDriver"
    FOREIGN KEY ("primaryDriverId") REFERENCES "Employee"("id") ON DELETE SET NULL;

ALTER TABLE "Vehicle" DROP CONSTRAINT IF EXISTS "fk_vehicle_secondaryDriver";
ALTER TABLE "Vehicle" ADD CONSTRAINT "fk_vehicle_secondaryDriver"
    FOREIGN KEY ("secondaryDriverId") REFERENCES "Employee"("id") ON DELETE SET NULL;

-- ============================================================
-- VehicleFinance — thông tin tài chính phương tiện
-- ============================================================
CREATE TABLE IF NOT EXISTS "VehicleFinance" (
    "id"              SERIAL PRIMARY KEY,
    "vehicleId"       INT NOT NULL UNIQUE,
    "purchasePrice"   NUMERIC(18,2),         -- giá mua
    "purchaseDate"    DATE,
    "loanAmount"      NUMERIC(18,2),         -- khoản vay
    "interestRate"    NUMERIC(5,2),          -- lãi suất %/năm
    "loanStartDate"   DATE,
    "loanEndDate"     DATE,
    "monthlyPayment"  NUMERIC(18,2),         -- trả góp/tháng
    "insuranceFee"    NUMERIC(18,2),         -- bảo hiểm/năm
    "roadTax"         NUMERIC(18,2),         -- phí đường bộ/năm
    "depreciation"    NUMERIC(18,2),         -- khấu hao/tháng
    "notes"           TEXT,
    "version"         INT NOT NULL DEFAULT 1,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "fk_vehiclefinance_vehicle"
        FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE
);

-- ============================================================
-- VehicleInspection — lịch sử đăng kiểm
-- ============================================================
CREATE TABLE IF NOT EXISTS "VehicleInspection" (
    "id"              SERIAL PRIMARY KEY,
    "vehicleId"       INT NOT NULL,
    "inspectionDate"  DATE NOT NULL,
    "expiryDate"      DATE NOT NULL,
    "result"          VARCHAR(20) NOT NULL DEFAULT 'PASS',
    "inspectionCenter" VARCHAR(200),
    "certificateNumber" VARCHAR(100),
    "cost"            NUMERIC(18,2),
    "notes"           TEXT,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "VehicleInspection_result_check" CHECK ("result" IN ('PASS', 'FAIL', 'CONDITIONAL')),
    CONSTRAINT "fk_vehicleinspection_vehicle"
        FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_vehicleinspection_vehicleId" ON "VehicleInspection" ("vehicleId");
CREATE INDEX IF NOT EXISTS "idx_vehicleinspection_expiryDate" ON "VehicleInspection" ("expiryDate");
