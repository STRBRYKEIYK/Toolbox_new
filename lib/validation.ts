import { z } from "zod"

// Input validation schemas
export const BarcodeSchema = z.string()
  .trim()
  .min(1, "Barcode cannot be empty")
  .max(50, "Barcode too long")
  .regex(/^[A-Za-z0-9]+$/, "Barcode can only contain letters and numbers")

export const ItemIdSchema = z.string()
  .trim()
  .min(1, "Item ID cannot be empty")
  .max(20, "Item ID too long")
  .regex(/^[A-Za-z0-9]+$/, "Item ID can only contain letters and numbers")

export const QuantitySchema = z.number()
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1")
  .max(1000, "Quantity cannot exceed 1000")

export const EmployeeIdSchema = z.string()
  .trim()
  .min(1, "Employee ID cannot be empty")
  .max(20, "Employee ID too long")
  .regex(/^[A-Za-z0-9_-]+$/, "Employee ID format invalid")

export const UsernameSchema = z.string()
  .trim()
  .min(2, "Username must be at least 2 characters")
  .max(50, "Username too long")
  .regex(/^[A-Za-z0-9_.\s-]+$/, "Username contains invalid characters")

export const ApiUrlSchema = z.string()
  .url("Invalid URL format")
  .refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    "URL must start with http:// or https://"
  )

export const SearchQuerySchema = z.string()
  .trim()
  .max(100, "Search query too long")
  .regex(/^[A-Za-z0-9\s._-]*$/, "Search query contains invalid characters")

// API response validation schemas
export const ApiItemSchema = z.object({
  item_no: z.union([z.string(), z.number()]).transform(String),
  item_name: z.string().min(1, "Item name is required"),
  brand: z.string().optional().default("Unknown Brand"),
  item_type: z.string().optional().default("General"),
  location: z.string().optional().default("Unknown Location"),
  balance: z.number().min(0, "Balance cannot be negative"),
  item_status: z.string().optional(),
})

export const ApiEmployeeSchema = z.object({
  id: z.number(),
  fullName: z.string().min(1, "Full name is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  idNumber: z.string().min(1, "ID number is required"),
  idBarcode: z.string().min(1, "ID barcode is required"),
  position: z.string().min(1, "Position is required"),
  department: z.string().min(1, "Department is required"),
  status: z.string().min(1, "Status is required"),
  email: z.string().email("Invalid email format"),
  contactNumber: z.string().optional(),
  age: z.number().optional(),
  birthDate: z.string(),
  hireDate: z.string(),
  isNewHire: z.boolean().default(false),
  salary: z.string().optional(),
  profilePicture: z.string().optional(),
  document: z.string().optional(),
  createdAt: z.string(),
  address: z.string().optional(),
  civilStatus: z.string().optional(),
  pagibigNumber: z.string().optional(),
  philhealthNumber: z.string().optional(),
  sssNumber: z.string().optional(),
  tinNumber: z.string().optional(),
})

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  message: z.string().optional(),
  error: z.string().optional(),
})

// Validation functions
export function validateBarcode(input: string): { isValid: boolean; error?: string; value?: string } {
  try {
    const validated = BarcodeSchema.parse(input)
    return { isValid: true, value: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || "Invalid barcode" }
    }
    return { isValid: false, error: "Validation error" }
  }
}

export function validateItemId(input: string): { isValid: boolean; error?: string; value?: string } {
  try {
    const validated = ItemIdSchema.parse(input)
    return { isValid: true, value: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || "Invalid item ID" }
    }
    return { isValid: false, error: "Validation error" }
  }
}

export function validateQuantity(input: number): { isValid: boolean; error?: string; value?: number } {
  try {
    const validated = QuantitySchema.parse(input)
    return { isValid: true, value: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || "Invalid quantity" }
    }
    return { isValid: false, error: "Validation error" }
  }
}

export function validateEmployeeId(input: string): { isValid: boolean; error?: string; value?: string } {
  try {
    const validated = EmployeeIdSchema.parse(input)
    return { isValid: true, value: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || "Invalid employee ID" }
    }
    return { isValid: false, error: "Validation error" }
  }
}

export function validateApiUrl(input: string): { isValid: boolean; error?: string; value?: string } {
  try {
    const validated = ApiUrlSchema.parse(input)
    return { isValid: true, value: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || "Invalid API URL" }
    }
    return { isValid: false, error: "Validation error" }
  }
}

export function validateSearchQuery(input: string): { isValid: boolean; error?: string; value?: string } {
  try {
    const validated = SearchQuerySchema.parse(input)
    return { isValid: true, value: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || "Invalid search query" }
    }
    return { isValid: false, error: "Validation error" }
  }
}

// Sanitization functions
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

export function sanitizeForLog(input: any): string {
  if (typeof input === "string") {
    return sanitizeHtml(input).substring(0, 1000) // Limit length
  }
  if (typeof input === "object") {
    try {
      return sanitizeHtml(JSON.stringify(input)).substring(0, 1000)
    } catch {
      return "[Object]"
    }
  }
  return String(input).substring(0, 1000)
}

// Rate limiting helper (simple in-memory implementation)
class RateLimiter {
  private requests = new Map<string, number[]>()
  
  isAllowed(key: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now()
    const windowStart = now - windowMs
    
    if (!this.requests.has(key)) {
      this.requests.set(key, [])
    }
    
    const timestamps = this.requests.get(key)!
    // Remove old timestamps
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart)
    
    if (validTimestamps.length >= maxRequests) {
      return false
    }
    
    validTimestamps.push(now)
    this.requests.set(key, validTimestamps)
    return true
  }
  
  clear() {
    this.requests.clear()
  }
}

export const rateLimiter = new RateLimiter()

// Security headers helper
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const