// Environment configuration utilities

// Helper to get environment variables from various sources
const getEnvVar = (key: string): string | undefined => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Browser environment - check window object
    return (window as any).__ENV__?.[key] || undefined
  }
  
  // Node.js environment - check process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  
  return undefined
}

// Helper to get NODE_ENV
const getNodeEnv = (): string => {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV
  }
  return 'development'
}

export interface EnvConfig {
  // API Configuration
  API_BASE_URL: string
  API_TIMEOUT: number
  
  // App Configuration
  APP_NAME: string
  APP_VERSION: string
  
  // Development settings
  DEBUG_MODE: boolean
  ENABLE_ANALYTICS: boolean
  
  // Rate limiting
  RATE_LIMIT_REQUESTS: number
  RATE_LIMIT_WINDOW_MS: number
  
  // Feature flags
  ENABLE_BARCODE_SCANNER: boolean
  ENABLE_OFFLINE_MODE: boolean
  ENABLE_EXPORT_FEATURES: boolean
  
  // Logging
  LOG_LEVEL: string
  
  // Environment detection
  IS_DEVELOPMENT: boolean
  IS_PRODUCTION: boolean
  IS_TEST: boolean
}

export const env: Readonly<EnvConfig> = {
  // API Configuration
  API_BASE_URL: getEnvVar('NEXT_PUBLIC_API_BASE_URL') || 'http://qxw.2ee.mytemp.website',
  API_TIMEOUT: parseInt(getEnvVar('NEXT_PUBLIC_API_TIMEOUT') || '15000'),
  
  // App Configuration
  APP_NAME: getEnvVar('NEXT_PUBLIC_APP_NAME') || 'Toolbox Inventory System',
  APP_VERSION: getEnvVar('NEXT_PUBLIC_APP_VERSION') || '1.0.0',
  
  // Development settings
  DEBUG_MODE: getEnvVar('NEXT_PUBLIC_DEBUG_MODE') === 'true',
  ENABLE_ANALYTICS: getEnvVar('NEXT_PUBLIC_ENABLE_ANALYTICS') === 'true',
  
  // Rate limiting
  RATE_LIMIT_REQUESTS: parseInt(getEnvVar('NEXT_PUBLIC_RATE_LIMIT_REQUESTS') || '100'),
  RATE_LIMIT_WINDOW_MS: parseInt(getEnvVar('NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS') || '60000'),
  
  // Feature flags
  ENABLE_BARCODE_SCANNER: getEnvVar('NEXT_PUBLIC_ENABLE_BARCODE_SCANNER') !== 'false',
  ENABLE_OFFLINE_MODE: getEnvVar('NEXT_PUBLIC_ENABLE_OFFLINE_MODE') !== 'false',
  ENABLE_EXPORT_FEATURES: getEnvVar('NEXT_PUBLIC_ENABLE_EXPORT_FEATURES') !== 'false',
  
  // Logging
  LOG_LEVEL: getEnvVar('NEXT_PUBLIC_LOG_LEVEL') || 'info',
  
  // Environment detection
  IS_DEVELOPMENT: getNodeEnv() === 'development',
  IS_PRODUCTION: getNodeEnv() === 'production',
  IS_TEST: getNodeEnv() === 'test',
} as const

// Type-safe environment validation
export function validateEnvironment(): void {
  const requiredEnvVars = [
    'NEXT_PUBLIC_API_BASE_URL',
  ] as const

  const missing = requiredEnvVars.filter(
    (envVar) => !getEnvVar(envVar)
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

// Function to inject environment variables (useful for browser builds)
export function injectEnvVars(envVars: Record<string, string>): void {
  if (typeof window !== 'undefined') {
    (window as any).__ENV__ = envVars
  }
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

// Default export for convenience
export default env