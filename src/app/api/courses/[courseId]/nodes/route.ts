/**
 * Course Nodes API
 * Get all nodes for a course
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const nodes = await prisma.courseNode.findMany({
      where: { courseId: params.courseId },
      include: {
        conversations: {
          orderBy: { createdAt: "asc" },
        },
        children: {
          select: {
            id: true,
            type: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(nodes);
  } catch (error) {
    console.error("Get course nodes error:", error);
    return NextResponse.json(
      { error: "Failed to get course nodes" },
      { status: 500 }
    );
  }
}
