/**
 * End-to-End Verification Test Script for RESTO
 * Tests all 8 required workflows across Customer Frontend, Dashboard, and Backend.
 */

const BASE_URL = 'http://localhost:5001/api'
const STAFF_AUTH = 'Bearer demo-staff-token-verifier'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    process.exit(1)
  }
  console.log(`✅ PASSED: ${message}`)
}

async function runTests() {
  console.log('\n========================================')
  console.log('STARTING RESTO FULL INTEGRATION TEST')
  console.log('========================================\n')

  // HEALTH CHECK
  const healthRes = await fetch('http://localhost:5001/health')
  const health = await healthRes.json()
  assert(health.status === 'ok', 'Backend /health responds { status: "ok" }')

  // TEST 1: Table availability & Customer Placing Order
  console.log('\n--- TEST 1: Table Selection, Order Calculation & Placement ---')
  const tablesRes = await fetch(`${BASE_URL}/tables/availability?restaurantSlug=olive-and-ember`)
  const tablesData = await tablesRes.json()
  const table02 = tablesData.tables.find(t => t.table_number === '02' || t.number === '02')
  assert(table02 && table02.status === 'available', 'Table 02 is initially available')

  const menuRes = await fetch(`${BASE_URL}/menu?restaurantSlug=olive-and-ember`)
  const menuData = await menuRes.json()
  assert(menuData.items.length > 0, `Menu loaded with ${menuData.items.length} items`)

  const item1 = menuData.items.find(i => i.id === 'item-1') // Arancini 425
  const item4 = menuData.items.find(i => i.id === 'item-4') // Margherita 595
  assert(item1 && item4, 'Found menu items item-1 and item-4')

  const orderIdempotency = `idemp-${Date.now()}`
  const placeOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantSlug: 'olive-and-ember',
      tableNumber: 2,
      customerName: 'Aarav Sharma',
      paymentMethod: 'counter',
      idempotencyKey: orderIdempotency,
      items: [
        { menuItemId: 'item-1', quantity: 2, selectedAddons: [] }, // 2 * 425 = 850
        { menuItemId: 'item-4', quantity: 1, selectedAddons: [] }, // 1 * 595 = 595
      ],
      specialInstructions: 'Make the crust extra crispy'
    })
  })
  const createdOrder = await placeOrderRes.json()
  assert(placeOrderRes.status === 201, `Order created with HTTP 201 (ID: ${createdOrder.id})`)
  assert(createdOrder.tableNumber === '02', 'Order table number is Table 02')
  assert(createdOrder.breakdown.subtotal === 1445, `Subtotal correctly server-calculated (1445 == ${createdOrder.breakdown.subtotal})`)
  assert(createdOrder.breakdown.gstTotal === 72.25, `5% GST correctly calculated (72.25 == ${createdOrder.breakdown.gstTotal})`)
  assert(createdOrder.breakdown.finalTotal === 1517.25, `Final total correctly calculated (1517.25 == ${createdOrder.breakdown.finalTotal})`)
  assert(createdOrder.accessToken, 'Access token issued for customer order tracking')

  // Verify Table 02 is now occupied
  const tablesAfterRes = await fetch(`${BASE_URL}/tables/availability?restaurantSlug=olive-and-ember`)
  const tablesAfter = await tablesAfterRes.json()
  const table02After = tablesAfter.tables.find(t => t.table_number === '02' || t.number === '02')
  assert(table02After.status === 'occupied', 'Table 02 is now marked OCCUPIED in database')

  // TEST 2: Dashboard Receives Order
  console.log('\n--- TEST 2: Dashboard Orders Feed ---')
  const dashboardOrdersRes = await fetch(`${BASE_URL}/orders`, {
    headers: { Authorization: STAFF_AUTH }
  })
  const dashboardOrdersData = await dashboardOrdersRes.json()
  const foundInDashboard = dashboardOrdersData.orders.find(o => o.id === createdOrder.id)
  assert(foundInDashboard !== undefined, 'Dashboard received the newly placed order')
  assert(foundInDashboard.table_number === '02', 'Dashboard order matches Table 02')
  assert(foundInDashboard.customer_name === 'Aarav Sharma', 'Customer name matches Aarav Sharma')
  assert(foundInDashboard.final_total === 1517.25, 'Dashboard order amount matches 1517.25')

  // TEST 3: Status Transition Sequence (Accept -> Preparing -> Ready -> Served)
  console.log('\n--- TEST 3: Staff Status Transitions ---')
  // 1. Accept Order (pending -> confirmed)
  const acceptRes = await fetch(`${BASE_URL}/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: STAFF_AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'confirmed' })
  })
  const acceptedOrder = await acceptRes.json()
  assert(acceptRes.status === 200, 'Staff accepted the order (status: confirmed)')
  assert(acceptedOrder.status === 'accepted', 'Customer-facing order status mapped to "accepted"')

  // 2. Start Preparing (confirmed -> preparing)
  const prepRes = await fetch(`${BASE_URL}/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: STAFF_AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'preparing' })
  })
  const prepOrder = await prepRes.json()
  assert(prepOrder.status === 'preparing', 'Staff set status to "preparing"')

  // 3. Mark Ready (preparing -> ready)
  const readyRes = await fetch(`${BASE_URL}/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: STAFF_AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ready' })
  })
  const readyOrder = await readyRes.json()
  assert(readyOrder.status === 'ready', 'Staff set status to "ready"')

  // 4. Mark Served (ready -> served)
  const servedRes = await fetch(`${BASE_URL}/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: STAFF_AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'served' })
  })
  const servedOrder = await servedRes.json()
  assert(servedOrder.status === 'served', 'Staff set status to "served"')

  // TEST 4: Customer Tracking Verification
  console.log('\n--- TEST 4: Customer Order Tracking Verification ---')
  const trackingRes = await fetch(`${BASE_URL}/orders/${createdOrder.id}/tracking?accessToken=${encodeURIComponent(createdOrder.accessToken)}`)
  const trackingData = await trackingRes.json()
  assert(trackingRes.status === 200, 'Customer successfully retrieved tracking data with accessToken')
  assert(trackingData.status === 'served', 'Customer sees current order status as "served"')
  assert(trackingData.statusTimeline.length >= 4, `Customer status timeline has recorded all stages (${trackingData.statusTimeline.length} events)`)

  // TEST 5: Waiter Request Flow
  console.log('\n--- TEST 5: Waiter Service Request Flow ---')
  const waiterReqRes = await fetch(`${BASE_URL}/service-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantSlug: 'olive-and-ember',
      tableNumber: 2,
      requestType: 'water',
      message: 'Warm water and extra napkins'
    })
  })
  const waiterReq = await waiterReqRes.json()
  assert(waiterReqRes.status === 201, `Waiter request created with HTTP 201 (ID: ${waiterReq.id})`)

  // Dashboard verifies pending waiter request
  const dashRequestsRes = await fetch(`${BASE_URL}/service-requests`, {
    headers: { Authorization: STAFF_AUTH }
  })
  const dashRequests = await dashRequestsRes.json()
  const foundRequest = dashRequests.serviceRequests.find(r => r.id === waiterReq.id)
  assert(foundRequest && foundRequest.status === 'pending', 'Dashboard immediately displays the pending Table 02 request')

  // Staff completes waiter request
  const completeReqRes = await fetch(`${BASE_URL}/service-requests/${waiterReq.id}`, {
    method: 'PATCH',
    headers: { Authorization: STAFF_AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' })
  })
  const completedReq = await completeReqRes.json()
  assert(completedReq.status === 'completed', 'Staff successfully marked waiter request as handled')

  // TEST 6: Order Completion and Table Release
  console.log('\n--- TEST 6: Order Completion & Table Release ---')
  const completeOrderRes = await fetch(`${BASE_URL}/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: STAFF_AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' })
  })
  const completedOrder = await completeOrderRes.json()
  assert(completedOrder.status === 'completed', 'Order status moved to "completed"')

  // Verify Table 02 is now automatically available again
  const tablesFinalRes = await fetch(`${BASE_URL}/tables/availability?restaurantSlug=olive-and-ember`)
  const tablesFinal = await tablesFinalRes.json()
  const table02Final = tablesFinal.tables.find(t => t.table_number === '02' || t.number === '02')
  assert(table02Final.status === 'available', 'Table 02 is now released and AVAILABLE for next guests')

  // TEST 7: Payment Records
  console.log('\n--- TEST 7: Payment Records ---')
  const paymentsRes = await fetch(`${BASE_URL}/payments`, {
    headers: { Authorization: STAFF_AUTH }
  })
  const paymentsData = await paymentsRes.json()
  const paymentForOrder = paymentsData.payments.find(p => p.order_id === createdOrder.id)
  assert(paymentForOrder !== undefined, 'Payment record was created for the order')
  assert(paymentForOrder.amount === 1517.25, `Payment amount matches 1517.25 (${paymentForOrder.amount})`)
  assert(paymentForOrder.payment_method === 'counter', 'Payment method is "counter"')

  // TEST 8: Business Rules & Guardrails
  console.log('\n--- TEST 8: Security & Business Rule Guardrails ---')
  // 1. Duplicate checkout submission prevention
  const dupOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantSlug: 'olive-and-ember',
      tableNumber: 2,
      paymentMethod: 'counter',
      idempotencyKey: orderIdempotency, // Reuse same key
      items: [{ menuItemId: 'item-1', quantity: 1, selectedAddons: [] }]
    })
  })
  assert(dupOrderRes.status === 200, 'Duplicate submission with same idempotencyKey returns existing order without creating duplicate')

  // 2. Invalid status transition rejection (e.g. trying to transition completed order to ready)
  const invalidTransRes = await fetch(`${BASE_URL}/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: STAFF_AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ready' })
  })
  assert(invalidTransRes.status === 409, 'Invalid status transition (completed -> ready) was rejected with HTTP 409')

  // 3. Unauthorized access check (no auth header on staff route)
  const unauthRes = await fetch(`${BASE_URL}/orders`)
  assert(unauthRes.status === 401, 'Unauthenticated staff route access is blocked with HTTP 401')

  console.log('\n========================================')
  console.log('ALL 8 INTEGRATION TESTS PASSED PERFECTLY!')
  console.log('========================================\n')
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
