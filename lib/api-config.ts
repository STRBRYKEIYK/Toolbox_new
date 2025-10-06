import env from './env'

/**
 * API Configuration Types and Constants
 * 
 * This file now only contains configuration types and constants.
 * All API service functionality has been moved to the new service architecture:
 * - lib/Services/ - Individual service classes
 * - lib/api_service.ts - Main service orchestrator
 */

// Core API configuration interface
export interface ApiConfig {
  baseUrl: string
  isConnected: boolean
}

// Default configuration
export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: env.API_BASE_URL,
  isConnected: false,
}

// API endpoint constants (used by services)
export const API_ENDPOINTS = {
  items: "/api/items",
  employees: "/api/employees",
  checkout: "/api/items/checkout", // Bulk checkout endpoint
  transactions: "/api/employee-logs", // Fixed: corrected endpoint with hyphen
  // Item stock operations
  itemStock: "/api/items/stock", // Base path for stock operations (/api/items/stock/{id}/out)
} as const

// Transaction-related type definitions
export interface TransactionFilters {
  username?: string
  date_from?: string
  date_to?: string
  search?: string
  limit?: number
  offset?: number
}

export interface TransactionResponse {
  data: any[]
  total: number
  limit: number
  offset: number
  filters: {
    username?: string
    date_from?: string
    date_to?: string
    search?: string
  }
}

export interface TransactionStats {
  period_days: number
  total_logs: number
  recent_logs: number
  active_users: number
  logs_by_day: Array<{
    log_date: string
    log_count: number
    unique_users: number
  }>
  top_users: Array<{
    username: string
    log_count: number
    last_activity: string
  }>
}