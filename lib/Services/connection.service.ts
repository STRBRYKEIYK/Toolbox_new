import { validateApiUrl, rateLimiter, sanitizeForLog } from '@/lib/validation'
import type { ApiConfig } from '../api-config'
import { API_ENDPOINTS } from '../api-config'

/**
 * Connection Service
 * Handles API connection testing and configuration
 */
export class ConnectionService {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  updateConfig(newConfig: Partial<ApiConfig>) {
    // Validate baseUrl if it's being updated
    if (newConfig.baseUrl) {
      const urlValidation = validateApiUrl(newConfig.baseUrl)
      if (!urlValidation.isValid) {
        throw new Error(`Invalid API URL: ${urlValidation.error}`)
      }
    }
    
    this.config = { ...this.config, ...newConfig }
    console.log("[ConnectionService] API config updated:", {
      baseUrl: this.config.baseUrl,
      isConnected: this.config.isConnected
    })
  }

  getConfig(): ApiConfig {
    return { ...this.config }
  }

  /**
   * Test connection to the API server
   */
  async testConnection(): Promise<boolean> {
    try {
      // Validate URL before making request
      const urlValidation = validateApiUrl(this.config.baseUrl)
      if (!urlValidation.isValid) {
        console.error("[ConnectionService] Invalid API URL:", urlValidation.error)
        this.config.isConnected = false
        return false
      }

      // Rate limiting check
      if (!rateLimiter.isAllowed('testConnection', 10, 60000)) {
        console.warn("[ConnectionService] Rate limit exceeded for connection test")
        return this.config.isConnected
      }

      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.items}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Toolbox-App/1.0",
        },
        mode: "cors",
        signal: AbortSignal.timeout(5000),
      })

      const isConnected = response.ok
      this.config.isConnected = isConnected

      if (isConnected) {
        console.log("[ConnectionService] API connection successful")
      } else {
        console.log("[ConnectionService] API connection failed - response not ok:", response.status, response.statusText)
        
        // Log additional error info for debugging
        try {
          const errorText = await response.text()
          console.log("[ConnectionService] API error response:", sanitizeForLog(errorText))
        } catch {
          // Ignore if can't read response
        }
      }

      return isConnected
    } catch (error) {
      console.error("[ConnectionService] API connection test failed:", sanitizeForLog(error))

      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        console.error("[ConnectionService] This is likely a CORS issue or the API server is not running")
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        console.error("[ConnectionService] Connection test timed out")
      }

      this.config.isConnected = false
      return false
    }
  }
}