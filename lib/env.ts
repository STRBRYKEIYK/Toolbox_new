// Environment configuration utilities
export const env = {
  // API Configuration
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://qxw.2ee.mytemp.website',
  API_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '15000'),
  
  // App Configuration
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Toolbox Inventory System',
  APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Development settings
  DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  
  // Rate limiting
  RATE_LIMIT_REQUESTS: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_REQUESTS || '100'),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS || '60000'),
  
  // Feature flags
  ENABLE_BARCODE_SCANNER: process.env.NEXT_PUBLIC_ENABLE_BARCODE_SCANNER !== 'false',
  ENABLE_OFFLINE_MODE: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE !== 'false',
  ENABLE_EXPORT_FEATURES: process.env.NEXT_PUBLIC_ENABLE_EXPORT_FEATURES !== 'false',
  
  // Logging
  LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
  
  // Environment detection
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const

// Type-safe environment validation
export function validateEnvironment() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_API_BASE_URL',
  ] as const

  const missing = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  )

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }

  // Validate URL format
  try {
    new URL(env.API_BASE_URL)
  } catch {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must be a valid URL')
  }

  // Validate numeric values
  if (isNaN(env.API_TIMEOUT) || env.API_TIMEOUT <= 0) {
    throw new Error('NEXT_PUBLIC_API_TIMEOUT must be a positive number')
  }

  if (isNaN(env.RATE_LIMIT_REQUESTS) || env.RATE_LIMIT_REQUESTS <= 0) {
    throw new Error('NEXT_PUBLIC_RATE_LIMIT_REQUESTS must be a positive number')
  }

  if (isNaN(env.RATE_LIMIT_WINDOW_MS) || env.RATE_LIMIT_WINDOW_MS <= 0) {
    throw new Error('NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS must be a positive number')
  }

  console.log('[ENV] Environment validation passed')
}

// Initialize environment validation
if (typeof window !== 'undefined') {
  // Client-side validation
  try {
    validateEnvironment()
  } catch (error) {
    console.error('[ENV] Environment validation failed:', error)
    if (env.IS_PRODUCTION) {
      // In production, you might want to show a user-friendly error
      throw error
    }
  }
}

export default env