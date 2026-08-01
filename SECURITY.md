# Security Documentation

This document outlines the security measures implemented in the Agentic Course Design Workbench and provides guidance for maintaining security.

## Implemented Security Measures

### 1. Input Validation and Sanitization

All user inputs are validated and sanitized before processing:

- **String Validation**: Checks for empty strings, length limits, and invalid characters
- **XSS Prevention**: Strips script tags, iframes, event handlers, and dangerous protocols
- **Control Character Removal**: Removes null bytes and other control characters
- **LLM Sanitization**: Special sanitization for inputs that will be sent to LLMs

**Location**: `src/lib/security.ts`

### 2. Prompt Injection Protection

Multiple layers of protection against prompt injection attacks:

- **Pattern Detection**: Identifies and blocks common prompt injection patterns
- **Instruction Override Detection**: Blocks attempts to override system instructions
- **Delimiter Sanitization**: Removes or neutralizes delimiter-based attacks
- **Context Wrapping**: Wraps user input in explicit delimiters to prevent injection

**Implemented in**:
- `src/lib/security.ts` - `sanitizeForLLM()`
- `src/lib/langgraph/nodes.ts` - `sanitizeForPrompt()`

### 3. Rate Limiting

Rate limiting is implemented to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Course API | 100 requests | 1 minute |
| Graph/Workflow API | 20 requests | 1 minute |

**Note**: Current implementation uses in-memory storage. For production, use Redis or similar for distributed rate limiting.

### 4. Error Handling

- **Sanitized Error Messages**: Internal errors are never exposed to users
- **Structured Logging**: Errors are logged internally with sanitized details
- **Graceful Degradation**: Service returns appropriate HTTP status codes

### 5. CSRF Protection (Development)

Basic CSRF token validation is implemented:
- Tokens are validated when provided via `x-csrf-token` header
- In development mode, missing tokens are logged but not blocked
- **Production Requirement**: Enable strict CSRF validation

### 6. Content-Type Validation

API endpoints validate the `Content-Type` header:
- Only `application/json` is accepted for POST requests
- Returns 415 (Unsupported Media Type) for invalid content types

### 7. ID Validation

- UUID validation for thread IDs
- Alphanumeric validation for course IDs
- Prevents path traversal and injection attacks

## Security Recommendations for Production

### High Priority

1. **Implement Authentication**
   - Add proper user authentication (OAuth, JWT, or session-based)
   - Protect all API endpoints with authentication middleware
   - Implement role-based access control (RBAC)

2. **Enable Strict CSRF Protection**
   - Require CSRF tokens for all state-changing operations
   - Implement SameSite cookie attributes
   - Use double-submit cookie pattern

3. **Use Production-Grade Rate Limiting**
   - Migrate from in-memory to Redis-based rate limiting
   - Implement per-user rate limits
   - Add exponential backoff for repeated violations

4. **Secure Database Connections**
   - Use connection pooling with proper limits
   - Enable SSL/TLS for database connections
   - Implement database-level access controls

### Medium Priority

5. **Content Security Policy (CSP)**
   - Implement strict CSP headers
   - Restrict script sources to trusted origins
   - Block inline scripts and eval()

6. **HTTP Security Headers**
   - Add `X-Content-Type-Options: nosniff`
   - Add `X-Frame-Options: DENY`
   - Add `Strict-Transport-Security` for HTTPS

7. **API Key Management**
   - Never hardcode API keys or secrets
   - Use environment variables with proper validation
   - Implement key rotation

8. **Logging and Monitoring**
   - Implement structured logging
   - Set up alerting for security events
   - Log authentication failures and rate limit hits

### Low Priority

9. **Dependency Scanning**
   - Regularly scan dependencies for vulnerabilities
   - Keep all packages up to date
   - Use `npm audit` in CI pipeline

10. **Security Testing**
    - Add security-focused unit tests
    - Implement integration tests for security controls
    - Consider penetration testing before major releases

## Known Limitations

1. **No Authentication**: The current implementation uses a demo user for all operations. This is acceptable for development/demo purposes but must be replaced with proper authentication before production use.

2. **In-Memory Rate Limiting**: Rate limits are stored in memory, which means:
   - Limits reset on server restart
   - Limits are not shared across multiple server instances
   - Can be bypassed by targeting different instances

3. **Development-Mode CSRF**: CSRF validation is currently in "warning only" mode for development. This should be changed to "strict" mode for production.

4. **CORS Configuration**: CORS is set to allow all origins (`*`). This should be restricted to specific trusted domains in production.

## Security Headers Reference

Recommended headers for production:

```typescript
const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}
```

## Incident Response

If a security vulnerability is discovered:

1. **Assess Impact**: Determine what data/systems are affected
2. **Contain**: Implement temporary mitigations if possible
3. **Document**: Record the vulnerability and response actions
4. **Fix**: Implement proper fix and test thoroughly
5. **Review**: Conduct post-incident review to prevent recurrence

## Reporting Security Issues

If you discover a security vulnerability, please report it immediately. Do not disclose vulnerabilities publicly until they have been addressed.

---

*Last updated: 2026-07-26*
