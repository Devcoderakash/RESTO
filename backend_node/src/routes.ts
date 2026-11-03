import { Router } from 'express';
import { extractTenant, requireStaffAuth } from './middleware/auth.js';
import { generalLimiter, orderLimiter, authLimiter } from './middleware/rateLimiter.js';

import * as analyticsController from './modules/analytics/controller.js';
import * as restaurantController from './modules/restaurants/controller.js';
import * as tableController from './modules/tables/controller.js';
import * as categoryController from './modules/categories/controller.js';
import * as menuController from './modules/menu/controller.js';
import * as orderController from './modules/orders/controller.js';
import * as paymentController from './modules/payments/controller.js';
import * as serviceRequestController from './modules/service-requests/controller.js';
import * as staffController from './modules/staff/controller.js';
import * as uploadController from './modules/uploads/controller.js';
import * as realtimeController from './modules/realtime/controller.js';

export function createApiRouter(): Router {
  const router = Router();

  // Rate limiting and tenant extraction
  router.use(generalLimiter);
  router.use(extractTenant);

  // 1. System Probes & Health (Public)
  router.get('/health/live', analyticsController.getLiveness);
  router.get('/health/ready', analyticsController.getReadiness);
  router.get('/health', analyticsController.getDiagnostics);

  // 2. Restaurants & Settings
  router.get('/restaurants/info', restaurantController.getRestaurantInfo);
  router.get('/restaurants/:slug', restaurantController.getRestaurantBySlug);
  router.get('/staff/restaurant-settings', requireStaffAuth, restaurantController.getStaffSettings);
  router.put('/restaurants/settings', requireStaffAuth, restaurantController.updateRestaurantSettings);

  // 3. Tables
  router.get('/tables/availability', tableController.getAvailability);
  router.get('/tables', requireStaffAuth, tableController.listTables);
  router.post('/tables', requireStaffAuth, tableController.createTable);
  router.get('/tables/:id', requireStaffAuth, tableController.getTableById);
  router.put('/tables/:id', requireStaffAuth, tableController.updateTable);
  router.delete('/tables/:id', requireStaffAuth, tableController.deleteTable);
  router.patch('/tables/:id/status', requireStaffAuth, tableController.updateTableStatus);

  // 4. Categories
  router.get('/categories', requireStaffAuth, categoryController.listCategories);
  router.post('/categories', requireStaffAuth, categoryController.createCategory);
  router.put('/categories/:id', requireStaffAuth, categoryController.updateCategory);
  router.delete('/categories/:id', requireStaffAuth, categoryController.deleteCategory);

  // 5. Menu Items
  router.get('/menu', menuController.getPublicMenu);
  router.get('/menu/:id', menuController.getMenuItemById);
  router.get('/staff/menu', requireStaffAuth, menuController.getStaffMenu);
  router.post('/staff/menu', requireStaffAuth, menuController.createMenuItem);
  router.put('/menu/:id', requireStaffAuth, menuController.updateMenuItem);
  router.delete('/menu/:id', requireStaffAuth, menuController.deleteMenuItem);
  router.patch('/menu/:id/availability', requireStaffAuth, menuController.toggleAvailability);

  // 6. Orders
  router.get('/orders', requireStaffAuth, orderController.listOrders);
  router.post('/orders', orderLimiter, orderController.createOrder);
  router.get('/orders/:id/tracking', orderController.getOrderTracking);
  router.get('/orders/:id', requireStaffAuth, orderController.getOrderById);
  router.patch('/orders/:id/status', requireStaffAuth, orderController.updateOrderStatus);

  // 7. Service Requests
  router.get('/service-requests', requireStaffAuth, serviceRequestController.listServiceRequests);
  router.post('/service-requests', serviceRequestController.createServiceRequest);
  router.patch('/service-requests/:id', requireStaffAuth, serviceRequestController.updateServiceRequestStatus);

  // 8. Payments
  router.get('/payments', requireStaffAuth, paymentController.listPayments);
  router.post('/payments', requireStaffAuth, paymentController.createPayment);
  router.patch('/payments/:id/status', requireStaffAuth, paymentController.updatePaymentStatus);

  // 9. Dashboard Analytics
  router.get('/dashboard/overview', requireStaffAuth, analyticsController.getDashboardOverview);
  router.get('/dashboard/daily-sales', requireStaffAuth, analyticsController.getDailySales);
  router.get('/dashboard/recent-orders', requireStaffAuth, analyticsController.getRecentOrders);

  // 10. Staff & Authentication
  router.get('/staff', requireStaffAuth, staffController.listStaff);
  router.post('/staff', requireStaffAuth, staffController.createStaff);
  router.patch('/staff/:id/status', requireStaffAuth, staffController.updateStaffStatus);
  router.post('/auth/login', authLimiter, staffController.login);
  router.get('/auth/me', requireStaffAuth, staffController.getProfile);

  // 11. Media Uploads
  router.post('/uploads/menu-image', requireStaffAuth, uploadController.uploadMenuImage);

  // 12. Real-Time Streaming & Reconnection Sync
  router.get('/realtime/stream', realtimeController.streamEvents);
  router.get('/realtime/sync', requireStaffAuth, realtimeController.syncMissedEvents);

  return router;
}
