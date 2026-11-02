// test-mayar-api.js
// Direct test Mayar API untuk debug
// Run: node test-mayar-api.js

const MAYAR_API_KEY = process.env.MAYAR_API_KEY || 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhOWRhMTBkYy1hOTY2LTQzYzgtODdkNS00ZTA3MmJhZmU3MWYiLCJhY2NvdW50SWQiOiJiOTYzNDQ1MC0yNzU3LTQyMDUtOWE1ZC1iYmE2NGFiMzFhMmMiLCJjcmVhdGVkQXQiOiIxNzkyNzIxNTYyNzkwIiwicm9sZSI6ImRldmVsb3BlciIsInNjb3BlIjp7InJlYWQiOnRydWUsIndyaXRlIjp0cnVlfSwic3ViIjoiYXJkaWE2OTE2QGdtYWlsLmNvbSIsIm5hbWUiOiJNdWhhbW1hZCBBcmRpYW5zeWFoIiwibGluayI6ImJlYXRuZXQiLCJpc1NlbGZEb21haW4iOm51bGwsImlhdCI6MTc5MjcyMTU2Mn0.VN8EOV_4jpEM1mIqM6ciIc2hBYGK-nqlDz7rCf-MNreX9ossGcTUlYeV13o2tQDoe-n46d37AGV4-Z3wYzrCLurZJyXwVLqbXX1WvoM0XllSAB3_odXhRWJDYb2d5o6eOhDp0pDh_jetotfbfr_du0uopeOTgp39QwckgJQcH4btfWorImXYB_PNUoLVdz9MwzsiPDJEGmuKUgx5ceTnJAhW9fKCycg27Em7L4Zt0ynkyNvx7Qoqy8KOCGJEE-65CgpF5OkYfFqu325vHUiryBzshVuBcHYhIz8T_BwLFxRsH4Px2RmIyprnieOSjkoCBfNibNFwezvM3R34vvXGrg';
const MAYAR_BASE_URL = 'https://api.mayar.io/hl/v2';

async function testMayarAPI() {
  console.log('🧪 Testing Mayar API Direct Call\n');
  console.log('API Key:', MAYAR_API_KEY.substring(0, 50) + '...');
  console.log('Base URL:', MAYAR_BASE_URL);
  console.log('\nCreating test payment...\n');

  const payload = {
    amount: 100240,
    reference_id: `TEST-${Date.now()}`,
    name: 'Test Payment User',
    mobile: '6285159766623',
    description: 'Test payment link',
    notes: 'Test payment'.substring(0, 24), // Max 24 chars
    due_date: '2026-11-10',
    redirect_url: 'https://beatnet.vercel.app/bayar/test',
  };

  console.log('Request payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${MAYAR_BASE_URL}/payments/create`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAYAR_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    console.log('\nResponse Status:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('Response Body (raw):', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('\nResponse Data (parsed):', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('\n❌ Failed to parse JSON response');
    }

    if (response.ok && data) {
      console.log('\n✅ SUCCESS! Mayar API works!');
      console.log('Payment URL:', data.data?.link || data.data?.payment_url);
      console.log('Order ID:', data.data?.id);
    } else {
      console.log('\n❌ FAILED!');
      console.log('Error:', data?.message || data?.error || 'Unknown error');
      console.log('\nPossible issues:');
      console.log('- API key expired or invalid');
      console.log('- API endpoint changed');
      console.log('- Account suspended');
      console.log('- Network/firewall blocking request');
    }

  } catch (error) {
    console.error('\n❌ FETCH ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMayarAPI();
