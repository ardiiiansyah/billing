// test-fonnte.js
// Quick script to test Fonnte connection
// Run: node test-fonnte.js

const FONNTE_TOKEN = process.env.FONNTE_TOKEN || 'YOUR_FONNTE_TOKEN_HERE';
const TEST_NUMBER = '628123456789'; // Your WhatsApp number

async function testFonnte() {
  console.log('🧪 Testing Fonnte Connection...\n');
  
  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        target: TEST_NUMBER,
        message: '🧪 Test dari Sultan WiFi Billing System\n\nKoneksi Fonnte berhasil! ✅',
        countryCode: '62',
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.status !== false) {
      console.log('✅ SUCCESS! Fonnte connected');
      console.log('📱 WhatsApp should be sent to:', TEST_NUMBER);
      console.log('📊 Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ FAILED! Check your token');
      console.log('📊 Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testFonnte();
