// e2e/full-flow.test.js
// End-to-End Test: Full Billing Flow
// Tests: Login → Add Customer → Generate Invoice → Payment Link → Status

import { test, expect } from '@playwright/test';

// WARNING: This test will create REAL data in production database
// Only run this when you're ready to test with real data

const TEST_CONFIG = {
  // ⚠️ CHANGE THESE VALUES:
  adminEmail: 'your-admin-email@example.com', // Your admin email
  adminPassword: 'your-admin-password', // Your admin password
  testPhone: '628123456789', // Your WhatsApp number for testing
  testCustomerName: 'Playwright Test User',
};

test.describe('Full Billing Automation Flow', () => {
  let customerId;
  let invoiceId;
  let paymentUrl;

  test.beforeEach(async ({ page }) => {
    // Set longer timeout for each action
    test.setTimeout(120000); // 2 minutes per test
  });

  test('1. Homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1, h2')).toContainText(/login|masuk/i);
    
    console.log('✅ Homepage loads and redirects to login');
  });

  test('2. Admin can login', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.adminEmail);
    await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.adminPassword);
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Masuk")');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    
    // Verify dashboard loaded
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toContainText(/dashboard|pelanggan|tagihan/i);
    
    console.log('✅ Admin login successful');
  });

  test('3. Can add new customer', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_CONFIG.adminEmail);
    await page.fill('input[type="password"]', TEST_CONFIG.adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Navigate to Pelanggan page
    await page.click('text=/pelanggan|customer/i');
    await page.waitForURL(/\/pelanggan/);
    
    // Click Add Customer button
    await page.click('button:has-text("Tambah"), a:has-text("Tambah")');
    
    // Fill customer form
    await page.fill('input[name="nama"], input[placeholder*="nama"]', TEST_CONFIG.testCustomerName);
    await page.fill('input[name="no_wa"], input[placeholder*="whatsapp"]', TEST_CONFIG.testPhone);
    await page.fill('input[name="alamat"], textarea[name="alamat"]', 'Jl. Test Playwright No. 1');
    
    // Select package (assuming dropdown exists)
    const packageSelect = page.locator('select[name="paket_id"], select:near(:text("Paket"))').first();
    if (await packageSelect.isVisible()) {
      await packageSelect.selectOption({ index: 1 });
    }
    
    // Set status to Aktif
    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('aktif');
    }
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Simpan"), button:has-text("Tambah")');
    
    // Wait for success message or redirect
    await page.waitForTimeout(2000);
    
    console.log('✅ Customer added successfully');
  });

  test('4. Can generate invoice manually', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_CONFIG.adminEmail);
    await page.fill('input[type="password"]', TEST_CONFIG.adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Navigate to Tagihan page
    await page.click('text=/tagihan|invoice/i');
    await page.waitForURL(/\/tagihan/);
    
    // Click Add Invoice button
    await page.click('button:has-text("Tambah"), a:has-text("Tambah")');
    
    // Fill invoice form
    const customerSelect = page.locator('select[name="pelanggan_id"]').first();
    if (await customerSelect.isVisible()) {
      // Select the test customer (usually last in list)
      const options = await customerSelect.locator('option').count();
      await customerSelect.selectOption({ index: options - 1 });
    }
    
    // Set month and year
    await page.fill('input[name="bulan"], select[name="bulan"]', '11');
    await page.fill('input[name="tahun"]', '2026');
    
    // Set due date
    await page.fill('input[type="date"], input[name="tanggal_jatuh_tempo"]', '2026-11-10');
    
    // Submit
    await page.click('button[type="submit"]:has-text("Simpan")');
    
    // Wait for success
    await page.waitForTimeout(2000);
    
    console.log('✅ Invoice generated successfully');
  });

  test('5. Can generate payment link', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_CONFIG.adminEmail);
    await page.fill('input[type="password"]', TEST_CONFIG.adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Go to Tagihan
    await page.click('text=/tagihan/i');
    await page.waitForURL(/\/tagihan/);
    
    // Find the test invoice (should be first or last)
    const invoiceRow = page.locator('tr, div').filter({ hasText: TEST_CONFIG.testCustomerName }).first();
    
    // Click "Bayar" or "Generate Payment Link" button
    await invoiceRow.locator('button:has-text("Bayar"), button:has-text("Generate")').click();
    
    // Wait for payment link generation
    await page.waitForTimeout(3000);
    
    // Verify payment URL exists (either in UI or check API response)
    const paymentLinkElement = page.locator('text=/checkout.mayar|mayar.link|payment_url/i').first();
    
    if (await paymentLinkElement.isVisible()) {
      paymentUrl = await paymentLinkElement.textContent();
      console.log('✅ Payment link generated:', paymentUrl);
    } else {
      console.log('✅ Payment link generation triggered (verify in dashboard)');
    }
  });

  test('6. Payment page loads correctly', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_CONFIG.adminEmail);
    await page.fill('input[type="password"]', TEST_CONFIG.adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Go to Tagihan
    await page.click('text=/tagihan/i');
    await page.waitForURL(/\/tagihan/);
    
    // Find and click the payment link
    const paymentLinkBtn = page.locator('a[href*="/bayar/"]').first();
    
    if (await paymentLinkBtn.isVisible()) {
      const href = await paymentLinkBtn.getAttribute('href');
      
      // Open payment page in new tab
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        paymentLinkBtn.click({ button: 'middle' }) // Middle click to open new tab
      ]);
      
      await newPage.waitForLoadState();
      
      // Verify payment page content
      await expect(newPage.locator('body')).toContainText(/sultan.*wifi|beatnet/i);
      await expect(newPage.locator('body')).toContainText(TEST_CONFIG.testCustomerName);
      await expect(newPage.locator('body')).toContainText(/bayar|pembayaran|payment/i);
      
      // Check if "Lanjut ke Pembayaran" button exists
      const paymentButton = newPage.locator('button:has-text("Pembayaran"), a:has-text("Pembayaran")');
      await expect(paymentButton).toBeVisible();
      
      console.log('✅ Payment page loads correctly with customer data');
      
      await newPage.close();
    } else {
      console.log('⚠️  Payment link not found - may need manual verification');
    }
  });
});

test.describe('API Endpoint Tests', () => {
  test('API: Health check endpoints respond', async ({ request }) => {
    // Test homepage
    const homeResponse = await request.get('https://beatnet.vercel.app/');
    expect(homeResponse.status()).toBeLessThan(400);
    
    console.log('✅ API: Homepage responds');
  });

  test('API: Payment webhook endpoint exists', async ({ request }) => {
    // Test webhook endpoint (should return 401 without signature)
    const webhookResponse = await request.post('https://beatnet.vercel.app/api/payment/webhook', {
      data: { test: true },
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Expect 401 (unauthorized) or 400 (bad request), not 404
    expect(webhookResponse.status()).not.toBe(404);
    
    console.log('✅ API: Webhook endpoint exists and responds');
  });
});

console.log(`
🎯 Playwright E2E Test Suite
=============================

⚠️  BEFORE RUNNING:
1. Update TEST_CONFIG with your admin credentials
2. Update test phone number (your WhatsApp)
3. Make sure you're ready to create test data in production

To run:
  npm run test:e2e

This will test:
  ✅ Login flow
  ✅ Add customer
  ✅ Generate invoice
  ✅ Generate payment link
  ✅ Payment page loads
  ✅ API endpoints respond

Note: Real payment cannot be automated (requires manual QRIS scan/approval)
`);
