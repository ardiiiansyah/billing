// app/api/test-db/route.js
// Debug endpoint untuk test database connection
// Access: https://beatnet.vercel.app/api/test-db

import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Test 1: Check paket
    const { data: paket, error: paketError } = await supabase
      .from('paket')
      .select('*')
      .limit(5)

    // Test 2: Check pelanggan
    const { data: pelanggan, error: pelangganError } = await supabase
      .from('pelanggan')
      .select('*')
      .limit(5)

    // Test 3: Check pembayaran
    const { data: pembayaran, error: pembayaranError } = await supabase
      .from('pembayaran')
      .select('*')
      .limit(5)

    return Response.json({
      success: true,
      results: {
        paket: {
          count: paket?.length || 0,
          data: paket,
          error: paketError?.message || null
        },
        pelanggan: {
          count: pelanggan?.length || 0,
          data: pelanggan,
          error: pelangganError?.message || null
        },
        pembayaran: {
          count: pembayaran?.length || 0,
          data: pembayaran,
          error: pembayaranError?.message || null
        }
      },
      env_check: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        service_role: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
      }
    })
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
