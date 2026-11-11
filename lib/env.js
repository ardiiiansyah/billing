// lib/env.js
// Environment variables validation - runs at startup to prevent runtime crashes

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MAYAR_API_KEY',
  'MAYAR_WEBHOOK_SECRET',
  'FONNTE_TOKEN',
  'CRON_SECRET',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
]

const OPTIONAL_ENV_VARS = [
  'MAYAR_ENV', // sandbox | production (defaults to sandbox)
  'MAYAR_BASE_URL', // Has default fallback
  'MAYAR_VERIFY_WEBHOOK', // Defaults to enabled
  'MAYAR_SEND_EMAIL', // Defaults to disabled
  'NEXT_PUBLIC_APP_URL', // Required for payment redirects but checked at runtime
  'BANK_ACCOUNT_NUMBER',
  'BANK_ACCOUNT_NAME',
  'DANA_ACCOUNT',
]

export function validateEnv() {
  const missing = []
  const warnings = []

  // Check required vars
  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key]
    if (!value || value.trim() === '') {
      missing.push(key)
    }
  }

  // Check optional but recommended vars
  for (const key of OPTIONAL_ENV_VARS) {
    const value = process.env[key]
    if (!value || value.trim() === '') {
      warnings.push(key)
    }
  }

  if (missing.length > 0) {
    const error = new Error(
      `❌ Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}\n\nPlease check your .env.local file.`
    )
    error.name = 'EnvironmentError'
    throw error
  }

  if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn(
      `⚠️  Missing optional environment variables:\n${warnings.map(k => `  - ${k}`).join('\n')}\n\nSome features may not work correctly.`
    )
  }

  return true
}

// Run validation immediately when imported (server-side only)
if (typeof window === 'undefined') {
  try {
    validateEnv()
    console.log('✅ Environment variables validated successfully')
  } catch (error) {
    console.error(error.message)
    if (process.env.NODE_ENV === 'production') {
      // In production, crash immediately to prevent deployment with missing vars
      process.exit(1)
    }
  }
}
