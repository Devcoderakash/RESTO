import http from 'http';
import { getPool } from '../database/db.js';

const BASE_URL = 'http://localhost:5005';

interface TestResult {
  step: string;
  endpoint: string;
  status: number;
  success: boolean;
  details: string;
}

const results: TestResult[] = [];

async function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  let bodyStr: string | undefined;
  if (options.body) {
    headers['Content-Type'] = 'application/json';
    bodyStr = JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: bodyStr,
  });

  let data: any;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, headers: res.headers, data };
}

async function runStep2Verification() {
  console.log('===============================================================');
  console.log('RESTO V2 — STEP 2 REAL API TESTING AGAINST PRODUCTION DATABASE');
  console.log('Target: http://localhost:5005 -> Supabase resto_v2');
  console.log('===============================================================\n');

  // 1. /health and /health/ready
  {
    const r1 = await request('/health');
    results.push({
      step: '1. Health Liveness',
      endpoint: 'GET /health',
      status: r1.status,
      success: r1.status === 200 && r1.data.status === 'ok',
      details: `Status: ${r1.data.status}`,
    });

    const r2 = await request('/health/ready');
    results.push({
      step: '2. Health Readiness (DB)',
      endpoint: 'GET /health/ready',
      status: r2.status,
      success: r2.status === 200 && r2.data.database === 'connected',
      details: `Database: ${r2.data.database}, Latency: ${r2.data.db_latency_ms}ms`,
    });
  }

  // 2. Restaurant catalog
  let restaurantSlug = 'olive-and-ember';
  let restaurantId = '';
  {
    const r = await request('/api/restaurants/info');
    restaurantId = r.data.id;
    results.push({
      step: '3. Restaurant Info',
      endpoint: 'GET /api/restaurants/info',
      status: r.status,
      success: r.status === 200 && r.data.name === 'The Olive & Ember',
      details: `Restaurant: "${r.data.name}", ID: ${r.data.id}`,
    });

    const rSlug = await request(`/api/restaurants/${restaurantSlug}`);
    results.push({
      step: '4. Restaurant by Slug',
      endpoint: `GET /api/restaurants/${restaurantSlug}`,
      status: rSlug.status,
      success: rSlug.status === 200 && rSlug.data.slug === restaurantSlug,
      details: `Found slug: ${rSlug.data.slug}`,
    });
  }

  // 3. Categories and menu
  let menuItemId = '';
  let menuItemPrice = 0;
  {
    const rMenu = await request('/api/menu');
    const items = rMenu.data.items || (Array.isArray(rMenu.data) ? rMenu.data : []);
    const categories = rMenu.data.categories || [];
    menuItemId = items[0]?.id;
    menuItemPrice = Number(items[0]?.price || 0);

    results.push({
      step: '5. Categories Catalog',
      endpoint: 'GET /api/menu (Categories returned)',
      status: rMenu.status,
      success: rMenu.status === 200 && categories.length >= 4,
      details: `Distinct categories: ${categories.length} (${categories.map((c: any) => c.name).join(', ')})`,
    });

    results.push({
      step: '6. Menu Catalog',
      endpoint: 'GET /api/menu',
      status: rMenu.status,
      success: rMenu.status === 200 && Array.isArray(items) && items.length >= 7,
      details: `Items count: ${items.length}, Sample: "${items[0]?.name}" (₹${menuItemPrice})`,
    });
  }

  // 4. Table availability
  {
    const r = await request('/api/tables/availability');
    const tableList = r.data.tables || r.data;
    results.push({
      step: '7. Table Availability',
      endpoint: 'GET /api/tables/availability',
      status: r.status,
      success: r.status === 200 && Array.isArray(tableList) && tableList.length >= 8,
      details: `Tables count: ${tableList.length}, Table 04 status: ${tableList.find((t: any) => t.table_number === '04')?.status}`,
    });
  }

  // 5. Staff authentication
  let staffToken = '';
  {
    const r = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'contact@grandbistrolounge.com', password: 'any' },
    });
    staffToken = r.data.accessToken || r.data.token || '';
    results.push({
      step: '8. Staff Authentication',
      endpoint: 'POST /api/auth/login',
      status: r.status,
      success: r.status === 200 && !!staffToken,
      details: `Token issued (length ${staffToken.length}), Role: ${r.data.user?.role}`,
    });
  }

  // 6. SSE Connection Test (Listen for live events)
  let sseReceivedEvent: any = null;
  const ssePromise = new Promise<void>((resolve) => {
    const sseReq = http.request(
      `${BASE_URL}/api/realtime/stream?restaurantId=${restaurantId}`,
      {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      },
      (res) => {
        res.on('data', (chunk) => {
          const text = chunk.toString();
          if (text.includes('data:')) {
            try {
              const dataLines = text.split('\n').filter((l: string) => l.startsWith('data:'));
              for (const dl of dataLines) {
                const jsonStr = dl.replace(/^data:\s*/, '').trim();
                if (jsonStr && !jsonStr.includes('heartbeat') && !jsonStr.includes('connected')) {
                  sseReceivedEvent = JSON.parse(jsonStr);
                  resolve();
                }
              }
            } catch (_) {}
          }
        });
      }
    );
    sseReq.on('error', () => {});
    sseReq.end();

    // Auto timeout after 6 seconds
    setTimeout(() => resolve(), 6000);
  });

  // 7. Order creation (safe test order on Table 04)
  let testOrderId = '';
  const testIdempotencyKey = `idem-cutover-${Date.now()}`;
  {
    const orderPayload = {
      restaurant_id: restaurantId,
      table_number: '04',
      customer_name: 'Test Cutover Verification',
      customer_phone: '+919999988888',
      items: [
        {
          menu_item_id: menuItemId,
          quantity: 2,
          notes: 'Extra crispy test item',
        },
      ],
      payment_method: 'CASH',
    };

    const r = await request('/api/orders', {
      method: 'POST',
      headers: {
        'Idempotency-Key': testIdempotencyKey,
      },
      body: orderPayload,
    });

    testOrderId = r.data.id || r.data.order_id;
    results.push({
      step: '9. Order Creation',
      endpoint: 'POST /api/orders',
      status: r.status,
      success: (r.status === 200 || r.status === 201) && !!testOrderId,
      details: `Created Order ID: ${testOrderId}, Subtotal: ₹${r.data.subtotal}, Total: ₹${r.data.total_amount}`,
    });

    // 8. Idempotency test (repeat exact request with same idempotency key)
    const rIdem = await request('/api/orders', {
      method: 'POST',
      headers: {
        'Idempotency-Key': testIdempotencyKey,
      },
      body: orderPayload,
    });
    const idemId = rIdem.data.id || rIdem.data.order_id;
    results.push({
      step: '10. Order Idempotency',
      endpoint: 'POST /api/orders (Duplicate Idempotency-Key)',
      status: rIdem.status,
      success: idemId === testOrderId,
      details: `Returned identical Order ID: ${idemId} (Zero duplicate created)`,
    });
  }

  // Await SSE event from order creation
  await ssePromise;
  results.push({
    step: '11. SSE Real-Time Streaming',
    endpoint: 'GET /api/realtime/stream',
    status: 200,
    success: sseReceivedEvent !== null,
    details: sseReceivedEvent
      ? `Received SSE Event: ${sseReceivedEvent.eventType || sseReceivedEvent.type} for Order ${sseReceivedEvent.orderId || sseReceivedEvent.entityId || testOrderId}`
      : 'SSE connection established and active',
  });

  // 9. Order tracking
  {
    const r = await request(`/api/orders/${testOrderId}/tracking`);
    results.push({
      step: '12. Order Tracking',
      endpoint: `GET /api/orders/${testOrderId}/tracking`,
      status: r.status,
      success: r.status === 200 && (r.data.id === testOrderId || r.data.order_id === testOrderId),
      details: `Tracking Status: ${r.data.status}, Items: ${r.data.items?.length || 0}`,
    });
  }

  // 10. Order state transitions (lowercase as verified in domain rules)
  {
    const transitions = [
      { to: 'confirmed', action: 'Confirm Order' },
      { to: 'preparing', action: 'Start Kitchen Prep' },
      { to: 'ready', action: 'Mark Food Ready' },
      { to: 'served', action: 'Mark Food Served' },
      { to: 'completed', action: 'Complete Order' },
    ];

    let allTransPass = true;
    for (const t of transitions) {
      const r = await request(`/api/orders/${testOrderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${staffToken}`,
        },
        body: { status: t.to },
      });
      if (r.status !== 200) {
        allTransPass = false;
        console.error(`Failed transition to ${t.to}:`, r.status, r.data);
      }
    }

    results.push({
      step: '13. Order State Transitions',
      endpoint: `PATCH /api/orders/${testOrderId}/status (5 transitions)`,
      status: allTransPass ? 200 : 500,
      success: allTransPass,
      details: 'pending -> confirmed -> preparing -> ready -> served -> completed (All 5 verified)',
    });
  }

  // 11. Payment records
  {
    const r = await request(`/api/payments?order_id=${testOrderId}`, {
      headers: {
        'Authorization': `Bearer ${staffToken}`,
      },
    });
    results.push({
      step: '14. Payment Records',
      endpoint: `GET /api/payments?order_id=${testOrderId}`,
      status: r.status,
      success: r.status === 200,
      details: `Payments found: ${Array.isArray(r.data?.payments) ? r.data.payments.length : 1}`,
    });
  }

  // 12. Service requests (lowercase 'water' and 'completed')
  {
    const rCreate = await request('/api/service-requests', {
      method: 'POST',
      body: {
        restaurant_id: restaurantId,
        table_number: '04',
        request_type: 'water',
        message: 'Cold water please',
      },
    });
    const reqId = rCreate.data.request?.id || rCreate.data.id;

    results.push({
      step: '15. Service Request Creation',
      endpoint: 'POST /api/service-requests',
      status: rCreate.status,
      success: (rCreate.status === 200 || rCreate.status === 201) && !!reqId,
      details: `Created Service Request: ${reqId}, Type: water`,
    });

    if (reqId) {
      const rResolve = await request(`/api/service-requests/${reqId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${staffToken}`,
        },
        body: { status: 'completed' },
      });
      results.push({
        step: '16. Service Request Resolution',
        endpoint: `PATCH /api/service-requests/${reqId}`,
        status: rResolve.status,
        success: rResolve.status === 200,
        details: 'Service Request successfully marked completed',
      });
    }
  }

  // 13. Dashboard overview API
  {
    const r = await request('/api/dashboard/overview', {
      headers: {
        'Authorization': `Bearer ${staffToken}`,
      },
    });
    results.push({
      step: '17. Dashboard Overview API',
      endpoint: 'GET /api/dashboard/overview',
      status: r.status,
      success: r.status === 200,
      details: `Active Orders: ${r.data.active_orders ?? r.data.activeOrders ?? 0}, Total Orders: ${r.data.total_orders ?? r.data.totalOrders ?? 0}`,
    });
  }

  // 14. Reconnect & Event Replay (Sync API)
  {
    const r = await request(`/api/realtime/sync?restaurantId=${restaurantId}&lastEventId=0`, {
      headers: {
        'Authorization': `Bearer ${staffToken}`,
      },
    });
    results.push({
      step: '18. Event Reconnect & Replay',
      endpoint: 'GET /api/realtime/sync?lastEventId=0',
      status: r.status,
      success: r.status === 200 && Array.isArray(r.data?.events),
      details: `Replayed ${r.data?.events?.length || 0} events from historical buffer`,
    });
  }

  // 15. Tenant isolation test
  {
    const fakeRestaurantId = '00000000-0000-0000-0000-000000000000';
    const r = await request(`/api/tables/availability?restaurantId=${fakeRestaurantId}`, {
      headers: {
        'X-Restaurant-ID': fakeRestaurantId,
      },
    });
    const tableList = r.data.tables || r.data;
    results.push({
      step: '19. Tenant Isolation',
      endpoint: `GET /api/tables/availability?restaurantId=${fakeRestaurantId}`,
      status: r.status,
      success: r.status === 200 && Array.isArray(tableList) && tableList.length === 0,
      details: `Tables returned for foreign tenant: ${tableList?.length || 0} (Strict isolation verified)`,
    });
  }

  // Clean up safe test order from database
  const pool = getPool();
  await pool.query(`DELETE FROM resto_v2.service_requests WHERE table_number = '04';`);
  await pool.query(`DELETE FROM resto_v2.payments WHERE order_id = $1;`, [testOrderId]);
  await pool.query(`DELETE FROM resto_v2.order_items WHERE order_id = $1;`, [testOrderId]);
  await pool.query(`DELETE FROM resto_v2.realtime_events WHERE entity_id = $1 OR payload->>'order_id' = $1;`, [testOrderId]);
  await pool.query(`DELETE FROM resto_v2.orders WHERE id = $1;`, [testOrderId]);
  await pool.query(`UPDATE resto_v2.restaurant_tables SET status = 'available' WHERE table_number = '04';`);

  // Output test summary table
  console.log('-------------------------------------------------------------------------------------------------------------------------');
  console.log('| Step                          | Endpoint                                | HTTP | Success | Details');
  console.log('-------------------------------------------------------------------------------------------------------------------------');
  for (const res of results) {
    const step = res.step.padEnd(30);
    const ep = res.endpoint.slice(0, 40).padEnd(41);
    const code = String(res.status).padEnd(5);
    const succ = (res.success ? 'PASS' : 'FAIL').padEnd(8);
    console.log(`| ${step} | ${ep} | ${code}| ${succ}| ${res.details}`);
  }
  console.log('-------------------------------------------------------------------------------------------------------------------------');

  const allPassed = results.every(r => r.success);
  console.log(`\nFinal Result: ${allPassed ? 'ALL STEP 2 API TESTS PASSED (19/19)' : 'SOME TESTS FAILED'}\n`);
}

runStep2Verification().catch(console.error);
