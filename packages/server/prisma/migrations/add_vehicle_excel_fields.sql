-- ============================================================
-- Migration: Add Vehicle fields from Excel master data
-- ============================================================

-- A. Technical specs
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "chassisNumber"    VARCHAR(50);
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "engineNumber"     VARCHAR(50);
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "grossWeight"      INT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "curbWeight"       INT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "payloadCapacity"  INT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "lengthMm"         INT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "widthMm"          INT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "heightMm"         INT;

-- B. Compliance / documents
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "inspectionBookNumber"      VARCHAR(50);
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "registrationExpiry"        DATE;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "insuranceBodyExpiry"       DATE;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "insuranceLiabilityExpiry"  DATE;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "gpsExpiryDate"             DATE;

-- C. Administrative
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "bankName"            VARCHAR(100);
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "registeredCsgt"      BOOLEAN DEFAULT false;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "registeredRegistry"  BOOLEAN DEFAULT false;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "lastCheckedAt"       TIMESTAMPTZ;
