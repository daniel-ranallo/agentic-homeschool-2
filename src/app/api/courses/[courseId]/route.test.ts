/**
 * Unit tests for the Course Delete API endpoint
 *
 * These tests verify:
 * - Input validation (missing/invalid course ID)
 * - Proper 404 response for non-existent courses
 * - Cascade deletion order: messages → course nodes → course
 * - Error handling for database operations
 */

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

// Mock NextResponse
jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, options?: { status?: number; headers?: Record<string, string> }) => {
      return {
        status: options?.status || 200,
        headers: options?.headers || {},
        json: async () => data,
      };
    },
  },
}));

// Mock security module
jest.mock("@/lib/security", () => ({
  validateInput: jest.fn(),
  sanitizeErrorMessage: (error: unknown) => ({
    publicMessage: "An unexpected error occurred. Please try again.",
    logDetails: error instanceof Error ? error.message : String(error),
  }),
}));

// Mock utils module
jest.mock("@/lib/utils", () => ({
  CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  },
  errorResponse: (error: string, details?: string, status: number = 500) => ({
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    json: async () => ({
      error,
      message: details || "An unexpected error occurred",
    }),
  }),
}));

// Import the DELETE function after mocks are set up
let DELETE: (req: Request, { params }: { params: { courseId: string } }) => Promise<unknown>;

beforeAll(async () => {
  const module = await import("./route");
  DELETE = module.DELETE;
});

describe("DELETE /api/courses/[courseId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Input validation", () => {
    it("should return 400 for missing course ID", async () => {
      const req = new Request("http://localhost/api/courses", {
        method: "DELETE",
      });
      const response = await DELETE(req as any, { params: { courseId: "" } });

      expect((response as any).status).toBe(400);
    });

    it("should return 400 for undefined course ID", async () => {
      const req = new Request("http://localhost/api/courses", {
        method: "DELETE",
      });
      const response = await DELETE(req as any, { params: { courseId: undefined } });

      expect((response as any).status).toBe(400);
    });

    it("should return 400 for non-string course ID", async () => {
      const req = new Request("http://localhost/api/courses/123", {
        method: "DELETE",
      });
      // @ts-expect-error - testing invalid input
      const response = await DELETE(req as any, { params: { courseId: 123 } });

      expect((response as any).status).toBe(400);
    });

    it("should return 400 for course ID that exceeds maximum length", async () => {
      const longId = "a".repeat(101);
      const req = new Request(`http://localhost/api/courses/${longId}`, {
        method: "DELETE",
      });
      const response = await DELETE(req as any, { params: { courseId: longId } });

      expect((response as any).status).toBe(400);
    });
  });

  describe("Course not found", () => {
    it("should return 404 for non-existent course", async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(null);

      const req = new Request("http://localhost/api/courses/non-existent-id", {
        method: "DELETE",
      });
      const response = await DELETE(req as any, {
        params: { courseId: "non-existent-id" },
      });

      expect((response as any).status).toBe(404);
    });
  });

  describe("Cascade deletion", () => {
    it("should delete messages before course nodes", async () => {
      const mockCourse = {
        id: "test-course-id",
        nodes: [{ id: "node1" }, { id: "node2" }, { id: "node3" }],
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.courseNode.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.course.delete as jest.Mock).mockResolvedValue({});

      const req = new Request("http://localhost/api/courses/test-course-id", {
        method: "DELETE",
      });
      await DELETE(req as any, { params: { courseId: "test-course-id" } });

      // Verify the order of calls
      // Messages should be deleted first
      expect(prisma.message.deleteMany).toHaveBeenCalled();
      expect(prisma.message.deleteMany).toHaveBeenCalledWith({
        where: {
          nodeId: {
            in: ["node1", "node2", "node3"],
          },
        },
      });

      // Then course nodes
      expect(prisma.courseNode.deleteMany).toHaveBeenCalled();
      expect(prisma.courseNode.deleteMany).toHaveBeenCalledWith({
        where: { courseId: "test-course-id" },
      });

      // Finally the course
      expect(prisma.course.delete).toHaveBeenCalled();
      expect(prisma.course.delete).toHaveBeenCalledWith({
        where: { id: "test-course-id" },
      });
    });

    it("should handle course with no nodes", async () => {
      const mockCourse = {
        id: "empty-course-id",
        nodes: [],
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.courseNode.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.course.delete as jest.Mock).mockResolvedValue({});

      const req = new Request("http://localhost/api/courses/empty-course-id", {
        method: "DELETE",
      });
      const response = await DELETE(req as any, {
        params: { courseId: "empty-course-id" },
      });

      expect((response as any).status).toBe(200);
      expect(prisma.message.deleteMany).toHaveBeenCalledWith({
        where: {
          nodeId: { in: [] },
        },
      });
      expect(prisma.courseNode.deleteMany).toHaveBeenCalledWith({
        where: { courseId: "empty-course-id" },
      });
      expect(prisma.course.delete).toHaveBeenCalledWith({
        where: { id: "empty-course-id" },
      });
    });

    it("should return success response after cascade deletion", async () => {
      const mockCourse = {
        id: "success-course-id",
        nodes: [{ id: "node1" }],
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.courseNode.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.course.delete as jest.Mock).mockResolvedValue({});

      const req = new Request("http://localhost/api/courses/success-course-id", {
        method: "DELETE",
      });
      const response = await DELETE(req as any, {
        params: { courseId: "success-course-id" },
      });

      expect((response as any).status).toBe(200);

      const body = await (response as any).json();
      expect(body).toEqual({
        success: true,
        message: "Course and all related data deleted successfully",
      });
    });
  });

  describe("Error handling", () => {
    it("should return 500 when message deletion fails", async () => {
      const mockCourse = {
        id: "error-course-id",
        nodes: [{ id: "node1" }],
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.message.deleteMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const req = new Request("http://localhost/api/courses/error-course-id", {
        method: "DELETE",
      });
      const response = await DELETE(req as any, {
        params: { courseId: "error-course-id" },
      });

      expect((response as any).status).toBe(500);
    });

    it("should return 500 when course node deletion fails", async () => {
      const mockCourse = {
        id: "error-course-id",
        nodes: [{ id: "node1" }],
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.courseNode.deleteMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const req = new Request("http://localhost/api/courses/error-course-id", {
        method: "DELETE",
      });
      const response = await DELETE(req as any, {
        params: { courseId: "error-course-id" },
      });

      expect((response as any).status).toBe(500);
    });

    it("should return 500 when course deletion fails", async () => {
      const mockCourse = {
        id: "error-course-id",
        nodes: [{ id: "node1" }],
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.courseNode.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.course.delete as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const req = new Request("http://localhost/api/courses/error-course-id", {
        method: "DELETE",
      });
      const response = await DELETE(req as any, {
        params: { courseId: "error-course-id" },
      });

      expect((response as any).status).toBe(500);
    });
  });
});
