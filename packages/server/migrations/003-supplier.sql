-- Phase 3: Supplier Module
-- Tables: Supplier

-- ============================================================
-- Supplier — nhà cung cấp (nhà xe ngoài)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Supplier" (
    "id"              SERIAL PRIMARY KEY,
    "code"            VARCHAR(50) NOT NULL UNIQUE,
    "name"            VARCHAR(200) NOT NULL,
    "shortName"       VARCHAR(100),
    "taxCode"         VARCHAR(20),
    "phone"           VARCHAR(20),
    "email"           VARCHAR(100),
    "address"         TEXT,
    "contactPerson"   VARCHAR(200),
    "contactPhone"    VARCHAR(20),
    "bankAccount"     VARCHAR(50),
    "bankName"        VARCHAR(200),
    "maxVehicles"     INT,                     -- năng lực: số xe tối đa
    "status"          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "notes"           TEXT,
    "version"         INT NOT NULL DEFAULT 1,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "Supplier_status_check" CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))
);

CREATE INDEX IF NOT EXISTS "idx_supplier_code" ON "Supplier" ("code");
CREATE INDEX IF NOT EXISTS "idx_supplier_status" ON "Supplier" ("status");

-- Now add FK from Vehicle.supplierId → Supplier.id (was skipped in 002)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_vehicle_supplier') THEN
        ALTER TABLE "Vehicle" ADD CONSTRAINT "fk_vehicle_supplier"
            FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL;
    END IF;
END $$;
