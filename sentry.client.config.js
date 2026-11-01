// sentry.client.config.js
// Sentry client-side configuration

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session replay (optional, but useful for debugging)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Environment
    environment: process.env.NODE_ENV || 'development',
    
    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production',
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove potential PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            // Mask phone numbers
            if (breadcrumb.data.no_wa || breadcrumb.data.nomor) {
              breadcrumb.data.no_wa = '[REDACTED]'
              breadcrumb.data.nomor = '[REDACTED]'
            }
            // Mask emails
            if (breadcrumb.data.email) {
              breadcrumb.data.email = '[REDACTED]'
            }
          }
          return breadcrumb
        })
      }
      return event
    },
  })
}
