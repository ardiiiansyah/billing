/**
 * Security Headers Configuration
 * Implements OWASP recommended security headers
 */

/**
 * Get Content Security Policy header value
 * Restrictive policy that allows only necessary sources
 */
export function getCSPHeader(nonce = null) {
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' ${nonce ? `'nonce-${nonce}'` : "'unsafe-inline'"} 'unsafe-eval' https://vercel.live`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mayar.io https://api.fonnte.com https://vercel.live",
    "frame-src 'self' https://checkout.mayar.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ]
  
  return cspDirectives.join('; ')
}

/**
 * Get all security headers
 * @param {object} options - Configuration options
 * @returns {object} Headers object
 */
export function getSecurityHeaders(options = {}) {
  const {
    enableHSTS = true,
    hstsMaxAge = 31536000, // 1 year
    includeSubdomains = false,
    enableCSP = true,
    nonce = null,
  } = options
  
  const headers = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Enable XSS protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy (disable unnecessary features)
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
    
    // Remove server header
    'X-Powered-By': '', // This removes the header
  }
  
  // HSTS (only for HTTPS)
  if (enableHSTS) {
    headers['Strict-Transport-Security'] = `max-age=${hstsMaxAge}${includeSubdomains ? '; includeSubDomains' : ''}; preload`
  }
  
  // Content Security Policy
  if (enableCSP) {
    headers['Content-Security-Policy'] = getCSPHeader(nonce)
  }
  
  return headers
}

/**
 * Apply security headers to a Next.js response
 */
export function applySecurityHeaders(response, options = {}) {
  const headers = getSecurityHeaders(options)
  
  Object.entries(headers).forEach(([key, value]) => {
    if (value === '') {
      response.headers.delete(key)
    } else {
      response.headers.set(key, value)
    }
  })
  
  return response
}

/**
 * Cache control headers for different content types
 */
export const CACHE_HEADERS = {
  // No cache for sensitive data
  NO_CACHE: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  
  // Short cache for dynamic content
  SHORT: {
    'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
  },
  
  // Medium cache for semi-static content
  MEDIUM: {
    'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
  },
  
  // Long cache for static assets
  LONG: {
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
}

/**
 * Apply cache headers based on content type
 */
export function applyCacheHeaders(response, cacheType = 'NO_CACHE') {
  const headers = CACHE_HEADERS[cacheType] || CACHE_HEADERS.NO_CACHE
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

/**
 * CORS headers configuration
 */
export function getCORSHeaders(origin = null) {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean)
  
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 hours
  }
  
  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  
  return headers
}

/**
 * Apply CORS headers for API responses
 */
export function applyCORSHeaders(request, response) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCORSHeaders(origin)
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCORSPreflight(request) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCORSHeaders(origin)
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}
