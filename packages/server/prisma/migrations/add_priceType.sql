ALTER TABLE "PricingRow" ADD COLUMN IF NOT EXISTS "priceType" VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER';
CREATE INDEX IF NOT EXISTS idx_pricingrow_pricetype ON "PricingRow" ("priceType");
