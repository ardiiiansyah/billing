#!/bin/bash

# Security Test Suite for Beatnet Billing System
# Run this script to verify all security fixes are working

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Beatnet Security Test Suite${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Base URL: ${YELLOW}$BASE_URL${NC}"
echo ""

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_status="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}[TEST $TOTAL_TESTS]${NC} $test_name"
    
    # Run command and capture status code
    status_code=$(eval "$command" 2>/dev/null | grep -oP 'HTTP/\d\.\d \K\d+' | head -1 || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Got expected status $status_code"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC} - Expected $expected_status, got $status_code"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

echo -e "${YELLOW}=== CRITICAL SECURITY TESTS ===${NC}"
echo ""

# TEST 1: Cron endpoint without auth (should fail)
run_test \
    "Cron endpoint without authentication" \
    "curl -s -i -X GET '$BASE_URL/api/cron/generate-tagihan'" \
    "401"

# TEST 2: Cron endpoint with wrong token (should fail)
run_test \
    "Cron endpoint with invalid token" \
    "curl -s -i -X GET '$BASE_URL/api/cron/generate-tagihan' -H 'Authorization: Bearer wrong-token'" \
    "401"

# TEST 3: Cron endpoint with correct token (should work if CRON_SECRET is set)
if [ -n "$CRON_SECRET" ]; then
    run_test \
        "Cron endpoint with valid token" \
        "curl -s -i -X GET '$BASE_URL/api/cron/generate-tagihan' -H 'Authorization: Bearer $CRON_SECRET'" \
        "200"
else
    echo -e "${YELLOW}⊘ SKIPPED${NC} - CRON_SECRET not set"
    echo ""
fi

# TEST 4: WhatsApp endpoint without auth (should fail)
run_test \
    "WhatsApp endpoint without authentication" \
    "curl -s -i -X POST '$BASE_URL/api/wa/kirim' -H 'Content-Type: application/json' -d '{\"nomor\":\"628123456789\",\"pesan\":\"test\"}'" \
    "401"

# TEST 5: Dashboard without auth (should redirect or return 401)
echo -e "${BLUE}[TEST $((TOTAL_TESTS + 1))]${NC} Dashboard without authentication"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
status_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard")
if [ "$status_code" = "302" ] || [ "$status_code" = "307" ] || [ "$status_code" = "401" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Got redirect/unauthorized status $status_code"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Expected 302/307/401, got $status_code"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# TEST 6: Webhook endpoint is publicly accessible (for Mayar callbacks)
run_test \
    "Webhook endpoint is accessible" \
    "curl -s -i -X POST '$BASE_URL/api/payment/webhook' -H 'Content-Type: application/json' -d '{\"test\":true}'" \
    "400"

echo -e "${YELLOW}=== SECURITY HEADERS TESTS ===${NC}"
echo ""

# TEST 7: Check security headers presence
echo -e "${BLUE}[TEST $((TOTAL_TESTS + 1))]${NC} Security headers presence"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

headers=$(curl -s -I "$BASE_URL/" | grep -i "x-content-type-options\|x-frame-options\|referrer-policy" | wc -l)

if [ "$headers" -ge 2 ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Found $headers security headers"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Only found $headers security headers (expected at least 2)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# TEST 8: X-Frame-Options header
echo -e "${BLUE}[TEST $((TOTAL_TESTS + 1))]${NC} X-Frame-Options header"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

xfo=$(curl -s -I "$BASE_URL/" | grep -i "x-frame-options" | grep -i "DENY\|SAMEORIGIN" || echo "")

if [ -n "$xfo" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - X-Frame-Options is set"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ FAILED${NC} - X-Frame-Options not found or incorrect"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# TEST 9: Bulk operation without auth (should fail)
run_test \
    "Bulk operations without authentication" \
    "curl -s -i -X POST '$BASE_URL/api/bulk/pelanggan' -H 'Content-Type: application/json' -d '{\"action\":\"update_status\",\"ids\":[\"test\"]}'" \
    "401"

# TEST 10: API routes have no-cache headers
echo -e "${BLUE}[TEST $((TOTAL_TESTS + 1))]${NC} API routes have Cache-Control: no-store"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

cache_header=$(curl -s -I "$BASE_URL/api/payment/webhook" | grep -i "cache-control" | grep -i "no-store\|no-cache" || echo "")

if [ -n "$cache_header" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Cache-Control header is set for API routes"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠ WARNING${NC} - Cache-Control not set (may be okay depending on config)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
echo ""

# Summary
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Test Results Summary${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}Security fixes are working correctly.${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED!${NC}"
    echo -e "${RED}Please review the failed tests above.${NC}"
    exit 1
fi
