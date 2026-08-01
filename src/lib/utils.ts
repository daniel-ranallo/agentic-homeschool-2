/**
 * Shared Utilities
 *
 * Common utility functions used across the application.
 * Centralizes duplicate code patterns for better maintainability.
 */

import { NextResponse } from "next/server";

/**
 * CORS headers used across all API routes.
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

/**
 * Creates a standardized JSON response with CORS headers.
 *
 * @param data - Response data
 * @param options - Optional status code and headers
 * @returns NextResponse with CORS headers
 */
export function jsonWithCors(
  data: unknown,
  options?: {
    status?: number;
    headers?: Record<string, string>;
  }
): NextResponse {
  return NextResponse.json(data, {
    status: options?.status,
    headers: {
      ...CORS_HEADERS,
      ...options?.headers,
    },
  });
}

/**
 * Creates an error response with CORS headers.
 *
 * @param error - Error message
 * @param details - Optional additional details
 * @param status - HTTP status code (default: 500)
 * @returns NextResponse with error
 */
export function errorResponse(
  error: string,
  details?: string,
  status: number = 500
): NextResponse {
  return jsonWithCors(
    {
      error,
      message: details || "An unexpected error occurred",
    },
    { status }
  );
}

/**
 * Standard LLM endpoint URL.
 * Single source of truth for the LLM service location.
 */
export const LLM_ENDPOINT =
  process.env.LLM_ENDPOINT || "http://spark.ranallohome.com:8001";

/**
 * Validates that a value is a non-empty string within length limits.
 *
 * @param value - Value to validate
 * @param fieldName - Field name for error messages
 * @param maxLength - Maximum allowed length
 * @returns True if valid
 */
export function isValidString(
  value: unknown,
  fieldName: string,
  maxLength: number
): boolean {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

/**
 * Gets the time-to-live duration in milliseconds.
 * Useful for cache configuration.
 */
export function getCacheTTL(minutes: number): number {
  return minutes * 60 * 1000;
}
