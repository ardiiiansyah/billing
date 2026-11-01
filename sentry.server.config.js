// sentry.server.config.js
// Sentry server-side configuration

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance monitoring - lower sample rate on server
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
    
    // Environment
    environment: process.env.NODE_ENV || 'development',
    
    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production',
    
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'Non-Error promise rejection captured',
      // Network errors that are expected
      'NetworkError',
      'Failed to fetch',
    ],
    
    // Filter sensitive data
    beforeSend(event, hint) {
      // Mask sensitive data in error messages
      if (event.message) {
        event.message = event.message
          .replace(/\b62\d{9,12}\b/g, '62XXXXXXXXX') // Phone numbers
          .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Emails
      }
      
      // Don't send webhook signature verification failures (too noisy)
      if (event.exception?.values?.[0]?.value?.includes('Invalid signature')) {
        return null
      }
      
      return event
    },
  })
}
