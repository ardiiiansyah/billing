// Error monitoring wrapper for critical operations
// Usage: import { captureError, captureMessage, withErrorBoundary } from '@/lib/monitoring'

import * as Sentry from '@sentry/nextjs'

const isProduction = process.env.NODE_ENV === 'production'
const isSentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)

/**
 * Capture an error with context
 * @param {Error} error - The error object
 * @param {Object} context - Additional context
 */
export function captureError(error, context = {}) {
  // Always log to console
  console.error('[ERROR]', error.message, context)
  
  // Send to Sentry in production if enabled
  if (isProduction && isSentryEnabled) {
    Sentry.captureException(error, {
      level: 'error',
      tags: context.tags || {},
      extra: context.extra || {},
    })
  }
}

/**
 * Capture a message (non-error event)
 * @param {string} message - The message
 * @param {string} level - info|warning|error
 * @param {Object} context - Additional context
 */
export function captureMessage(message, level = 'info', context = {}) {
  console.log(`[${level.toUpperCase()}]`, message, context)
  
  if (isProduction && isSentryEnabled) {
    Sentry.captureMessage(message, {
      level,
      tags: context.tags || {},
      extra: context.extra || {},
    })
  }
}

/**
 * Wrap async function with error boundary
 * @param {Function} fn - Async function to wrap
 * @param {Object} context - Context for error reporting
 */
export function withErrorBoundary(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      captureError(error, {
        ...context,
        tags: {
          function: fn.name || 'anonymous',
          ...context.tags,
        },
      })
      throw error
    }
  }
}

/**
 * Track payment-related errors with special handling
 */
export function capturePaymentError(error, paymentData = {}) {
  const sanitized = {
    tagihan_id: paymentData.tagihan_id || '[missing]',
    amount: paymentData.amount || '[missing]',
    provider: paymentData.provider || 'mayar',
    gateway_order_id: paymentData.gateway_order_id || '[missing]',
    // Never log customer PII
  }
  
  captureError(error, {
    tags: { 
      component: 'payment',
      provider: sanitized.provider,
    },
    extra: sanitized,
  })
}

/**
 * Track webhook-related errors
 */
export function captureWebhookError(error, webhookData = {}) {
  const sanitized = {
    event_id: webhookData.event_id || '[missing]',
    reference: webhookData.reference || '[missing]',
    status: webhookData.status || '[missing]',
    amount: webhookData.amount || '[missing]',
  }
  
  captureError(error, {
    tags: {
      component: 'webhook',
      provider: 'mayar',
    },
    extra: sanitized,
  })
}

/**
 * Track WhatsApp delivery failures
 */
export function captureWhatsAppError(error, context = {}) {
  const sanitized = {
    batch_size: context.batch_size,
    failed_count: context.failed_count,
    // Never log phone numbers or message content
  }
  
  captureError(error, {
    tags: {
      component: 'whatsapp',
      provider: 'fonnte',
    },
    extra: sanitized,
  })
}

export default {
  captureError,
  captureMessage,
  withErrorBoundary,
  capturePaymentError,
  captureWebhookError,
  captureWhatsAppError,
}
