import type { ApiConfig } from '../api-config'
import { API_ENDPOINTS } from '../api-config'

/**
 * Employees Service
 * Handles all employee-related API operations
 */
export class EmployeesService {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  updateConfig(config: ApiConfig) {
    this.config = config
  }

  /**
   * Fetch all employees from the API
   */
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
        throw new Error(`Failed to fetch employees: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Handle response structure consistently
      let employees: any[] = []
      if (data && typeof data === 'object') {
        if (data.success && data.employees && Array.isArray(data.employees)) {
          // Handle structure: {success: true, employees: [...]}
          employees = data.employees
        } else if (data.success && data.data && data.data.employees && Array.isArray(data.data.employees)) {
          // Handle nested structure: {success: true, data: {employees: [...], ...}}
          employees = data.data.employees
        } else if (data.success && Array.isArray(data.data)) {
          // Handle flat structure: {success: true, data: [...]}
          employees = data.data
        } else if (Array.isArray(data)) {
          // Handle direct array: [...]
          employees = data
        } else {
          console.log("[EmployeesService] Unexpected API response structure:", Object.keys(data))
          if (data.data && typeof data.data === 'object') {
            console.log("[EmployeesService] data.data structure:", Object.keys(data.data))
          }
          throw new Error("Invalid employees response structure")
        }
      } else {
        throw new Error("Invalid API response format")
      }
      
      console.log("[EmployeesService] Successfully fetched employees from API:", employees.length, "employees")
      return employees
    } catch (error) {
      console.error("[EmployeesService] Failed to fetch employees:", error)
      throw error
    }
  }
}