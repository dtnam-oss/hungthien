-- ============================================================
-- Migration: Add missing Trip fields from Excel template
-- ============================================================

-- A. Trip — operational fields
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "cargoChannel"      VARCHAR(100);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "pickupAddress"     TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "deliveryAddress"   TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "appTrackingNumber" VARCHAR(100);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "appPlateNumber"    VARCHAR(20);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "markingCode"       VARCHAR(100);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "routeLabelCode"    VARCHAR(100);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "accountingNotes"   TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "lastEditedById"    INT;

-- B. Trip — financial fields
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "supplementarySalary"  DECIMAL(18,2);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "lobbyFee"             DECIMAL(18,2);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "operatingCostHt"      DECIMAL(18,2);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "vendorPaymentStatus"  VARCHAR(20) DEFAULT 'UNPAID';
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "htInvoiceIssued"      BOOLEAN DEFAULT false;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "vendorInvoiceIssued"  BOOLEAN DEFAULT false;

-- C. Vehicle — tonnage
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "tonnage" VARCHAR(20);

-- D. FK constraint for lastEditedById
ALTER TABLE "Trip" ADD CONSTRAINT "fk_trip_lasteditedby"
  FOREIGN KEY ("lastEditedById") REFERENCES "Employee"("id")
  ON UPDATE NO ACTION ON DELETE SET NULL;

-- E. Index for new filterable columns
CREATE INDEX IF NOT EXISTS "idx_trip_cargochannel" ON "Trip"("cargoChannel");
CREATE INDEX IF NOT EXISTS "idx_trip_vendorpaymentstatus" ON "Trip"("vendorPaymentStatus");
