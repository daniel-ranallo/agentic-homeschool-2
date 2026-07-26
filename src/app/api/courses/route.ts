/**
 * Courses API
 * List and create courses
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

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

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Get courses error:", error);
    return NextResponse.json(
      { error: "Failed to get courses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, gradeLevel, skills } = body;

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
        title: title || "New Course",
        userId: user.id,
        gradeLevel: gradeLevel || "",
        skills: skills || "",
      },
    });

    // Create root course node
    const threadId = uuidv4();
    await prisma.courseNode.create({
      data: {
        threadId,
        courseId: course.id,
        type: "COURSE",
        title: title || "New Course",
        content: {},
        status: "DRAFTING",
      },
    });

    return NextResponse.json({ ...course, threadId }, { status: 201 });
  } catch (error) {
    console.error("Create course error:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
