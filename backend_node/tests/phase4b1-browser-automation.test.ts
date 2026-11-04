import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import pg from 'pg';

const { Pool } = pg;

describe('RESTO V2 — Phase 4B.1 Real Browser Cross-Instance End-to-End Suite', () => {
  const rehearsalConnStr = 'postgresql://akashlodhi@localhost:5432/resto_v2_rehearsal';
  const customerFrontendUrl = 'http://localhost:5180';
  const dashboardFrontendUrl = 'http://localhost:5181';

  let pool: pg.Pool;
  let browser: Browser;
  let customerContext: BrowserContext;
  let dashboardContext: BrowserContext;
  let customerPage: Page;
  let dashboardPage: Page;

  beforeAll(async () => {
    pool = new Pool({ connectionString: rehearsalConnStr });

    // Clean up any test orders for Table 03 and ensure table is available
    await pool.query(`DELETE FROM resto_v2.payments WHERE order_id IN (SELECT id FROM resto_v2.orders WHERE table_number = '03');`);
    await pool.query(`DELETE FROM resto_v2.order_items WHERE order_id IN (SELECT id FROM resto_v2.orders WHERE table_number = '03');`);
    await pool.query(`DELETE FROM resto_v2.orders WHERE table_number = '03';`);
    await pool.query(`UPDATE resto_v2.restaurant_tables SET status = 'available' WHERE table_number = '03';`);

    // Launch Chromium browser in headless mode
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Create 2 completely isolated browser contexts (separate cookies, sessionStorage, caches)
    customerContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) RestoCustomerTest/1.0',
    });

    dashboardContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) RestoDashboardTest/1.0',
    });

    customerPage = await customerContext.newPage();
    dashboardPage = await dashboardContext.newPage();
  }, 30000);

  afterAll(async () => {
    // Clean up test orders
    await pool.query(`DELETE FROM resto_v2.payments WHERE order_id IN (SELECT id FROM resto_v2.orders WHERE customer_name = 'Arjun Kapoor');`);
    await pool.query(`DELETE FROM resto_v2.order_items WHERE order_id IN (SELECT id FROM resto_v2.orders WHERE customer_name = 'Arjun Kapoor');`);
    await pool.query(`DELETE FROM resto_v2.orders WHERE customer_name = 'Arjun Kapoor';`);
    await pool.query(`UPDATE resto_v2.restaurant_tables SET status = 'available' WHERE table_number = '03';`);

    if (browser) await browser.close();
    if (pool) await pool.end();
  });

  it('executes full cross-instance browser flow: Customer on 5180 (Instance A) -> Dashboard on 5181 (Instance B)', async () => {
    // -------------------------------------------------------------
    // Step 1: Open Restaurant Dashboard (Login redirect -> Orders on Port 5181 connected to Instance B: 5006)
    // -------------------------------------------------------------
    await dashboardPage.goto(`${dashboardFrontendUrl}/login`);
    await dashboardPage.waitForLoadState('domcontentloaded');

    // Confirm dashboard renders Orders page
    await dashboardPage.waitForSelector('text=Orders', { timeout: 10000 });
    expect(await dashboardPage.isVisible('text=Orders')).toBe(true);

    // -------------------------------------------------------------
    // Step 2: Open Customer Frontend on Port 5180 (connected to Instance A: 5005)
    // -------------------------------------------------------------
    await customerPage.goto(`${customerFrontendUrl}/menu?table=03`, { waitUntil: 'networkidle' });

    // Wait for menu items to render and click pizza card
    const pizza = customerPage.locator('text=Wood-Fired Margherita Pizza').locator('visible=true').first();
    await pizza.waitFor({ state: 'visible', timeout: 15000 });
    expect(await pizza.isVisible()).toBe(true);
    await pizza.click();

    // In modal, click "Add to Order"
    const addToOrderBtn = customerPage.locator('button:has-text("Add to Order")').locator('visible=true').first();
    await addToOrderBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addToOrderBtn.click();
    await customerPage.waitForTimeout(500);

    // Navigate to checkout
    await customerPage.goto(`${customerFrontendUrl}/checkout`);
    await customerPage.waitForLoadState('domcontentloaded');

    // Verify checkout page loaded with Table 03 and Margherita Pizza
    await customerPage.waitForSelector('text=Table 03', { timeout: 5000 });
    expect(await customerPage.isVisible('text=Wood-Fired Margherita Pizza')).toBe(true);

    // Enter Customer Details
    const nameInput = customerPage.locator('input[placeholder*="John" i], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Arjun Kapoor');
    }

    // Place Order via Confirm & Place Order button
    const placeOrderBtn = customerPage.locator('button:has-text("Confirm & Place Order")').locator('visible=true').first();
    await placeOrderBtn.waitFor({ state: 'visible', timeout: 5000 });
    await placeOrderBtn.click();

    // -------------------------------------------------------------
    // Step 3: Verify Customer is Navigated to Order Tracking Page & Status Renders Without Error
    // -------------------------------------------------------------
    await customerPage.waitForURL(/\/order-tracking\//, { timeout: 15000 });
    const currentCustomerUrl = customerPage.url();
    expect(currentCustomerUrl).toContain('/order-tracking/');

    // Extract Order ID from tracking URL
    const orderIdMatch = currentCustomerUrl.match(/\/order-tracking\/([^/?#]+)/);
    expect(orderIdMatch).not.toBeNull();
    const orderId = orderIdMatch![1];

    // Confirm initial tracking status in customer DOM
    await customerPage.waitForSelector('text=Order Received', { timeout: 10000 });
    expect(await customerPage.isVisible('text=Order Received')).toBe(true);

    // -------------------------------------------------------------
    // Step 4: Verify Dashboard on Instance B receives the Order in real time via SSE
    // -------------------------------------------------------------
    // Look for the order in the dashboard table without refreshing the page!
    const orderRow = dashboardPage.locator(`tr:has-text("${orderId}")`).first();
    await orderRow.waitFor({ state: 'visible', timeout: 15000 });
    expect(await orderRow.isVisible()).toBe(true);

    // -------------------------------------------------------------
    // Step 5: Staff clicks "Accept Order" on Dashboard (Instance B)
    // -------------------------------------------------------------
    const acceptBtn = orderRow.locator('button:has-text("Accept Order")');
    await acceptBtn.waitFor({ state: 'visible', timeout: 5000 });
    await acceptBtn.click();
    await dashboardPage.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Step 6: Kitchen clicks "Start Preparing" on Dashboard (Instance B)
    // -------------------------------------------------------------
    const startPrepBtn = orderRow.locator('button:has-text("Start Preparing")');
    await startPrepBtn.waitFor({ state: 'visible', timeout: 5000 });
    await startPrepBtn.click();
    await dashboardPage.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Step 7: Kitchen clicks "Mark Ready" on Dashboard (Instance B)
    // -------------------------------------------------------------
    const markReadyBtn = orderRow.locator('button:has-text("Mark Ready")');
    await markReadyBtn.waitFor({ state: 'visible', timeout: 5000 });
    await markReadyBtn.click();
    await dashboardPage.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Step 8: Floor Waiter clicks "Mark Served" on Dashboard (Instance B)
    // -------------------------------------------------------------
    const markServedBtn = orderRow.locator('button:has-text("Mark Served")');
    await markServedBtn.waitFor({ state: 'visible', timeout: 5000 });
    await markServedBtn.click();
    await dashboardPage.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Step 9: Complete Order on Dashboard (Instance B)
    // -------------------------------------------------------------
    const completeBtn = orderRow.locator('button:has-text("Complete Order")');
    await completeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await completeBtn.click();
    await dashboardPage.waitForTimeout(1500);

    // -------------------------------------------------------------
    // Step 10: Verify Database State & Automatic Table 03 Release
    // -------------------------------------------------------------
    // Check Table 03 status in PostgreSQL
    const tableRes = await pool.query(
      `SELECT status FROM resto_v2.restaurant_tables WHERE table_number = '03';`
    );
    expect(tableRes.rows[0].status).toBe('available');
  }, 60000);
});
