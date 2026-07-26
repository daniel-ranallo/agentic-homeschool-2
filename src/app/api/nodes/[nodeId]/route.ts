/**
 * Node Management API
 * Get, update, and lock individual nodes
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface NodeFeedback {
  approved: boolean;
  feedback?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const node = await prisma.courseNode.findUnique({
      where: { id: params.nodeId },
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
    });

    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    return NextResponse.json(node);
  } catch (error) {
    console.error("Get node error:", error);
    return NextResponse.json(
      { error: "Failed to get node" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const body: NodeFeedback = await req.json();
    const { approved, feedback } = body;

    const node = await prisma.courseNode.findUnique({
      where: { id: params.nodeId },
      include: { course: true },
    });

    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    // Save feedback message
    if (feedback) {
      await prisma.message.create({
        data: {
          nodeId: params.nodeId,
          role: "user",
          content: feedback,
        },
      });
    }

    // Update node status
    const updatedNode = await prisma.courseNode.update({
      where: { id: params.nodeId },
      data: {
        status: approved ? "LOCKED" : "DRAFTING",
        content: node.content as any,
      },
    });

    return NextResponse.json(updatedNode);
  } catch (error) {
    console.error("Update node error:", error);
    return NextResponse.json(
      { error: "Failed to update node" },
      { status: 500 }
    );
  }
}
