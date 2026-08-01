/**
 * Security Utilities
 *
 * Provides input validation, sanitization, and rate limiting for API routes.
 * Helps protect against common attack vectors including XSS, prompt injection,
 * and denial of service via rate limiting.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Maximum input lengths to prevent abuse and resource exhaustion.
 */
export const MAX_INPUT_LENGTHS = {
  title: 200,
  gradeLevel: 100,
  skills: 500,
  userFeedback: 2000,
  threadId: 64,
} as const;

/**
 * Validation result type.
 */
interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validates string input against common attack vectors.
 * Checks for empty strings, length limits, and performs basic XSS sanitization.
 *
 * @param value - Input value to validate
 * @param fieldName - Name of the field for error messages
 * @param maxLength - Maximum allowed length
 * @returns Validation result with optional sanitized value
 */
export function validateInput(value: unknown, fieldName: string, maxLength: number): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} exceeds maximum length of ${maxLength}` };
  }

  // Basic XSS prevention - strip script tags and event handlers
  const sanitized = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:/gi, "");

  return { valid: true, sanitized };
}

/**
 * Sanitize input for safe LLM processing.
 * Removes common prompt injection patterns to prevent users from
 * overriding system instructions or injecting malicious prompts.
 *
 * @param input - Raw user input
 * @returns Sanitized input with dangerous patterns removed
 */
export function sanitizeForLLM(input: string): string {
  // Remove common prompt injection patterns
  return input
    // Remove system instruction attempts
    .replace(/(?:^|\n)\s*(?:ignore|disregard|forget|override)\s+(?:previous|all|all previous|all prior)\s*(?:instructions|directions|guidelines)/gi, "[REDACTED]")
    // Remove instruction overrides
    .replace(/(?:^|\n)\s*(?:you are|act as|from now on)\s+to\s+(?:be|become)/gi, "[REDACTED]")
    // Remove hidden instruction markers
    .replace(/---+|\*{3,}|={3,}/g, " [DELIMITER] ")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Rate limiter configuration.
 */
interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed in the window */
  maxRequests: number;
}

/**
 * In-memory store for rate limiting.
 * Note: For production, use Redis or similar for distributed rate limiting.
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Creates a rate limiter function with configurable window and limits.
 *
 * @param config - Rate limiting configuration
 * @returns Rate limiter function that checks if requests should be allowed
 */
export function createRateLimiter(config: RateLimitConfig) {
  return function rateLimiter(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      // New window
      rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
    }

    if (record.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: record.resetAt };
    }

    record.count++;
    return { allowed: true, remaining: config.maxRequests - record.count, resetAt: record.resetAt };
  };
}

// Default rate limiters
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

export const workflowRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 workflow executions per minute
});

/**
 * Middleware to check rate limits from request headers
 */
export function getRateLimitKey(req: NextRequest): string {
  // Use IP address or a fallback identifier
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ||
             req.headers.get("x-real-ip") ||
             "anonymous";
  return `rate:${ip}`;
}

/**
 * Check rate limit and return response if exceeded
 */
export function checkRateLimit(req: NextRequest, limiter: ReturnType<typeof createRateLimiter>, maxRequests: number): NextResponse | null {
  const key = getRateLimitKey(req);
  const result = limiter(key);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Sanitize error message to prevent information leakage
 */
export function sanitizeErrorMessage(error: unknown): { publicMessage: string; logDetails?: string } {
  const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

  // Log full details for debugging
  const logDetails = error instanceof Error
    ? `${error.constructor.name}: ${error.message}\n${error.stack || ""}`
    : String(error);

  // Safe public message - never expose internal details
  const publicMessage = "An unexpected error occurred. Please try again.";

  return { publicMessage, logDetails };
}

/**
 * Validate thread ID format (UUID)
 */
export function isValidThreadId(id: string): boolean {
  if (typeof id !== "string") {
    return false;
  }
  // UUID v4 pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}
