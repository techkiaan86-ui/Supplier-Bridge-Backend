import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import roleRoutes from './routes/role.routes';
import permissionRoutes from './routes/permission.routes';
import shift4shopOAuthRoutes from './routes/shift4shopOAuth.routes';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';

const app: Application = express();

import { checkMaintenanceMode } from './middleware/maintenance.middleware';

// Security and utility middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Static folder for media uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Global Maintenance Mode check for API routes
app.use('/api', checkMaintenanceMode);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/v1/store', shift4shopOAuthRoutes);

// Phase 2 Routes
import supplierRoutes from './routes/supplier.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import brandRoutes from './routes/brand.routes';
import storeRoutes from './routes/store.routes';

import metricsRoutes from './routes/metrics.routes';
import pricingRoutes from './routes/pricing.routes';
import manufacturerRoutes from './routes/manufacturer.routes';
import variantRoutes from './routes/variant.routes';
import attributeRoutes from './routes/attribute.routes';
import mediaRoutes from './routes/media.routes';
import mappingRoutes from './routes/mapping.routes';
import validationRoutes from './routes/validation.routes';
import syncRoutes from './routes/sync.routes';
import reportsRoutes from './routes/reports.routes';
import logsRoutes from './routes/logs.routes';
import notificationRoutes from './routes/notification.routes';
import settingRoutes from './routes/setting.routes';
import importRoutes from './routes/import.routes';
import integrationRoutes from './routes/integration.routes';
import apikeyRoutes from './routes/apikey.routes';
import securityRoutes from './routes/security.routes';
import orderRoutes from './routes/order.routes';
import { checkIpWhitelist } from './middleware/ipWhitelist.middleware';

// Global IP Whitelist check for API routes
app.use('/api', checkIpWhitelist);

app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', metricsRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/manufacturers', manufacturerRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/mappings', mappingRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/apikeys', apikeyRoutes);
app.use('/api/security', securityRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Force restart for attribute routes
export default app;

// Waking nodemon up
