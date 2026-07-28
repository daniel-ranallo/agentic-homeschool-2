/**
 * Request Validation Utilities
 *
 * Centralized request validation helpers for API routes.
 * Reduces duplication of common validation patterns across the codebase.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateCsrfToken } from "./security";

/**
 * Allowed content types for API requests.
 */
export const ALLOWED_CONTENT_TYPES = ["application/json"];

/**
 * Validation result structure.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates the Content-Type header of a request.
 *
 * @param req - Next.js request
 * @param allowedTypes - Optional array of allowed content types (defaults to ALLOWED_CONTENT_TYPES)
 * @returns Validation result with error message if invalid
 */
export function validateContentType(
  req: NextRequest,
  allowedTypes: string[] = ALLOWED_CONTENT_TYPES
): ValidationResult {
  const contentType = req.headers.get("content-type") || "";

  const hasValidType = allowedTypes.some((type) =>
    contentType.toLowerCase().includes(type.toLowerCase())
  );

  if (!hasValidType) {
    return {
      valid: false,
      error: `Invalid content type. Expected one of: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validates CSRF token for state-changing operations.
 *
 * @param req - Next.js request
 * @param options - Optional configuration
 * @param options.warnOnly - If true, only log warning instead of blocking (default: false)
 * @returns Validation result with error message if invalid
 */
export function validateCsrf(
  req: NextRequest,
  options: { warnOnly?: boolean } = {}
): ValidationResult {
  const { warnOnly = false } = options;
  const csrfToken = req.headers.get("x-csrf-token");

  if (!csrfToken) {
    if (warnOnly) {
      console.warn("[Security] Missing CSRF token on request");
      return { valid: true };
    }
    return {
      valid: false,
      error: "CSRF token is required",
    };
  }

  if (!validateCsrfToken(csrfToken)) {
    return {
      valid: false,
      error: "Invalid or expired CSRF token",
    };
  }

  return { valid: true };
}

/**
 * Validates request body is a non-array object.
 *
 * @param body - Parsed request body
 * @returns Validation result with error message if invalid
 */
export function validateRequestBody(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      valid: false,
      error: "Request body must be a JSON object",
    };
  }
  return { valid: true };
}
