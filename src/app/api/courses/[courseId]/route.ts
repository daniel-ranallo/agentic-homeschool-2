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
