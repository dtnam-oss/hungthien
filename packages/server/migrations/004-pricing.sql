-- Phase 4: Pricing Module
-- Tables: Customer, Route, PricingRow

-- ============================================================
-- Customer — khách hàng (danh mục đơn giản)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Customer" (
    "id"              SERIAL PRIMARY KEY,
    "code"            VARCHAR(50) NOT NULL UNIQUE,
    "name"            VARCHAR(200) NOT NULL,
    "shortName"       VARCHAR(100),
    "taxCode"         VARCHAR(20),
    "phone"           VARCHAR(20),
    "email"           VARCHAR(100),
    "address"         TEXT,
    "contactPerson"   VARCHAR(200),
    "status"          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "notes"           TEXT,
    "version"         INT NOT NULL DEFAULT 1,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "Customer_status_check" CHECK ("status" IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX IF NOT EXISTS "idx_customer_code" ON "Customer" ("code");
CREATE INDEX IF NOT EXISTS "idx_customer_status" ON "Customer" ("status");

-- ============================================================
-- Route — tuyến đường
-- ============================================================
CREATE TABLE IF NOT EXISTS "Route" (
    "id"              SERIAL PRIMARY KEY,
    "code"            VARCHAR(50) NOT NULL UNIQUE,
    "name"            VARCHAR(200) NOT NULL,
    "origin"          VARCHAR(200),
    "destination"     VARCHAR(200),
    "distanceKm"      NUMERIC(10,1),
    "estimatedHours"  NUMERIC(5,1),
    "status"          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "notes"           TEXT,
    "version"         INT NOT NULL DEFAULT 1,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "Route_status_check" CHECK ("status" IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX IF NOT EXISTS "idx_route_code" ON "Route" ("code");

-- ============================================================
-- PricingRow — bảng giá theo khách hàng + tuyến + loại chuyến
-- R1: lookupPrice là nguồn tra giá duy nhất
-- ============================================================
CREATE TABLE IF NOT EXISTS "PricingRow" (
    "id"              SERIAL PRIMARY KEY,
    "customerId"      INT NOT NULL,
    "routeId"         INT NOT NULL,
    "tripType"        VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
    "unitPrice"       NUMERIC(18,2) NOT NULL,          -- giá/chuyến
    "currency"        VARCHAR(10) NOT NULL DEFAULT 'VND',
    "validFrom"       DATE NOT NULL,
    "validTo"         DATE,                             -- null = vô thời hạn
    "status"          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "notes"           TEXT,
    "version"         INT NOT NULL DEFAULT 1,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "PricingRow_status_check" CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT "fk_pricingrow_customer"
        FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT,
    CONSTRAINT "fk_pricingrow_route"
        FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_pricingrow_customer" ON "PricingRow" ("customerId");
CREATE INDEX IF NOT EXISTS "idx_pricingrow_route" ON "PricingRow" ("routeId");
CREATE INDEX IF NOT EXISTS "idx_pricingrow_validFrom" ON "PricingRow" ("validFrom");
CREATE INDEX IF NOT EXISTS "idx_pricingrow_status" ON "PricingRow" ("status");
-- Composite index for lookupPrice query
CREATE INDEX IF NOT EXISTS "idx_pricingrow_lookup" ON "PricingRow" ("customerId", "routeId", "tripType", "status", "validFrom");
