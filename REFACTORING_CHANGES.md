# Codebase Refactoring Summary

This document summarizes the refactoring changes made to improve code reusability, reduce duplication, and enhance maintainability.

## Overview

The refactoring focused on identifying and eliminating code duplication across the codebase by:
- Extracting common functions into shared utility modules
- Parameterizing repetitive logic patterns
- Creating centralized configuration and helper functions

## Changes Made

### 1. New File: `src/lib/request-validation.ts`

**Purpose:** Centralized request validation utilities

**Functions Added:**
- `validateContentType(req, allowedTypes)` - Validates Content-Type header
- `validateCsrf(req, options)` - Validates CSRF tokens with optional warn-only mode
- `validateRequestBody(body)` - Validates that body is a JSON object

**Files Updated:**
- `src/app/api/courses/route.ts` - Now imports and uses `validateContentType` and `validateCsrf`
- `src/app/api/courses/[courseId]/route.ts` - Now imports and uses `validateCsrf`
- `src/app/api/graph/route.ts` - Now imports and uses `validateContentType` and `validateRequestBody`

**Benefits:**
- Eliminated duplicate `validateContentType` function (was in 2 files)
- Eliminated duplicate `validateRequestCsrf` function (was in 2 files)
- Single source of truth for request validation logic

---

### 2. New File: `src/lib/user-helpers.ts`

**Purpose:** Centralized user management utilities

**Functions Added:**
- `getOrCreateDemoUser()` - Gets first user or creates default demo user
- `getUserById(userId)` - Gets user by ID

**Files Updated:**
- `src/app/api/courses/route.ts` - Now uses `getOrCreateDemoUser()` instead of inline user creation
- `src/app/api/graph/route.ts` - Now uses `getOrCreateDemoUser()` instead of inline user creation

**Benefits:**
- Eliminated duplicate "get or create user" pattern (was in 2 files)
- Centralized demo user credentials configuration
- Easier to modify user creation logic in one place

---

### 3. Updated: `src/lib/utils.ts`

**Changes:**
- Removed `CORS_HEADERS` constant (moved to `api-helpers.ts`)
- Updated `jsonWithCors` to define CORS_HEADERS locally (to avoid circular dependency)

**Rationale:**
- `CORS_HEADERS` is now defined once in `api-helpers.ts`
- `utils.ts` keeps a local copy to avoid circular imports

---

### 4. Updated: `src/components/chat-panel.tsx`

**Changes:**
- Removed duplicate `validateUserInput` function
- Now imports and uses `validateInput` and `MAX_INPUT_LENGTHS` from `src/lib/security.ts`
- Changed `MAX_FEEDBACK_LENGTH` constant to use `MAX_INPUT_LENGTHS.userFeedback`

**Benefits:**
- Eliminated duplicate validation logic
- Consistent validation across frontend and backend
- Single source for maximum length configurations

---

### 5. Updated: `src/lib/workflow-config.ts`

**Changes:**
- Added `PhaseStatus` type: `"complete" | "active" | "pending"`
- Added `getPhaseStatus(phaseKey, currentPhase)` function

**Benefits:**
- Reusable phase status logic for any component
- Consistent phase status determination across the application
- Easier to test and modify phase status logic

---

### 6. Updated: `src/components/document-preview.tsx`

**Changes:**
- Removed local `getPhaseStatus` function
- Now imports and uses `getPhaseStatus` from `src/lib/workflow-config`

**Benefits:**
- Eliminated duplicate phase status logic
- Consistent phase status rendering across components

---

## Summary of Deduplication

| Pattern | Before | After | Files Affected |
|---------|--------|-------|----------------|
| Content-Type validation | 2 duplicate functions | 1 shared function | courses/route.ts, graph/route.ts |
| CSRF validation | 2 duplicate functions | 1 shared function | courses/route.ts, courses/[courseId]/route.ts |
| User creation pattern | 2 duplicate blocks | 1 shared function | courses/route.ts, graph/route.ts |
| Input validation (chat) | Local function | Uses security.ts | chat-panel.tsx |
| Phase status logic | Local function | Uses workflow-config.ts | document-preview.tsx |

## Files Modified

1. `src/lib/request-validation.ts` - **NEW**
2. `src/lib/user-helpers.ts` - **NEW**
3. `src/lib/utils.ts` - Modified
4. `src/lib/workflow-config.ts` - Modified
5. `src/app/api/courses/route.ts` - Modified
6. `src/app/api/courses/[courseId]/route.ts` - Modified
7. `src/app/api/graph/route.ts` - Modified
8. `src/components/chat-panel.tsx` - Modified
9. `src/components/document-preview.tsx` - Modified

## Potential Future Refactoring Opportunities

### 1. Generic LLM Response Parsers (`src/lib/langgraph/nodes.ts`)

The parsing functions (`parseCLOs`, `parseAssessments`, `parseModules`, `parseLessons`) follow similar patterns:
- Split text into lines
- Detect new items via regex patterns
- Accumulate content until next item
- Provide fallback defaults

**Suggestion:** Create a generic parser utility that can be configured with:
- Item detection regex
- Field extraction functions
- Default value factory

### 2. SSE Stream Creation (`src/app/api/graph/route.ts`)

The SSE stream creation in `graph/route.ts` is similar to `createSSEResponse` in `api-helpers.ts`.

**Suggestion:** Use the existing `createSSEResponse` function from `api-helpers.ts`.

### 3. Error Handling Pattern

Multiple API routes have similar error handling:
```typescript
catch (error) {
  if (error instanceof SyntaxError && error.message.includes("JSON")) {
    return errorResponse("Invalid JSON", "...", 400);
  }
  console.error("[API] Error");
  const { publicMessage } = sanitizeErrorMessage(error);
  return errorResponse("Failed to ...", publicMessage, 500);
}
```

**Suggestion:** Enhance `handleApiError` in `api-helpers.ts` to handle these common patterns.

---

## Testing Recommendations

1. **Unit Tests:** Add tests for new utility functions in `request-validation.ts` and `user-helpers.ts`
2. **Integration Tests:** Verify that API routes still work correctly with the refactored validation
3. **E2E Tests:** Test the complete course creation and workflow flow

## Migration Notes

- All changes are backward compatible
- No breaking changes to API endpoints
- No database schema changes required
