/**
 * Graph Execution API
 * Handles starting, streaming, and resuming course design workflows
 */

import { NextRequest, NextResponse } from "next/server";
import { courseWorkflow, createWorkflowConfig } from "@/lib/langgraph/graph";
import { v4 as uuidv4 } from "uuid";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, courseTitle, gradeLevel, skills, userFeedback, isResume, threadId: existingThreadId } = body;

    // Generate or use existing thread ID
    const threadId = existingThreadId || uuidv4();
    const config = createWorkflowConfig(threadId);

    // Create course in database if starting new
    let courseId: string | undefined;
    let nodeId: string | undefined;

    if (action === "start" || !existingThreadId) {
      const user = await prisma.user.findFirst(); // Get first user for now
      const course = await prisma.course.create({
        data: {
          title: courseTitle || "New Course",
          userId: user?.id || "default-user",
          gradeLevel: gradeLevel || "",
          skills: skills || "",
        },
      });

      const node = await prisma.courseNode.create({
        data: {
          threadId,
          courseId: course.id,
          type: "COURSE",
          title: courseTitle || "New Course",
          content: {},
          status: "DRAFTING",
        },
      });

      courseId = course.id;
      nodeId = node.id;
    } else {
      const courseNode = await prisma.courseNode.findFirst({
        where: { threadId: existingThreadId },
      });
      if (courseNode) {
        courseId = courseNode.courseId;
        nodeId = courseNode.id;
      }
    }

    // Stream the workflow
    const stream = await courseWorkflow.stream(
      isResume
        ? {
            messages: [new HumanMessage(userFeedback || "Continue")],
          }
        : {
            courseTitle: courseTitle || "New Course",
            gradeLevel: gradeLevel,
            skills: skills,
            messages: [new HumanMessage("Start course design")],
            currentThreadId: threadId,
            activeNodeId: nodeId || threadId,
          },
      config
    );

    // Convert to SSE format
    const encoder = new TextEncoder();
    const streamStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(streamStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Graph execution error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    return NextResponse.json(
      { error: "Failed to execute workflow", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return NextResponse.json({ error: "threadId required" }, { status: 400 });
    }

    // Get current state from workflow
    const config = createWorkflowConfig(threadId);
    const state = await courseWorkflow.getState(config);

    return NextResponse.json({
      threadId,
      state: state.values,
      next: state.next,
    });
  } catch (error) {
    console.error("Get state error:", error);
    return NextResponse.json(
      { error: "Failed to get workflow state" },
      { status: 500 }
    );
  }
}
