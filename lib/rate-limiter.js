/**
 * Rate Limiter Utility
 * Simple in-memory rate limiter for Next.js API routes
 * For production, consider using Redis or Upstash Rate Limit
 */

const rateLimitStore = new Map()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.resetTime > 0) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Rate limit a request based on identifier (IP, user ID, etc)
 * @param {string} identifier - Unique identifier (IP address, user ID)
 * @param {number} limit - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} { success: boolean, remaining: number, resetTime: number }
 */
export function rateLimit(identifier, limit = 10, windowMs = 60000) {
  const now = Date.now()
  const key = `${identifier}`
  
  let record = rateLimitStore.get(key)
  
  if (!record) {
    record = {
      count: 0,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, record)
  }
  
  // Reset if window expired
  if (now > record.resetTime) {
    record.count = 0
    record.resetTime = now + windowMs
  }
  
  record.count++
  
  if (record.count > limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    }
  }
  
  return {
    success: true,
    remaining: limit - record.count,
    resetTime: record.resetTime,
  }
}

/**
 * Get client identifier from request (IP address)
 * Works with Vercel, Cloudflare, and direct connections
 */
export function getClientIdentifier(request) {
  // Try to get real IP from headers (Vercel/Cloudflare)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  return cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown'
}

/**
 * Middleware helper for rate limiting API routes
 * Usage: const rateLimitResult = await applyRateLimit(request, 'login', 5, 900000)
 */
export async function applyRateLimit(request, category = 'general', limit = 60, windowMs = 60000) {
  const identifier = getClientIdentifier(request)
  const key = `${category}:${identifier}`
  
  const result = rateLimit(key, limit, windowMs)
  
  return {
    ...result,
    identifier,
    category,
  }
}

/**
 * Rate limit response helper
 */
export function rateLimitResponse(rateLimitResult) {
  return Response.json(
    { 
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
      retryAfter: rateLimitResult.retryAfter,
    },
    { 
      status: 429,
      headers: {
        'Retry-After': String(rateLimitResult.retryAfter),
        'X-RateLimit-Limit': String(rateLimitResult.limit || 60),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(Math.floor(rateLimitResult.resetTime / 1000)),
      }
    }
  )
}

/**
 * Preset rate limit configurations
 */
export const RATE_LIMITS = {
  // Authentication endpoints - strict
  LOGIN: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  
  // Admin mutations - moderate
  ADMIN_MUTATION: { limit: 30, windowMs: 60 * 1000 }, // 30 per minute
  
  // Admin reads - generous
  ADMIN_READ: { limit: 120, windowMs: 60 * 1000 }, // 120 per minute
  
  // Payment operations - moderate
  PAYMENT_CREATE: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  PAYMENT_STATUS: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute per invoice
  
  // WhatsApp - controlled
  WHATSAPP_SEND: { limit: 30, windowMs: 60 * 1000 }, // 30 per minute
  
  // Webhook - generous for valid providers
  WEBHOOK: { limit: 120, windowMs: 60 * 1000 }, // 120 per minute per IP
  
  // Export operations - strict
  EXPORT: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
}
