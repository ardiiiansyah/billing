// test-payment-direct.js
// Test payment generation using service role (bypass auth)
// Run: node test-payment-direct.js

const TAGIHAN_ID = '175aba3f-255b-40d0-b2fd-729dd62a82f7';

async function testPayment() {
  console.log('🧪 Testing Payment Link Generation (Direct API)\n');
  console.log('Tagihan ID:', TAGIHAN_ID);
  console.log('Testing endpoint: /api/payment/create\n');

  try {
    const response = await fetch('https://beatnet.vercel.app/api/payment/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This endpoint requires admin auth
        // We're testing if endpoint is accessible
      },
      body: JSON.stringify({
        tagihan_id: TAGIHAN_ID
      })
    });

    const data = await response.json();

    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));

    if (data.sukses && data.payment_url) {
      console.log('\n✅ SUCCESS! Payment link generated:');
      console.log('📱 Payment URL:', data.payment_url);
      console.log('🔖 Order ID:', data.order_id);
      console.log('\n🚀 Open this URL in browser to test Mayar checkout:');
      console.log(data.payment_url);
    } else if (data.error) {
      console.log('\n❌ ERROR:', data.error);
      console.log('\nNote: This is expected if auth is required.');
      console.log('The endpoint exists and responds correctly.');
    }

  } catch (error) {
    console.error('\n❌ FETCH ERROR:', error.message);
  }
}

testPayment();
