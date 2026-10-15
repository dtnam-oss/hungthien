import type { PrismaClient } from '@prisma/client';

const INCLUDE_RELATIONS = {
  Customer: { select: { id: true, name: true, code: true } },
  Route: { select: { id: true, name: true, code: true, origin: true, destination: true } },
  Vehicle: { select: { id: true, plateNumber: true, type: true } },
  Employee_TripPlan_primaryDriverIdToEmployee: { select: { id: true, fullName: true, code: true } },
  Employee_TripPlan_secondaryDriverIdToEmployee: { select: { id: true, fullName: true, code: true } },
};

export class TripPlanService {
  constructor(private prisma: PrismaClient) {}

  async list(params: {
    page?: number; pageSize?: number;
    search?: string; customerId?: number;
  }) {
    const { page = 1, pageSize = 50, search, customerId } = params;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { Route: { name: { contains: search, mode: 'insensitive' } } },
        { Vehicle: { plateNumber: { contains: search, mode: 'insensitive' } } },
        { Employee_TripPlan_primaryDriverIdToEmployee: { fullName: { contains: search, mode: 'insensitive' } } },
        { Employee_TripPlan_secondaryDriverIdToEmployee: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [data, total, activeCount] = await Promise.all([
      this.prisma.tripPlan.findMany({
        where,
        include: INCLUDE_RELATIONS,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tripPlan.count({ where }),
      this.prisma.tripPlan.count({ where: { ...where, isActive: true } }),
    ]);
    return { data, total, activeCount, page, pageSize };
  }

  async getById(id: number) {
    return this.prisma.tripPlan.findUnique({ where: { id }, include: INCLUDE_RELATIONS });
  }

  async create(data: {
    customerId: number; routeId: number; vehicleId: number;
    primaryDriverId?: number | null; secondaryDriverId?: number | null;
    scheduleDays: number[]; timeSlots?: string[]; notes?: string | null;
  }) {
    return this.prisma.tripPlan.create({ data, include: INCLUDE_RELATIONS });
  }

  async update(id: number, data: {
    customerId?: number; routeId?: number; vehicleId?: number;
    primaryDriverId?: number | null; secondaryDriverId?: number | null;
    scheduleDays?: number[]; timeSlots?: string[]; isActive?: boolean; notes?: string | null;
    version: number;
  }) {
    const { version, ...rest } = data;
    const existing = await this.prisma.tripPlan.findUnique({ where: { id } });
    if (!existing) throw Object.assign(new Error('Không tìm thấy kế hoạch'), { status: 404 });
    if (existing.version !== version) throw Object.assign(new Error('Dữ liệu đã bị thay đổi bởi người khác'), { status: 409 });
    return this.prisma.tripPlan.update({
      where: { id },
      data: { ...rest, version: { increment: 1 }, updatedAt: new Date() },
      include: INCLUDE_RELATIONS,
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.tripPlan.findUnique({ where: { id } });
    if (!existing) throw Object.assign(new Error('Không tìm thấy kế hoạch'), { status: 404 });
    await this.prisma.tripPlan.delete({ where: { id } });
    return { success: true };
  }

  async toggleActive(id: number, isActive: boolean) {
    const existing = await this.prisma.tripPlan.findUnique({ where: { id } });
    if (!existing) throw Object.assign(new Error('Không tìm thấy kế hoạch'), { status: 404 });
    return this.prisma.tripPlan.update({
      where: { id },
      data: { isActive, version: { increment: 1 }, updatedAt: new Date() },
      include: INCLUDE_RELATIONS,
    });
  }

  async generateTrips(params: { startDate: string; endDate: string; planIds?: number[] }) {
    const { startDate, endDate, planIds } = params;
    const where: any = { isActive: true };
    if (planIds && planIds.length > 0) where.id = { in: planIds };

    const plans = await this.prisma.tripPlan.findMany({ where, include: INCLUDE_RELATIONS });
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    let created = 0;
    let skipped = 0;

    for (const plan of plans) {
      const current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay(); // 0=Sun..6=Sat
        if (plan.scheduleDays.includes(dayOfWeek)) {
          const tripDate = current.toISOString().split('T')[0];
          // Check if trip already exists for same route + vehicle + date
          const exists = await this.prisma.trip.findFirst({
            where: {
              routeId: plan.routeId,
              vehicleId: plan.vehicleId,
              tripDate: new Date(tripDate),
            },
          });
          if (exists) {
            skipped++;
          } else {
            // Auto-generate trip code: TMMDD-NNN
            const mm = String(current.getMonth() + 1).padStart(2, '0');
            const dd = String(current.getDate()).padStart(2, '0');
            const prefix = `T${mm}${dd}`;
            const lastTrip = await this.prisma.trip.findFirst({
              where: { tripCode: { startsWith: prefix } },
              orderBy: { tripCode: 'desc' },
            });
            const seq = lastTrip ? parseInt(lastTrip.tripCode.split('-')[1] || '0', 10) + 1 : 1;
            const tripCode = `${prefix}-${String(seq).padStart(3, '0')}`;

            await this.prisma.trip.create({
              data: {
                tripCode,
                tripDate: new Date(tripDate),
                customerId: plan.customerId,
                routeId: plan.routeId,
                vehicleId: plan.vehicleId,
                primaryDriverId: plan.primaryDriverId,
                secondaryDriverId: plan.secondaryDriverId,
                status: 'PLANNED',
                tripType: 'STANDARD',
              },
            });
            created++;
          }
        }
        current.setDate(current.getDate() + 1);
      }
    }

    return { created, skipped, totalPlans: plans.length };
  }
}
