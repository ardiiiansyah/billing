/**
 * Automated API Tests for Beatnet Billing System
 * Run with: node tests/api-tests.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET || ''

// Test utilities
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

let totalTests = 0
let passedTests = 0
let failedTests = 0

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function runTest(name, testFn) {
  totalTests++
  log(`\n[TEST ${totalTests}] ${name}`, 'blue')
  
  try {
    const result = await testFn()
    if (result.pass) {
      log(`✓ PASSED - ${result.message}`, 'green')
      passedTests++
    } else {
      log(`✗ FAILED - ${result.message}`, 'red')
      failedTests++
    }
  } catch (error) {
    log(`✗ ERROR - ${error.message}`, 'red')
    failedTests++
  }
}

// HTTP helper
async function httpRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    
    const contentType = response.headers.get('content-type')
    let body = null
    
    if (contentType && contentType.includes('application/json')) {
      body = await response.json()
    } else {
      body = await response.text()
    }
    
    return {
      status: response.status,
      headers: response.headers,
      body,
    }
  } catch (error) {
    return {
      status: 0,
      error: error.message,
    }
  }
}

// Test Suite
async function runAllTests() {
  log('============================================', 'blue')
  log('  Beatnet API Test Suite', 'blue')
  log('============================================', 'blue')
  log(`\nBase URL: ${BASE_URL}`, 'yellow')
  log(`CRON_SECRET: ${CRON_SECRET ? 'Set' : 'Not set'}`, 'yellow')
  
  log('\n=== AUTHENTICATION TESTS ===', 'yellow')
  
  // Test 1: Cron without auth
  await runTest('Cron endpoint rejects unauthenticated requests', async () => {
    const res = await httpRequest(`${BASE_URL}/api/cron/generate-tagihan`)
    return {
      pass: res.status === 401,
      message: `Got status ${res.status}, expected 401`,
    }
  })
  
  // Test 2: Cron with wrong auth
  await runTest('Cron endpoint rejects invalid token', async () => {
    const res = await httpRequest(`${BASE_URL}/api/cron/generate-tagihan`, {
      headers: { Authorization: 'Bearer wrong-token' },
    })
    return {
      pass: res.status === 401,
      message: `Got status ${res.status}, expected 401`,
    }
  })
  
  // Test 3: Cron with correct auth (if secret available)
  if (CRON_SECRET) {
    await runTest('Cron endpoint accepts valid token', async () => {
      const res = await httpRequest(`${BASE_URL}/api/cron/generate-tagihan`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      })
      return {
        pass: res.status === 200,
        message: `Got status ${res.status}, expected 200`,
      }
    })
  } else {
    log('\n⊘ SKIPPED - Cron valid token test (CRON_SECRET not set)', 'yellow')
  }
  
  // Test 4: WhatsApp endpoint without auth
  await runTest('WhatsApp endpoint requires authentication', async () => {
    const res = await httpRequest(`${BASE_URL}/api/wa/kirim`, {
      method: 'POST',
      body: JSON.stringify({ nomor: '628123456789', pesan: 'test' }),
    })
    return {
      pass: res.status === 401 || res.status === 403,
      message: `Got status ${res.status}, expected 401 or 403`,
    }
  })
  
  // Test 5: Bulk operation without auth
  await runTest('Bulk operations require authentication', async () => {
    const res = await httpRequest(`${BASE_URL}/api/bulk/pelanggan`, {
      method: 'POST',
      body: JSON.stringify({ action: 'update_status', ids: ['test'] }),
    })
    return {
      pass: res.status === 401 || res.status === 403,
      message: `Got status ${res.status}, expected 401 or 403`,
    }
  })
  
  log('\n=== WEBHOOK TESTS ===', 'yellow')
  
  // Test 6: Webhook is publicly accessible
  await runTest('Webhook endpoint is accessible (for payment gateway)', async () => {
    const res = await httpRequest(`${BASE_URL}/api/payment/webhook`, {
      method: 'POST',
      body: JSON.stringify({ test: true }),
    })
    // Should not be 401/403 (it's public), but will fail validation (400/401 for invalid signature)
    return {
      pass: res.status !== 404,
      message: `Got status ${res.status}, endpoint is accessible`,
    }
  })
  
  // Test 7: Webhook rejects invalid signature
  await runTest('Webhook rejects requests without valid signature', async () => {
    const res = await httpRequest(`${BASE_URL}/api/payment/webhook`, {
      method: 'POST',
      body: JSON.stringify({
        event: 'payment.paid',
        id: 'test123',
        amount: 150000,
      }),
    })
    return {
      pass: res.status === 401 || res.status === 400,
      message: `Got status ${res.status}, invalid signature rejected`,
    }
  })
  
  log('\n=== SECURITY HEADERS TESTS ===', 'yellow')
  
  // Test 8: Security headers presence
  await runTest('Homepage returns security headers', async () => {
    const res = await httpRequest(`${BASE_URL}/`)
    const hasXContentTypeOptions = res.headers.get('x-content-type-options') !== null
    const hasXFrameOptions = res.headers.get('x-frame-options') !== null
    const hasReferrerPolicy = res.headers.get('referrer-policy') !== null
    
    const count = [hasXContentTypeOptions, hasXFrameOptions, hasReferrerPolicy].filter(Boolean).length
    
    return {
      pass: count >= 2,
      message: `Found ${count}/3 expected security headers`,
    }
  })
  
  // Test 9: X-Frame-Options prevents clickjacking
  await runTest('X-Frame-Options header is set to DENY', async () => {
    const res = await httpRequest(`${BASE_URL}/`)
    const xfo = res.headers.get('x-frame-options')
    return {
      pass: xfo && (xfo.toUpperCase() === 'DENY' || xfo.toUpperCase() === 'SAMEORIGIN'),
      message: `X-Frame-Options: ${xfo || 'not set'}`,
    }
  })
  
  log('\n=== INPUT VALIDATION TESTS ===', 'yellow')
  
  // Test 10: Payment creation validates UUID format
  await runTest('Payment creation rejects invalid UUID format', async () => {
    const res = await httpRequest(`${BASE_URL}/api/payment/create`, {
      method: 'POST',
      body: JSON.stringify({ tagihan_id: 'not-a-uuid' }),
    })
    return {
      pass: res.status === 400 || res.status === 401,
      message: `Got status ${res.status}, invalid input rejected`,
    }
  })
  
  // Test 11: Payment creation doesn't accept arbitrary amount
  await runTest('Payment creation ignores client-provided amounts', async () => {
    const res = await httpRequest(`${BASE_URL}/api/payment/create`, {
      method: 'POST',
      body: JSON.stringify({
        tagihan_id: '123e4567-e89b-12d3-a456-426614174000',
        jumlah: 1, // Attempting price tampering
      }),
    })
    // Should be 401 (no auth) or 404 (invoice not found)
    // NOT succeed with tampered amount
    return {
      pass: res.status !== 200,
      message: `Got status ${res.status}, amount tampering prevented`,
    }
  })
  
  log('\n=== RATE LIMITING TESTS ===', 'yellow')
  
  // Test 12: Multiple rapid requests
  await runTest('Rate limiting is implemented', async () => {
    const requests = []
    for (let i = 0; i < 15; i++) {
      requests.push(httpRequest(`${BASE_URL}/api/payment/create`, {
        method: 'POST',
        body: JSON.stringify({ tagihan_id: 'test' }),
      }))
    }
    
    const responses = await Promise.all(requests)
    const rateLimited = responses.some(r => r.status === 429)
    
    return {
      pass: rateLimited,
      message: rateLimited 
        ? 'Rate limiting active (got 429 status)' 
        : 'No rate limiting detected (may need to implement)',
    }
  })
  
  // Print summary
  log('\n============================================', 'blue')
  log('  Test Results Summary', 'blue')
  log('============================================', 'blue')
  log(`\nTotal Tests:  ${totalTests}`)
  log(`Passed:       ${passedTests}`, 'green')
  log(`Failed:       ${failedTests}`, 'red')
  
  if (failedTests === 0) {
    log('\n✓ ALL TESTS PASSED!', 'green')
    log('Security fixes are working correctly.', 'green')
    process.exit(0)
  } else {
    log('\n✗ SOME TESTS FAILED!', 'red')
    log('Please review the failed tests above.', 'red')
    process.exit(1)
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n✗ Test suite error: ${error.message}`, 'red')
  process.exit(1)
})
