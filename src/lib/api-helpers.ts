/**
 * API Route Helpers
 *
 * Reusable utilities for API route handlers to reduce duplication.
 * Provides standardized patterns for validation, error handling, and response formatting.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateInput,
  sanitizeForLLM,
  checkRateLimit,
  getRateLimitKey,
  sanitizeErrorMessage,
  MAX_INPUT_LENGTHS,
} from "./security";

/**
 * Standard API response structure.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Input fields commonly used in course-related API routes.
 */
export interface CourseInputFields {
  title?: string;
  gradeLevel?: string;
  skills?: string;
  userFeedback?: string;
}

/**
 * Validation result for multiple fields.
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: Record<string, string>;
}

/**
 * Validates multiple input fields at once.
 * Reduces duplication of validation code across API routes.
 *
 * @param fields - Object containing field values to validate
 * @param fieldConfigs - Configuration for each field with max lengths
 * @returns Validation result with errors and sanitized values
 */
export function validateMultipleFields<T extends Record<string, unknown>>(
  fields: T,
  fieldConfigs: Record<keyof T, { maxLength: number; fieldName: string }>
): ValidationResult {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, string> = {};

  for (const [key, config] of Object.entries(fieldConfigs)) {
    const value = fields[key];
    const validation = validateInput(value, config.fieldName, config.maxLength);

    if (!validation.valid) {
      errors[key] = validation.error || "Invalid input";
    } else {
      sanitized[key] = sanitizeForLLM(validation.sanitized || "");
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}

/**
 * Default validation for course input fields.
 *
 * @param input - Course input fields
 * @returns Validation result
 */
export function validateCourseInput(input: CourseInputFields): ValidationResult {
  return validateMultipleFields(input, {
    title: { maxLength: MAX_INPUT_LENGTHS.title, fieldName: "title" },
    gradeLevel: { maxLength: MAX_INPUT_LENGTHS.gradeLevel, fieldName: "gradeLevel" },
    skills: { maxLength: MAX_INPUT_LENGTHS.skills, fieldName: "skills" },
    userFeedback: { maxLength: MAX_INPUT_LENGTHS.userFeedback, fieldName: "userFeedback" },
  });
}

/**
 * Rate limit check wrapper that returns a response if exceeded.
 *
 * @param req - Next.js request
 * @param limiter - Rate limiter function
 * @param maxRequests - Maximum requests allowed
 * @returns Response if rate limited, null otherwise
 */
export function checkApiRateLimit(
  req: NextRequest,
  limiter: ReturnType<typeof checkRateLimit>,
  maxRequests: number
): NextResponse | null {
  const rateLimitResponse = checkRateLimit(req, limiter, maxRequests);
  if (rateLimitResponse) {
    console.warn(`[${Date.now()}] Rate limit exceeded for ${getRateLimitKey(req)}`);
  }
  return rateLimitResponse;
}

/**
 * Standard error handler for API routes.
 * Logs full error details and returns sanitized response.
 *
 * @param error - The error that occurred
 * @param operation - Description of the operation that failed
 * @param customMessage - Optional custom error message
 * @returns NextResponse with error details
 */
export function handleApiError(
  error: unknown,
  operation: string,
  customMessage?: string
): NextResponse {
  console.error(`Error during ${operation}:`, error);
  const { publicMessage, logDetails } = sanitizeErrorMessage(error);

  if (logDetails) {
    console.error(`Error details:`, logDetails);
  }

  // Handle specific error types
  if (error instanceof Error) {
    if (error.message.includes("Connection") || error.message.includes("ECONNREFUSED")) {
      return NextResponse.json(
        {
          error: "Service temporarily unavailable",
          message: customMessage || "The AI service is currently unavailable. Please try again shortly.",
        },
        { status: 503 }
      );
    }
    if (error.message.includes("timeout")) {
      return NextResponse.json(
        {
          error: "Request timeout",
          message: "The request took too long to process. Please try again.",
        },
        { status: 504 }
      );
    }
  }

  return NextResponse.json(
    {
      error: `Failed to ${operation}`,
      message: publicMessage,
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}

/**
 * Creates an SSE-formatted response stream.
 *
 * @param generator - Async generator that yields data chunks
 * @returns Response with SSE headers
 */
export function createSSEResponse(
  generator: AsyncGenerator<string, void, unknown>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...CORS_HEADERS,
    },
  });
}

/**
 * CORS headers for API responses.
 * Re-exported from utils for backward compatibility.
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;
