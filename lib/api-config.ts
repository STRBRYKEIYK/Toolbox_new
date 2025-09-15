export interface ApiConfig {
  baseUrl: string
  isConnected: boolean
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: "http://192.168.68.106:3001",
  isConnected: false,
}

export const API_ENDPOINTS = {
  items: "/api/items",
  employees: "/api/employees",
} as const

export class ApiService {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  updateConfig(newConfig: Partial<ApiConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): ApiConfig {
    return { ...this.config }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      const isConnected = response.ok
      this.config.isConnected = isConnected
      return isConnected
    } catch (error) {
      console.error("[v0] API connection test failed:", error)
      this.config.isConnected = false
      return false
    }
  }

  async fetchItems(): Promise<any[]> {
    if (!this.config.isConnected) {
      throw new Error("API not connected")
    }

    try {
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.items}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error("[v0] Failed to fetch items:", error)
      throw error
    }
  }

  async fetchEmployees(): Promise<any[]> {
    if (!this.config.isConnected) {
      throw new Error("API not connected")
    }

    try {
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.employees}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch employees: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error("[v0] Failed to fetch employees:", error)
      throw error
    }
  }

  async commitItemChanges(items: any[]): Promise<boolean> {
    if (!this.config.isConnected) {
      throw new Error("API not connected")
    }

    try {
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.items}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(items),
      })

      if (!response.ok) {
        throw new Error(`Failed to commit changes: ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error("[v0] Failed to commit item changes:", error)
      throw error
    }
  }
}

export const apiService = new ApiService(DEFAULT_API_CONFIG)
