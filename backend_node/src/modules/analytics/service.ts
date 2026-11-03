import { checkDatabaseHealth, query } from '../../database/db.js';

export class AnalyticsService {
  public async getLiveness() {
    return {
      status: 'alive',
      service: 'resto-backend-node',
      timestamp: new Date().toISOString(),
    };
  }

  public async getReadiness() {
    const health = await checkDatabaseHealth();
    if (!health.connected) {
      return {
        ready: false,
        statusCode: 503,
        payload: {
          status: 'not_ready',
          database: 'disconnected',
          database_vendor: 'postgresql',
          db_latency_ms: health.latencyMs,
          error: health.error,
          timestamp: new Date().toISOString(),
        },
      };
    }
    return {
      ready: true,
      statusCode: 200,
      payload: {
        status: 'ready',
        database: 'connected',
        database_vendor: 'postgresql',
        db_latency_ms: health.latencyMs,
        timestamp: new Date().toISOString(),
      },
    };
  }

  public async getHealthDiagnostics() {
    const dbHealth = await checkDatabaseHealth();
    return {
      status: dbHealth.connected ? 'ok' : 'degraded',
      database_vendor: 'postgresql',
      database_configured: true,
      database_connected: dbHealth.connected,
      db_latency_ms: dbHealth.latencyMs,
      supabase: 'connected',
      storage: 'online',
      timestamp: new Date().toISOString(),
    };
  }

  public async getDashboardOverview(restaurantId: string) {
    // 1. Total & Pending orders, and Revenue
    const orderStatsSql = `
      SELECT
        COUNT(*) AS total_orders,
        COUNT(CASE WHEN status IN ('pending', 'confirmed', 'preparing') THEN 1 ELSE NULL END) AS pending_orders,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN final_total ELSE 0 END), 0) AS today_revenue,
        COALESCE(AVG(CASE WHEN status != 'cancelled' THEN final_total ELSE NULL END), 0) AS avg_order_value
      FROM resto_v2.orders
      WHERE restaurant_id = $1;
    `;
    const orderRes = await query(orderStatsSql, [restaurantId]);
    const orderStats = orderRes.rows[0] || {};

    // 2. Total & Active tables
    const tableStatsSql = `
      SELECT
        COUNT(*) AS total_tables,
        COUNT(CASE WHEN status = 'occupied' THEN 1 ELSE NULL END) AS active_tables
      FROM resto_v2.restaurant_tables
      WHERE restaurant_id = $1 AND status <> 'inactive';
    `;
    const tableRes = await query(tableStatsSql, [restaurantId]);
    const tableStats = tableRes.rows[0] || {};

    const todayRevenue = Number(parseFloat(orderStats.today_revenue || '0').toFixed(2));
    const averageOrderValue = Number(parseFloat(orderStats.avg_order_value || '0').toFixed(2));

    return {
      todayRevenue,
      today_revenue: todayRevenue,
      currency: 'INR',
      totalOrders: Number(orderStats.total_orders || 0),
      total_orders: Number(orderStats.total_orders || 0),
      activeTables: Number(tableStats.active_tables || 0),
      active_tables: Number(tableStats.active_tables || 0),
      totalTables: Number(tableStats.total_tables || 0),
      total_tables: Number(tableStats.total_tables || 0),
      averageOrderValue,
      average_order_value: averageOrderValue,
      pendingOrders: Number(orderStats.pending_orders || 0),
      pending_orders: Number(orderStats.pending_orders || 0),
    };
  }

  public async getDailySales(restaurantId: string, _days = 7) {
    const sql = `
      SELECT id, final_total AS total, created_at
      FROM resto_v2.orders
      WHERE restaurant_id = $1 AND status != 'cancelled'
      ORDER BY created_at ASC;
    `;
    const res = await query(sql, [restaurantId]);
    const salesMap = new Map<string, number>();
    for (const row of res.rows) {
      const dateStr = new Date(row.created_at).toISOString().slice(0, 10);
      const current = salesMap.get(dateStr) || 0;
      salesMap.set(dateStr, Number((current + Number(row.total)).toFixed(2)));
    }
    const sales = Array.from(salesMap.entries()).map(([date, total]) => ({ date, total }));
    return { sales };
  }

  public async getRecentOrders(restaurantId: string, limit = 10) {
    const sql = `
      SELECT * FROM resto_v2.orders
      WHERE restaurant_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;
    const res = await query(sql, [restaurantId, limit]);
    return { orders: res.rows };
  }
}
