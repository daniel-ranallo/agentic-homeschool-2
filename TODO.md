# TODO - Non-MVP Items

This document lists features and improvements that are out of scope for the initial MVP. Each item includes enough context for future implementation.

---

## 1. MinIO Integration for Document Exports

**Status:** Deferred  
**Priority:** Medium

### Description
Store exported course documents (JSON, Markdown bundles) in MinIO object storage instead of local file system.

### Implementation Notes
- Set up MinIO service in docker-compose
- Create MinIO client using AWS SDK v3
- Implement upload/download endpoints for course exports
- Generate signed URLs for secure access

### Files to Create/Modify
- `src/lib/minio.ts` - MinIO client configuration
- `src/app/api/export/[courseId]/route.ts` - Export endpoint with MinIO storage
- Update `docker-compose.yml` to include MinIO service

---

## 2. Dagger CI/CD Pipeline

**Status:** Deferred  
**Priority:** Low

### Description
Configure Dagger-based CI pipeline for automated testing, building, and deployment.

### Implementation Notes
- Create Dagger pipeline script for build automation
- Configure GitHub Actions or GitLab CI to run Dagger
- Include tests, linting, and Docker build in pipeline

### Files to Create
- `dagger.json` - Dagger pipeline configuration
- `dagger/pipeline.ts` - Custom pipeline logic

---

## 3. Advanced Authentication (OAuth Providers)

**Status:** Deferred  
**Priority:** Medium

### Description
Add OAuth support for Google, Microsoft, and other identity providers.

### Implementation Notes
- Configure NextAuth OAuth providers
- Add provider selection to login page
- Implement account linking for existing users

### Files to Modify
- `src/app/api/auth/[...nextauth]/route.ts` - Add OAuth providers
- `src/components/login-page.tsx` - OAuth button components

---

## 4. Multi-User Collaboration & Sharing

**Status:** Deferred  
**Priority:** High

### Description
Allow multiple users to collaborate on courses and share designs.

### Implementation Notes
- Add course sharing permissions (view/edit)
- Implement real-time collaboration using WebSockets or Yjs
- Add user mentions and comments on course elements

### Files to Create
- `src/lib/collaboration.ts` - WebSocket setup
- `src/app/api/courses/[courseId]/share/route.ts` - Sharing endpoints
- `src/components/collaboration-cursor.tsx` - Real-time cursor display

---

## 5. Full Export Functionality (PDF, Markdown Bundles)

**Status:** Deferred  
**Priority:** Medium

### Description
Generate professional PDF exports and complete Markdown bundles for courses.

### Implementation Notes
- Use puppeteer or playwright for PDF generation
- Create Markdown templates for course structure
- Support ZIP download of all course materials

### Files to Create
- `src/lib/export/pdf.ts` - PDF generation
- `src/lib/export/markdown.ts` - Markdown templates
- `src/app/api/export/pdf/[courseId]/route.ts` - PDF endpoint

---

## 6. Analytics Dashboard for Course Progress

**Status:** Deferred  
**Priority:** Low

### Description
Track and visualize course design progress, time spent, and iteration counts.

### Implementation Notes
- Add analytics tracking to workflow nodes
- Create dashboard with charts showing progress
- Track metrics: iterations per phase, time per phase, approval rates

### Files to Create
- `src/app/analytics/page.tsx` - Analytics dashboard
- `src/components/analytics/charts.tsx` - Chart components
- Database schema for analytics events

---

## 7. Template Library for Common Course Types

**Status:** Deferred  
**Priority:** Medium

### Description
Provide pre-built templates for common course types (STEM, Humanities, Arts, etc.)

### Implementation Notes
- Create template database with sample course structures
- Add template selection to new course flow
- Allow customization of templates before use

### Files to Create
- `prisma/migrations/add_templates.sql` - Template schema
- `src/lib/templates.ts` - Template management
- `src/components/template-selector.tsx` - UI component

---

## 8. Advanced LLM Prompt Optimization

**Status:** Deferred  
**Priority:** Medium

### Description
Implement prompt versioning, A/B testing, and optimization for better outputs.

### Implementation Notes
- Add prompt versioning to database
- Create A/B testing framework for prompts
- Track quality metrics for prompt evaluation

### Files to Create
- `src/lib/prompts/manager.ts` - Prompt versioning
- `src/lib/prompts/templates.ts` - Prompt templates
- `src/app/admin/prompts/page.tsx` - Prompt management UI

---

## 9. Real-Time Collaboration Features

**Status:** Deferred  
**Priority:** High

### Description
Enable multiple users to work on the same course simultaneously with conflict resolution.

### Implementation Notes
- Use Yjs for CRDT-based conflict resolution
- Implement presence indicators (who's viewing/editing)
- Add conflict resolution UI

### Files to Create
- `src/lib/yjs/setup.ts` - Yjs configuration
- `src/components/presence/indicator.tsx` - User presence
- WebSocket server for real-time sync

---

## 10. Mobile-Responsive Improvements

**Status:** Deferred  
**Priority:** Low

### Description
Optimize the UI for tablet and mobile devices.

### Implementation Notes
- Review all components for mobile compatibility
- Add touch-friendly interactions
- Implement responsive navigation

### Files to Modify
- All component files - add mobile breakpoints
- `src/app/globals.css` - Mobile-specific styles

---

## 11. Unit & Integration Tests

**Status:** Deferred  
**Priority:** High

### Description
Add comprehensive test coverage for backend and frontend.

### Implementation Notes
- Set up Jest for unit tests
- Set up Playwright for E2E tests
- Test all API endpoints and critical user flows

### Files to Create
- `tests/unit/` - Unit test files
- `tests/e2e/` - E2E test files
- `jest.config.js` - Jest configuration

---

## 12. Error Handling & Monitoring

**Status:** Deferred  
**Priority:** Medium

### Description
Implement comprehensive error tracking and monitoring.

### Implementation Notes
- Integrate Sentry or similar error tracking
- Add structured logging
- Create error dashboard

### Files to Create
- `src/lib/error-handler.ts` - Centralized error handling
- `src/lib/logging.ts` - Structured logging

---

## 13. Accessibility Improvements

**Status:** Deferred  
**Priority:** Medium

### Description
Ensure the application is accessible to users with disabilities.

### Implementation Notes
- Add ARIA labels to all interactive elements
- Ensure keyboard navigation works throughout
- Add screen reader support

### Files to Modify
- All component files - add accessibility attributes

---

## 14. Internationalization (i18n)

**Status:** Deferred  
**Priority:** Low

### Description
Support multiple languages in the application.

### Implementation Notes
- Use next-i18next for i18n support
- Create translation files
- Add language selector

### Files to Create
- `locales/en.json` - English translations
- `locales/es.json` - Spanish translations
- `src/lib/i18n.ts` - i18n configuration

---

## Notes

- MVP focuses on core backward design workflow with HITL
- Non-MVP items can be prioritized based on user feedback
- Some items may become MVP requirements for future versions
