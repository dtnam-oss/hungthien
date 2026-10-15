/* Shared types for trip components */

export interface TripRow {
  id: number;
  tripCode: string;
  tripDate: string;
  status: string;
  revenue: string | null;
  totalCost: string | null;
  profit: string | null;
  unitPrice: string | null;
  cargoWeight: string | null;
  actualKm: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  cargoDescription: string | null;
  notes: string | null;
  tripType: string;
  version: number;
  isLocked: boolean;
  costCount: number;
  Customer: { id: number; code: string; name: string } | null;
  Route: { id: number; code: string; name: string; origin: string | null; destination: string | null } | null;
  Vehicle: { id: number; plateNumber: string; Supplier: { id: number; name: string } | null } | null;
  primaryDriver: { id: number; fullName: string } | null;
  secondaryDriver: { id: number; fullName: string } | null;
  AccountingPeriod: { id: number; code: string; status: string } | null;
}

export interface TripCostItem {
  id: number;
  costType: string;
  amount: string;
  description: string | null;
  receiptNumber: string | null;
  createdAt: string;
}

export interface TripDetailData extends TripRow {
  TripCost: TripCostItem[];
  PricingRow: { id: number; unitPrice: string; validFrom: string } | null;
}

/** Form state của chế độ sửa trong drawer (mọi giá trị là chuỗi input) */
export interface TripEditForm {
  tripDate: string;
  tripType: string;
  status: string;
  unitPrice: string;
  revenue: string;
  departureTime: string;
  arrivalTime: string;
  actualKm: string;
  cargoWeight: string;
  cargoDescription: string;
  notes: string;
  version: number;
}

export interface NewCostInput {
  costType: string;
  amount: number;
  description: string | null;
}

export const COST_LABELS: Record<string, string> = {
  FUEL: 'Nhiên liệu', TOLL: 'Phí đường', REPAIR: 'Sửa chữa',
  LOADING: 'Bốc xếp', SALARY: 'Lương', OTHER: 'Khác',
};
