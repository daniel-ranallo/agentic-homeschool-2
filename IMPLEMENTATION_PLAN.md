# Implementation Plan: Course Delete Feature

## 1. Summary

Add a delete button to the course interface with a gear icon menu and multi-step confirmation to prevent accidental deletions. This feature will cascade deletion through all related tables (messages → course nodes → course).

## 2. Architect Review Resolution

**Clarification:** The original implementation plan DOES align with the current codebase. The project is a Next.js application with:
- React components (`src/app/page.tsx`, `src/components/`)
- Next.js API routes (`src/app/api/`)
- PostgreSQL database with Prisma (User, Course, CourseNode, Message tables)
- The existing `/api/courses` endpoint already supports GET and POST operations

The architect review appears to have been based on outdated or incorrect information about the project structure.

## 3. Approach

### 3.1 API Layer
Create a DELETE endpoint at `/api/courses/[courseId]` that:
- Validates the courseId exists
- Deletes in correct cascade order (messages → course nodes → course) to avoid foreign key constraint errors
- Returns appropriate status codes and error messages

### 3.2 UI Layer
Add a settings dropdown with gear icon on each course card that requires:
1. Click gear icon to open menu
2. Click "Delete" option
3. Confirm deletion in a modal dialog with clear warning text

## 4. Files to Create/Modify

### New Files:
- `src/app/api/courses/[courseId]/route.ts` - DELETE endpoint handler
- `src/components/course-settings-dropdown.tsx` - Settings menu component
- `src/components/confirm-dialog.tsx` - Confirmation modal component

### Modified Files:
- `src/app/page.tsx` - Add settings gear icon and delete confirmation UI to course cards
- `src/lib/security.ts` - Add input sanitization for deletion endpoint (if not already present)

## 5. Implementation Steps

### Step 1: Create DELETE Route Handler
**File:** `src/app/api/courses/[courseId]/route.ts`

```typescript
/**
 * Course Delete API
 *
 * DELETE /api/courses/[courseId]
 *
 * Cascades deletion through related tables:
 * 1. Messages (belong to course nodes)
 * 2. Course nodes (belong to course)
 * 3. Course
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateInput, sanitizeErrorMessage } from "@/lib/security";
import { CORS_HEADERS, errorResponse } from "@/lib/utils";

// Maximum course ID length to prevent abuse
const MAX_COURSE_ID_LENGTH = 100;

export async function DELETE(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = params.courseId;

    // Validate course ID
    if (!courseId || typeof courseId !== "string") {
      return errorResponse(
        "Invalid course ID",
        "Course ID is required and must be a valid string",
        400
      );
    }

    // Sanitize and validate input length
    if (courseId.length > MAX_COURSE_ID_LENGTH) {
      return errorResponse(
        "Course ID too long",
        "Invalid course ID format",
        400
      );
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        nodes: {
          select: { id: true },
        },
      },
    });

    if (!course) {
      return errorResponse(
        "Course not found",
        "The specified course does not exist",
        404
      );
    }

    // Cascade delete in correct order to avoid foreign key constraints
    // 1. Delete messages (FK: nodeId → CourseNode)
    await prisma.message.deleteMany({
      where: {
        nodeId: {
          in: course.nodes.map((node) => node.id),
        },
      },
    });

    // 2. Delete course nodes (FK: courseId → Course)
    await prisma.courseNode.deleteMany({
      where: { courseId: courseId },
    });

    // 3. Delete the course
    await prisma.course.delete({
      where: { id: courseId },
    });

    return NextResponse.json(
      { success: true, message: "Course and all related data deleted successfully" },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Delete course error:", error);
    const { publicMessage } = sanitizeErrorMessage(error);
    return errorResponse("Failed to delete course", publicMessage, 500);
  }
}
```

### Step 2: Create ConfirmDialog Component
**File:** `src/components/confirm-dialog.tsx`

```typescript
"use client";

import React from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog component for destructive actions.
 * Requires explicit user confirmation before proceeding.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "destructive",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors ${
              confirmVariant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Create CourseSettingsDropdown Component
**File:** `src/components/course-settings-dropdown.tsx`

```typescript
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Settings, Trash2 } from "lucide-react";

interface CourseSettingsDropdownProps {
  courseId: string;
  onDelete: (courseId: string) => void;
}

/**
 * Settings dropdown for course actions.
 * Currently supports delete action with confirmation.
 */
