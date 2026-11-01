/**
 * CSRF Protection Utility
 * Implements Synchronizer Token Pattern for state-changing operations
 */

import crypto from 'crypto'

const CSRF_TOKEN_LENGTH = 32
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000 // 1 hour

// In-memory store for CSRF tokens
// For production with multiple servers, use Redis or database
const csrfStore = new Map()

// Cleanup expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [token, data] of csrfStore.entries()) {
    if (now > data.expiresAt) {
      csrfStore.delete(token)
    }
  }
}, 10 * 60 * 1000)

/**
 * Generate a new CSRF token for a session
 * @param {string} sessionId - Unique session identifier (user ID or session token)
 * @returns {string} CSRF token
 */
export function generateCsrfToken(sessionId) {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
  const expiresAt = Date.now() + CSRF_TOKEN_EXPIRY
  
  csrfStore.set(token, {
    sessionId,
    expiresAt,
    createdAt: Date.now(),
  })
  
  return token
}

/**
 * Verify CSRF token
 * @param {string} token - CSRF token from request
 * @param {string} sessionId - Current session identifier
 * @returns {boolean} True if valid
 */
export function verifyCsrfToken(token, sessionId) {
  if (!token || !sessionId) return false
  
  const stored = csrfStore.get(token)
  
  if (!stored) return false
  if (stored.sessionId !== sessionId) return false
  if (Date.now() > stored.expiresAt) {
    csrfStore.delete(token)
    return false
  }
  
  return true
}

/**
 * Consume CSRF token (single-use)
 * @param {string} token - CSRF token
 * @returns {boolean} True if successfully consumed
 */
export function consumeCsrfToken(token) {
  if (!token) return false
  return csrfStore.delete(token)
}

/**
 * Extract CSRF token from request
 * Checks header (X-CSRF-Token) and body (_csrf field)
 */
export function extractCsrfToken(request, body = null) {
  // Check header first
  const headerToken = request.headers.get('x-csrf-token') || request.headers.get('x-xsrf-token')
  if (headerToken) return headerToken
  
  // Check body
  if (body && typeof body === 'object' && body._csrf) {
    return body._csrf
  }
  
  return null
}

/**
 * Middleware helper for CSRF validation
 * @param {Request} request - Next.js request object
 * @param {string} sessionId - Current session identifier
 * @param {object} body - Parsed request body (optional)
 * @returns {object} { valid: boolean, error: string }
 */
export function validateCsrfToken(request, sessionId, body = null) {
  const token = extractCsrfToken(request, body)
  
  if (!token) {
    return {
      valid: false,
      error: 'CSRF token missing',
    }
  }
  
  if (!verifyCsrfToken(token, sessionId)) {
    return {
      valid: false,
      error: 'CSRF token invalid or expired',
    }
  }
  
  return {
    valid: true,
    error: null,
  }
}

/**
 * Check if request method requires CSRF protection
 */
export function requiresCsrfProtection(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
}

/**
 * Validate Origin/Referer header for defense-in-depth
 */
export function validateOrigin(request, allowedOrigins) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  const requestOrigin = origin || (referer ? new URL(referer).origin : null)
  
  if (!requestOrigin) return false
  
  // Check if origin is in allowed list
  return allowedOrigins.some(allowed => requestOrigin === allowed || requestOrigin.endsWith(`.${allowed}`))
}

/**
 * Complete CSRF protection for API route
 * Usage in API route:
 * 
 * const csrfCheck = await applyCsrfProtection(request, user.id, body)
 * if (!csrfCheck.valid) return csrfCheck.response
 */
export async function applyCsrfProtection(request, sessionId, body = null) {
  // Skip for GET, HEAD, OPTIONS
  if (!requiresCsrfProtection(request.method)) {
    return { valid: true }
  }
  
  // Validate Origin/Referer
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    const allowedOrigins = [new URL(appUrl).origin]
    if (!validateOrigin(request, allowedOrigins)) {
      return {
        valid: false,
        response: Response.json(
          { error: 'Invalid request origin' },
          { status: 403 }
        ),
      }
    }
  }
  
  // Validate CSRF token
  const validation = validateCsrfToken(request, sessionId, body)
  
  if (!validation.valid) {
    return {
      valid: false,
      response: Response.json(
        { error: validation.error },
        { status: 403 }
      ),
    }
  }
  
  return { valid: true }
}
