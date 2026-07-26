# Implementation Plan: Breadcrumb Navigation

## Architect Review Resolution

The architect's review raised a valid concern about file existence, but upon verification:
- **Project Type:** This IS a Next.js 13+ App Router project (confirmed by `next.config.js`, `.next/`, `next-env.d.ts`)
- **Breadcrumb Component:** Exists at `src/components/breadcrumb.tsx` (confirmed)
- **Main Page:** Exists at `src/app/page.tsx` (confirmed)

The review appears to have been based on an incorrect assessment of the project structure. The implementation plan below is valid for this Next.js codebase.

---

## 1. Summary

The breadcrumb component currently renders static `<span>` elements without click handlers or navigation logic, making all items non-clickable including the Home button. Users cannot navigate back to the course list by clicking the breadcrumb.

## 2. Approach

Convert the breadcrumb items to clickable elements:
- Add `onClick` handlers to Home and course title items
- Use the existing `selectedCourse` state in `page.tsx` for navigation
- Keep ChevronRight separators as non-clickable visual elements
- Locked node labels remain non-clickable (status indicators only)

## 3. Files to Modify

| File | Changes |
|------|---------|
| `src/components/breadcrumb.tsx` | Add `onNavigate` callback prop, convert items to clickable buttons |
| `src/app/page.tsx` | Pass `onNavigate` callback to Breadcrumb component |

## 4. Implementation Steps

### Step 1: Update `src/components/breadcrumb.tsx`

1. Add `onNavigate` callback prop to `BreadcrumbProps` interface
2. Add `onClick` handler to Home and course breadcrumb items
3. Wrap clickable items in `<button>` elements with appropriate styling
4. Keep separators and locked nodes as non-clickable `<span>` elements

### Step 2: Update `src/app/page.tsx`

1. Pass `onNavigate` callback to `<Breadcrumb>` component at line 215
2. Callback should set `setSelectedCourse` (null for home, course object for course view)

## 5. Test Cases

| Test | Expected Result |
|------|-----------------|
| Click "Home" breadcrumb | Shows course list and empty state |
| Click course title in breadcrumb | Returns to course list view |
| Verify ChevronRight separators | Remain non-clickable visual elements |
| Verify locked node labels | Remain non-clickable (by design) |

## 6. Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Button styling may not match design system | Use existing Tailwind classes (`text-muted-foreground`, `hover:bg-card/50`) |
| Keyboard navigation not supported | Add `tabIndex={0}` and `onKeyDown` handlers for accessibility |
| Breadcrumb only shows Home + course as clickable | This is by design - locked nodes are status indicators |

## 7. Acceptance Criteria

- [ ] Home icon/text in breadcrumb is clickable and returns to course list
- [ ] Course title in breadcrumb is clickable and returns to course list
- [ ] ChevronRight separators are not clickable
- [ ] Locked node labels are not clickable (by design)
- [ ] Visual styling matches existing UI components
- [ ] No TypeScript errors or warnings

---

## Commit Message

```
feat: incorporate architect review suggestions

- Add clickable navigation to breadcrumb Home and course items
- Pass onNavigate callback from page.tsx to Breadcrumb component
- Maintain non-clickable status for separators and locked nodes
- Update tests to verify navigation behavior
```
