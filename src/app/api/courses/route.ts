/**
 * Courses API
 *
 * Provides endpoints for listing and creating courses.
 * Includes input validation, rate limiting, and CORS support.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import {
  validateInput,
  sanitizeForLLM,
  apiRateLimiter,
  sanitizeErrorMessage,
  MAX_INPUT_LENGTHS,
} from "@/lib/security";
import { CORS_HEADERS, errorResponse } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const courses = await prisma.course.findMany({
      include: {
        nodes: {
          select: {
            id: true,
            type: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(courses, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("Get courses error:", error);
    const { publicMessage } = sanitizeErrorMessage(error);
    return errorResponse("Failed to get courses", publicMessage, 500);
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting check
  const rateLimitResponse = checkRateLimit(req, apiRateLimiter, 100);
  if (rateLimitResponse) {
    console.warn(`[${Date.now()}] Rate limit exceeded for ${getRateLimitKey(req)}`);
    return rateLimitResponse;
  }

  try {
    const body = await req.json();
    const { title, gradeLevel, skills } = body;

    // Validate inputs
    const titleValidation = validateInput(title, "title", MAX_INPUT_LENGTHS.title);
    if (!titleValidation.valid) {
      return NextResponse.json(
        { error: "Invalid input", details: titleValidation.error },
        { status: 400 }
      );
    }

    const gradeValidation = validateInput(gradeLevel, "gradeLevel", MAX_INPUT_LENGTHS.gradeLevel);
    if (!gradeValidation.valid) {
      return NextResponse.json(
        { error: "Invalid input", details: gradeValidation.error },
        { status: 400 }
      );
    }

    const skillsValidation = validateInput(skills, "skills", MAX_INPUT_LENGTHS.skills);
    if (!skillsValidation.valid) {
      return NextResponse.json(
        { error: "Invalid input", details: skillsValidation.error },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeForLLM(titleValidation.sanitized!);
    const sanitizedGradeLevel = sanitizeForLLM(gradeValidation.sanitized || "");
    const sanitizedSkills = sanitizeForLLM(skillsValidation.sanitized || "");

    // Get first user for now (simple auth MVP)
    let user = await prisma.user.findFirst();

    // Create default user if none exists
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "demo@course.design",
          password: await import("bcryptjs").then(m => m.hash("demo", 10)),
          name: "Demo User",
        },
      });
    }

    const course = await prisma.course.create({
      data: {
        title: sanitizedTitle || "New Course",
        userId: user.id,
        gradeLevel: sanitizedGradeLevel || "",
        skills: sanitizedSkills || "",
      },
    });

    // Create root course node
    const threadId = uuidv4();
    await prisma.courseNode.create({
      data: {
        threadId,
        courseId: course.id,
        type: "COURSE",
        title: sanitizedTitle || "New Course",
        content: {},
        status: "DRAFTING",
      },
    });

    return NextResponse.json({ ...course, threadId }, { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    console.error("Create course error:", error);
    const { publicMessage } = sanitizeErrorMessage(error);
    return errorResponse("Failed to create course", publicMessage, 500);
  }
}

// Handle CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    headers: CORS_HEADERS,
  });
}
