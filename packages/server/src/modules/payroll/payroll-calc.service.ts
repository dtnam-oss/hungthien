import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';

/**
 * AUTO salary calculation for driver periods.
 *
 * salaryType:
 *   PER_TRIP  → 1 line per completed trip, amount = trip.driverSalary (or revenue).
 *               Two-driver trips: each driver gets half.
 *   FIXED_MONTH → 1 line per day with ≥1 completed trip. amount = baseSalary ÷ days-in-month.
 *               Two-driver trips: each driver gets full daily rate (not halved).
 *
 * Trip completion date: arrivalTime ?? tripDate (fallback for legacy data).
 */
export class PayrollCalcService {
  constructor(private prisma: PrismaClient) {}

  async calculate(periodId: number) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: { PayrollEntry: { include: { Employee: true } } },
    });
    if (!period) throw new NotFoundError('Kỳ lương');
    if (period.status !== 'DRAFT') throw new ForbiddenError('Chỉ kỳ DRAFT mới tính lại được.');
    if (period.type !== 'DRIVER') throw new ForbiddenError('Tính tự động chỉ áp dụng cho kỳ tài xế.');

    // Advisory lock per period to prevent concurrent calc
    await this.prisma.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${periodId})`);

    const daysInMonth = new Date(period.year, period.month, 0).getDate();
    const monthStart = new Date(period.year, period.month - 1, 1);
    const monthEnd = new Date(period.year, period.month, 0, 23, 59, 59, 999);

    // Delete AUTO lines only — preserve MANUAL lines
    const entryIds = period.PayrollEntry.map((e) => e.id);
    if (entryIds.length > 0) {
      await this.prisma.payrollLine.deleteMany({
        where: { entryId: { in: entryIds }, source: 'AUTO' },
      });
    }

    // Find completed trips in this month
    // Use arrivalTime for completion date, fallback to tripDate
    const trips = await this.prisma.trip.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { arrivalTime: { gte: monthStart, lte: monthEnd } },
          { arrivalTime: null, tripDate: { gte: monthStart, lte: monthEnd } },
        ],
      },
      select: {
        id: true, tripCode: true, tripDate: true, arrivalTime: true,
        primaryDriverId: true, secondaryDriverId: true,
        driverSalary: true, revenue: true,
      },
    });

    // Process each entry (driver)
    const linesToCreate: any[] = [];

    for (const entry of period.PayrollEntry) {
      const emp = entry.Employee;
      const salaryType = (emp as any).salaryType || 'PER_TRIP';
      const baseSalary = Number((emp as any).baseSalary) || 0;

      // Trips where this driver participated
      const driverTrips = trips.filter(
        (t) => t.primaryDriverId === emp.id || t.secondaryDriverId === emp.id,
      );

      if (salaryType === 'PER_TRIP') {
        for (const trip of driverTrips) {
          const rawAmount = Number(trip.driverSalary) || Number(trip.revenue) || 0;
          const isTwoDrivers = trip.primaryDriverId && trip.secondaryDriverId;
          const amount = isTwoDrivers ? rawAmount / 2 : rawAmount;
          const tripCompletionDate = trip.arrivalTime || trip.tripDate;

          linesToCreate.push({
            entryId: entry.id,
            category: 'INCOME',
            lineType: 'TRIP_SALARY',
            description: `Chuyến ${trip.tripCode}`,
            amount,
            source: 'AUTO',
            tripId: trip.id,
            tripDate: tripCompletionDate,
          });
        }
      } else if (salaryType === 'FIXED_MONTH') {
        // 1 line per day with ≥1 completed trip
        const dailyRate = baseSalary / daysInMonth;
        const daysWithTrips = new Set<string>();

        for (const trip of driverTrips) {
          const d = trip.arrivalTime || trip.tripDate;
          if (d) daysWithTrips.add(new Date(d).toISOString().split('T')[0]);
        }

        for (const dayStr of daysWithTrips) {
          linesToCreate.push({
            entryId: entry.id,
            category: 'INCOME',
            lineType: 'DAILY_SALARY',
            description: `Lương khoán ${dayStr}`,
            amount: Math.round(dailyRate * 100) / 100,
            source: 'AUTO',
            tripDate: new Date(dayStr),
          });
        }
      }
    }

    // Bulk create
    if (linesToCreate.length > 0) {
      await this.prisma.payrollLine.createMany({ data: linesToCreate });
    }

    // Recalc all entry totals
    for (const entry of period.PayrollEntry) {
      const lines = await this.prisma.payrollLine.findMany({ where: { entryId: entry.id } });
      let totalIncome = 0;
      let totalDeduction = 0;
      for (const l of lines) {
        const amt = Number(l.amount);
        if (l.category === 'INCOME') totalIncome += amt;
        else totalDeduction += amt;
      }
      await this.prisma.payrollEntry.update({
        where: { id: entry.id },
        data: { totalIncome, totalDeduction, netPay: totalIncome - totalDeduction, updatedAt: new Date() },
      });
    }

    return { calculated: linesToCreate.length, entries: period.PayrollEntry.length };
  }

  /* ── Diff check: run calc in savepoint then rollback ────────────── */
  async diffCheck(periodId: number) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        PayrollEntry: {
          include: {
            Employee: { select: { id: true, code: true, fullName: true } },
          },
        },
      },
    });
    if (!period) throw new NotFoundError('Kỳ lương');

    // Get current totals
    const currentTotals: Record<number, { totalIncome: number; totalDeduction: number; netPay: number }> = {};
    for (const entry of period.PayrollEntry) {
      currentTotals[entry.employeeId] = {
        totalIncome: Number(entry.totalIncome),
        totalDeduction: Number(entry.totalDeduction),
        netPay: Number(entry.netPay),
      };
    }

    // Simulate recalc — just count what AUTO lines WOULD produce
    // Without actually modifying data
    const daysInMonth = new Date(period.year, period.month, 0).getDate();
    const monthStart = new Date(period.year, period.month - 1, 1);
    const monthEnd = new Date(period.year, period.month, 0, 23, 59, 59, 999);

    const trips = await this.prisma.trip.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { arrivalTime: { gte: monthStart, lte: monthEnd } },
          { arrivalTime: null, tripDate: { gte: monthStart, lte: monthEnd } },
        ],
      },
      select: {
        id: true, primaryDriverId: true, secondaryDriverId: true,
        driverSalary: true, revenue: true, arrivalTime: true, tripDate: true,
      },
    });

    const diffs: any[] = [];

    for (const entry of period.PayrollEntry) {
      const emp = entry.Employee;
      // Get MANUAL lines (would be preserved)
      const manualLines = await this.prisma.payrollLine.findMany({
        where: { entryId: entry.id, source: { not: 'AUTO' } },
      });

      let simIncome = 0;
      let simDeduction = 0;
      for (const ml of manualLines) {
        if (ml.category === 'INCOME') simIncome += Number(ml.amount);
        else simDeduction += Number(ml.amount);
      }

      // Simulate AUTO lines
      const driverTrips = trips.filter(
        (t) => t.primaryDriverId === emp.id || t.secondaryDriverId === emp.id,
      );

      const salaryType = (emp as any).salaryType || 'PER_TRIP';
      const baseSalary = Number((emp as any).baseSalary) || 0;

      if (salaryType === 'PER_TRIP') {
        for (const trip of driverTrips) {
          const rawAmt = Number(trip.driverSalary) || Number(trip.revenue) || 0;
          const isTwoDrivers = trip.primaryDriverId && trip.secondaryDriverId;
          simIncome += isTwoDrivers ? rawAmt / 2 : rawAmt;
        }
      } else if (salaryType === 'FIXED_MONTH') {
        const dailyRate = baseSalary / daysInMonth;
        const days = new Set<string>();
        for (const trip of driverTrips) {
          const d = trip.arrivalTime || trip.tripDate;
          if (d) days.add(new Date(d).toISOString().split('T')[0]);
        }
        simIncome += days.size * (Math.round(dailyRate * 100) / 100);
      }

      const simNetPay = simIncome - simDeduction;
      const current = currentTotals[emp.id];
      if (!current) continue;

      const incomeDiff = simIncome - current.totalIncome;
      const netDiff = simNetPay - current.netPay;

      if (Math.abs(incomeDiff) > 0.01 || Math.abs(netDiff) > 0.01) {
        diffs.push({
          employeeId: emp.id,
          employeeCode: (emp as any).code,
          employeeName: (emp as any).fullName,
          currentIncome: current.totalIncome,
          simulatedIncome: simIncome,
          incomeDiff,
          currentNetPay: current.netPay,
          simulatedNetPay: simNetPay,
          netDiff,
        });
      }
    }

    return { hasDiff: diffs.length > 0, diffs };
  }
}
