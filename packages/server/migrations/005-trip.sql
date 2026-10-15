-- Phase 5: Trip Module
-- Tables: Trip, TripCost, AccountingPeriod

-- ============================================================
-- AccountingPeriod — kỳ kế toán (R5: snapshot kỳ)
-- ============================================================
CREATE TABLE IF NOT EXISTS "AccountingPeriod" (
    "id"              SERIAL PRIMARY KEY,
    "code"            VARCHAR(20) NOT NULL UNIQUE,       -- e.g. "2026-09"
    "name"            VARCHAR(100) NOT NULL,              -- e.g. "Tháng 9/2026"
    "startDate"       DATE NOT NULL,
    "endDate"         DATE NOT NULL,
    "status"          VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "closedAt"        TIMESTAMPTZ,
    "closedBy"        INT,
    "notes"           TEXT,
    "version"         INT NOT NULL DEFAULT 1,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "AccountingPeriod_status_check" CHECK ("status" IN ('OPEN', 'CLOSED')),
    CONSTRAINT "AccountingPeriod_date_check" CHECK ("endDate" >= "startDate"),
    CONSTRAINT "fk_accountingperiod_closedby"
        FOREIGN KEY ("closedBy") REFERENCES "Employee"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_accountingperiod_code" ON "AccountingPeriod" ("code");

-- ============================================================
-- Trip — chuyến đi
-- ============================================================
CREATE TABLE IF NOT EXISTS "Trip" (
    "id"                SERIAL PRIMARY KEY,
    "tripCode"          VARCHAR(50) NOT NULL UNIQUE,
    "tripDate"          DATE NOT NULL,
    "customerId"        INT NOT NULL,
    "routeId"           INT NOT NULL,
    "vehicleId"         INT NOT NULL,
    "primaryDriverId"   INT,
    "secondaryDriverId" INT,
    "tripType"          VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
    "status"            VARCHAR(20) NOT NULL DEFAULT 'PLANNED',

    -- Financials (R4: calcTripFinancials tính rồi ghi vào)
    "revenue"           NUMERIC(18,2) DEFAULT 0,
    "totalCost"         NUMERIC(18,2) DEFAULT 0,
    "profit"            NUMERIC(18,2) DEFAULT 0,
    "unitPrice"         NUMERIC(18,2),                  -- giá tra từ lookupPrice
    "pricingRowId"      INT,                            -- FK tới PricingRow đã dùng

    -- Accounting period (R5)
    "accountingPeriodId" INT,

    "departureTime"     TIMESTAMPTZ,
    "arrivalTime"       TIMESTAMPTZ,
    "actualKm"          NUMERIC(10,1),
    "cargoWeight"       NUMERIC(10,2),
    "cargoDescription"  TEXT,
    "notes"             TEXT,
    "version"           INT NOT NULL DEFAULT 1,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "Trip_status_check" CHECK ("status" IN ('PLANNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT "fk_trip_customer" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT,
    CONSTRAINT "fk_trip_route" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT,
    CONSTRAINT "fk_trip_vehicle" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT,
    CONSTRAINT "fk_trip_primarydriver" FOREIGN KEY ("primaryDriverId") REFERENCES "Employee"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_trip_secondarydriver" FOREIGN KEY ("secondaryDriverId") REFERENCES "Employee"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_trip_pricingrow" FOREIGN KEY ("pricingRowId") REFERENCES "PricingRow"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_trip_accountingperiod" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_trip_tripdate" ON "Trip" ("tripDate");
CREATE INDEX IF NOT EXISTS "idx_trip_status" ON "Trip" ("status");
CREATE INDEX IF NOT EXISTS "idx_trip_customer" ON "Trip" ("customerId");
CREATE INDEX IF NOT EXISTS "idx_trip_vehicle" ON "Trip" ("vehicleId");
CREATE INDEX IF NOT EXISTS "idx_trip_accountingperiod" ON "Trip" ("accountingPeriodId");
CREATE INDEX IF NOT EXISTS "idx_trip_primarydriver" ON "Trip" ("primaryDriverId");

-- ============================================================
-- TripCost — chi phí chuyến
-- ============================================================
CREATE TABLE IF NOT EXISTS "TripCost" (
    "id"              SERIAL PRIMARY KEY,
    "tripId"          INT NOT NULL,
    "costType"        VARCHAR(50) NOT NULL,              -- FUEL, TOLL, REPAIR, LOADING, OTHER
    "amount"          NUMERIC(18,2) NOT NULL,
    "description"     TEXT,
    "receiptNumber"   VARCHAR(100),
    "version"         INT NOT NULL DEFAULT 1,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "TripCost_costType_check" CHECK ("costType" IN ('FUEL', 'TOLL', 'REPAIR', 'LOADING', 'SALARY', 'OTHER')),
    CONSTRAINT "fk_tripcost_trip" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_tripcost_trip" ON "TripCost" ("tripId");