export function CourseSettingsDropdown({
  courseId,
  onDelete,
}: CourseSettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = () => {
    setIsOpen(false);
    onDelete(courseId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-muted rounded-lg transition-colors"
        aria-label="Course settings"
      >
        <Settings className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border rounded-lg shadow-lg z-10">
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left hover:bg-destructive/10 flex items-center gap-2 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete Course
          </button>
        </div>
      )}
    </div>
  );
}
```

### Step 4: Update Main Page
**File:** `src/app/page.tsx`

Add the following:

1. Import the new components:
```typescript
import { CourseSettingsDropdown } from "@/components/course-settings-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
```

2. Add state for deletion:
```typescript
const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
const [isDeleting, setIsDeleting] = useState(false);
```

3. Add delete handler function:
```typescript
async function deleteCourse(courseId: string) {
  try {
    setIsDeleting(true);
    const res = await fetch(`/api/courses/${courseId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to delete course");
    }

    // Remove deleted course from list
    setCourses(courses.filter((c) => c.id !== courseId));

    // Deselect if currently selected
    if (selectedCourse?.id === courseId) {
      setSelectedCourse(null);
    }
  } catch (error) {
    console.error("Failed to delete course:", error);
    alert(error instanceof Error ? error.message : "Failed to delete course");
  } finally {
    setIsDeleting(false);
    setCourseToDelete(null);
  }
}
```

4. Update course card rendering:
```typescript
{courses.map((course) => (
  <div
    key={course.id}
    onClick={() => setSelectedCourse(course)}
    className="p-4 border rounded-lg cursor-pointer hover:bg-card/50 transition-colors relative"
  >
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-semibold mb-1">{course.title}</h3>
        <p className="text-sm text-muted-foreground">{course.gradeLevel}</p>
      </div>
      <CourseSettingsDropdown
        courseId={course.id}
        onDelete={setCourseToDelete}
      />
    </div>
  </div>
))}
```

5. Add confirm dialog at the end of the component:
```typescript
<ConfirmDialog
  isOpen={!!courseToDelete}
  title="Delete Course"
  message={`Are you sure you want to delete "${
    courses.find((c) => c.id === courseToDelete)?.title
  }"? This action cannot be undone and will delete all associated content.`}
  confirmText="Delete"
  confirmVariant="destructive"
  onConfirm={() => deleteCourse(courseToDelete!)}
  onCancel={() => setCourseToDelete(null)}
/>
```

## 6. Tests

### 6.1 API Tests
**File:** `src/app/api/courses/[courseId]/route.test.ts`

```typescript
import { DELETE } from "./route";
import { prisma } from "@/lib/db";

// Mock prisma
jest.mock("@/lib/db", () => ({
  prisma: {
    course: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    courseNode: {
      deleteMany: jest.fn(),
    },
    message: {
      deleteMany: jest.fn(),
    },
  },
}));

describe("DELETE /api/courses/[courseId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 for missing course ID", async () => {
    const req = new Request("http://localhost/api/courses");
    const response = await DELETE(req as any, { params: { courseId: "" } });
    expect(response.status).toBe(400);
  });

  it("should return 404 for non-existent course", async () => {
    (prisma.course.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost/api/courses/123", {
      method: "DELETE",
    });
    const response = await DELETE(req as any, { params: { courseId: "123" } });
    expect(response.status).toBe(404);
  });

  it("should cascade delete course, nodes, and messages", async () => {
    const mockCourse = {
      id: "test-id",
      nodes: [{ id: "node1" }, { id: "node2" }],
    };

    (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
    (prisma.message.deleteMany as jest.Mock).mockResolvedValue({});
    (prisma.courseNode.deleteMany as jest.Mock).mockResolvedValue({});
    (prisma.course.delete as jest.Mock).mockResolvedValue({});

    const req = new Request("http://localhost/api/courses/test-id", {
      method: "DELETE",
    });
    const response = await DELETE(req as any, { params: { courseId: "test-id" } });

    expect(response.status).toBe(200);
    expect(prisma.message.deleteMany).toHaveBeenCalled();
    expect(prisma.courseNode.deleteMany).toHaveBeenCalled();
    expect(prisma.course.delete).toHaveBeenCalled();
  });
});
```

### 6.2 UI Tests
**File:** `src/components/__tests__/course-settings-dropdown.test.tsx`

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { CourseSettingsDropdown } from "../course-settings-dropdown";

describe("CourseSettingsDropdown", () => {
  it("should open dropdown when gear icon is clicked", () => {
    render(
      <CourseSettingsDropdown courseId="test-id" onDelete={jest.fn()} />
    );

    const gearButton = screen.getByLabelText("Course settings");
    fireEvent.click(gearButton);

    expect(screen.getByText("Delete Course")).toBeInTheDocument();
  });

  it("should call onDelete when delete option is clicked", () => {
    const onDelete = jest.fn();
    render(
      <CourseSettingsDropdown courseId="test-id" onDelete={onDelete} />
    );

    const gearButton = screen.getByLabelText("Course settings");
    fireEvent.click(gearButton);
    fireEvent.click(screen.getByText("Delete Course"));

    expect(onDelete).toHaveBeenCalledWith("test-id");
  });
});
```

**File:** `src/components/__tests__/confirm-dialog.test.tsx`

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "../confirm-dialog";

describe("ConfirmDialog", () => {
  it("should not render when isOpen is false", () => {
    render(
      <ConfirmDialog
        isOpen={false}
        title="Test"
        message="Test message"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.queryByText("Test")).not.toBeInTheDocument();
  });

  it("should call onConfirm when confirm button is clicked", () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Course"
        message="Are you sure?"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText("Delete"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("should call onCancel when cancel button is clicked", () => {
    const onCancel = jest.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        message="Test message"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

## 7. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Foreign key constraint errors | High | Delete in correct order: messages → nodes → course |
| Accidental deletion | High | Multi-step confirmation (gear → delete → confirm dialog) |
| Race condition while viewing course | Medium | Deselect course after deletion; handle 404 gracefully |
| No undo option | Medium | Clear warning message; consider adding soft delete in future |
| Security: IDOR vulnerability | High | Validate course exists before deletion; consider adding user authentication |

## 8. Future Enhancements

1. **Soft Delete**: Add a `deletedAt` field to Course for recoverable deletions
2. **Undo Period**: Allow undo within 24 hours of deletion
3. **Authentication**: Add proper user authentication to prevent unauthorized deletions
4. **Bulk Delete**: Support deleting multiple courses at once
5. **Delete Audit Log**: Track who deleted what and when
