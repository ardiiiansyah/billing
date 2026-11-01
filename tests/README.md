# Test Scripts

This directory contains automated test scripts for the Beatnet billing system.

## Available Tests

### 1. Security Test Suite (Bash)
**File:** `security-test.sh`

Tests critical security vulnerabilities that were fixed:
- Cron authentication bypass
- WhatsApp relay protection
- Dashboard authentication
- Webhook accessibility
- Security headers
- Bulk operations protection

**Usage:**
```bash
# Run against local development
./tests/security-test.sh

# Run against production
BASE_URL=https://your-domain.com ./tests/security-test.sh

# Run with cron secret for full tests
BASE_URL=https://your-domain.com CRON_SECRET=your-secret ./tests/security-test.sh
```

### 2. API Test Suite (Node.js)
**File:** `api-tests.js`

Comprehensive API testing including:
- Authentication tests
- Webhook validation
- Security headers verification
- Input validation
- Rate limiting detection

**Usage:**
```bash
# Run against local development
node tests/api-tests.js

# Run against production
BASE_URL=https://your-domain.com node tests/api-tests.js

# Run with cron secret
BASE_URL=https://your-domain.com CRON_SECRET=your-secret node tests/api-tests.js
```

## Test Coverage

| Category | Tests | Coverage |
|----------|-------|----------|
| Authentication | 5 | Critical endpoints |
| Webhooks | 2 | Signature validation |
| Security Headers | 2 | OWASP headers |
| Input Validation | 2 | Price tampering, UUID |
| Rate Limiting | 1 | Rapid requests |

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Security Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run security tests
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
        run: ./tests/security-test.sh
```

### Vercel Pre-Deploy Hook

Add to `package.json`:
```json
{
  "scripts": {
    "test:security": "node tests/api-tests.js",
    "vercel-build": "npm run build && npm run test:security"
  }
}
```

## Expected Results

### All Tests Passing
```
============================================
  Test Results Summary
============================================

Total Tests:  12
Passed:       12
Failed:       0

✓ ALL TESTS PASSED!
Security fixes are working correctly.
```

### Some Tests Failing
Review the specific test output and fix the issues before deploying to production.

## Troubleshooting

### Test Fails: "Connection refused"
- Make sure the server is running
- Check BASE_URL is correct
- Verify firewall settings

### Test Fails: "Expected 401, got 200"
- Security fix may not be applied
- Check middleware is active
- Verify authentication logic

### Test Fails: "Rate limiting not detected"
- Rate limiter may need implementation
- Check if running locally (in-memory store resets)
- May need Redis for distributed systems

## Adding New Tests

### Bash Script
```bash
run_test \
    "Test description" \
    "curl command" \
    "expected_status_code"
```

### Node.js Script
```javascript
await runTest('Test description', async () => {
  const res = await httpRequest(url, options)
  return {
    pass: res.status === expectedStatus,
    message: `Got ${res.status}, expected ${expectedStatus}`,
  }
})
```

## Notes

- Tests are non-destructive and safe to run on production
- Tests do not modify any data
- Tests check security boundaries only
- Some tests require authentication tokens (provided via env vars)

---

Last Updated: November 1, 2026
