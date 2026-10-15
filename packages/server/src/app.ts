/**
 * Express application — main entry point.
 *
 * Route structure:
 *   /api/auth/*       — login, current user
 *   /api/employees/*  — employee CRUD (Phase 1)
 *   /api/vehicles/*   — vehicle CRUD (Phase 2)
 *   /api/suppliers/*  — supplier CRUD (Phase 3)
 *   /api/pricing/*    — pricing CRUD (Phase 4)
 *   /api/trips/*      — trip CRUD (Phase 5)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error-handler.js';
import authRoutes from './modules/auth/auth.routes.js';
import employeeRoutes from './modules/employee/employee.routes.js';
import vehicleRoutes from './modules/vehicle/vehicle.routes.js';
import supplierRoutes from './modules/supplier/supplier.routes.js';
import pricingRoutes from './modules/pricing/pricing.routes.js';
import customerRoutes from './modules/pricing/customer.routes.js';
import routeRoutes from './modules/pricing/route.routes.js';
import tripRoutes from './modules/trip/trip.routes.js';
import accountingPeriodRoutes from './modules/trip/accounting-period.routes.js';
import tripPlanRoutes from './modules/trip-plan/trip-plan.routes.js';
import roleRoutes from './modules/role/role.routes.js';
import payrollRoutes from './modules/payroll/payroll.routes.js';
import { createLogger } from './shared/logger.js';

const logger = createLogger('app');
const PORT = Number(process.env.PORT) || 3001;

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors({ origin: ['http://localhost:5174', 'http://127.0.0.1:5174'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('short'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/accounting-periods', accountingPeriodRoutes);
app.use('/api/trip-plans', tripPlanRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/payroll', payrollRoutes);

// Global error handler — must be last
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`TMS Server running on port ${PORT}`);
});

export default app;
