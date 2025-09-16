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
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.items}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        signal: AbortSignal.timeout(5000),
      })

      const isConnected = response.ok
      this.config.isConnected = isConnected

      if (isConnected) {
        console.log("[v0] API connection successful")
      } else {
        console.log("[v0] API connection failed - response not ok:", response.status, response.statusText)
      }

      return isConnected
    } catch (error) {
      console.error("[v0] API connection test failed:", error)

      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        console.error("[v0] This is likely a CORS issue or the API server is not running")
      }

      this.config.isConnected = false
      return false
    }
  }

  async fetchItems(): Promise<any[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.items}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[v0] Successfully fetched items from API:", data.length, "items")
      return data
    } catch (error) {
      console.error("[v0] Failed to fetch items:", error)
      throw error
    }
  }

  async fetchEmployees(): Promise<any[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.employees}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch employees: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[v0] Successfully fetched employees from API:", data.length, "employees")
      return data
    } catch (error) {
      console.error("[v0] Failed to fetch employees:", error)
      throw error
    }
  }

  async commitItemChanges(items: any[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.items}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        body: JSON.stringify(items),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error(`Failed to commit changes: ${response.statusText}`)
      }

      console.log("[v0] Successfully committed item changes to API")
      return true
    } catch (error) {
      console.error("[v0] Failed to commit item changes:", error)
      throw error
    }
  }
}

export const apiService = new ApiService(DEFAULT_API_CONFIG)
