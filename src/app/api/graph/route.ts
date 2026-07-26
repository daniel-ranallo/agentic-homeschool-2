/**
 * Graph Execution API
 * Handles starting, streaming, and resuming course design workflows
 */

import { NextRequest, NextResponse } from "next/server";
import { courseWorkflow, createWorkflowConfig } from "@/lib/langgraph/graph";
import { v4 as uuidv4 } from "uuid";
import { HumanMessage } from "@langchain/core/messages";
import { prisma } from "@/lib/db";
import { createChatModelConfigured } from "@/lib/llm-adapter";

// LLM endpoint configuration
const LLM_ENDPOINT = process.env.LLM_ENDPOINT || 'http://spark.ranallohome.com:8001';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log(`[${startTime}] Graph POST request received`);

  try {
    const body = await req.json();
    console.log(`[${Date.now()}] Request body parsed`);

    const { action, courseTitle, gradeLevel, skills, userFeedback, isResume, threadId: existingThreadId } = body;

    // Generate or use existing thread ID
    const threadId = existingThreadId || uuidv4();
    console.log(`[${Date.now()}] Using threadId: ${threadId}`);

    const config = createWorkflowConfig(threadId);

    // Create course in database if starting new
    let courseId: string | undefined;
    let nodeId: string | undefined;

    if (action === "start" || !existingThreadId) {
      console.log(`[${Date.now()}] Creating new course...`);
      const user = await prisma.user.findFirst();
      console.log(`[${Date.now()}] Found user: ${user?.id || 'none'}`);

      const course = await prisma.course.create({
        data: {
          title: courseTitle || "New Course",
          userId: user?.id || "default-user",
          gradeLevel: gradeLevel || "",
          skills: skills || "",
        },
      });
      console.log(`[${Date.now()}] Course created: ${course.id}`);

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
      console.log(`[${Date.now()}] Node created: ${node.id}`);

      courseId = course.id;
      nodeId = node.id;
    } else {
      console.log(`[${Date.now()}] Resuming existing course...`);
      const courseNode = await prisma.courseNode.findFirst({
        where: { threadId: existingThreadId },
      });
      if (courseNode) {
        courseId = courseNode.courseId;
        nodeId = courseNode.id;
        console.log(`[${Date.now()}] Found existing node: ${node.id}`);
      }
    }

    // Test LLM connectivity before starting the workflow
    console.log(`[${Date.now()}] Testing LLM endpoint connectivity...`);
    try {
      const testResponse = await fetch(`${LLM_ENDPOINT}/v1/models`, {
        method: 'GET',
        timeout: 5000,
      });
      if (!testResponse.ok) {
        console.warn(`[${Date.now()}] LLM endpoint returned non-OK status: ${testResponse.status}`);
      } else {
        console.log(`[${Date.now()}] LLM endpoint is reachable`);
      }
    } catch (connectError) {
      console.error(`[${Date.now()}] LLM endpoint connection failed:`, connectError);
      const connectErr = connectError as Error;
      return NextResponse.json(
        {
          error: "LLM endpoint not available",
          details: `Cannot connect to LLM endpoint at ${LLM_ENDPOINT}. Please ensure the DGX Spark server is running and accessible.`,
          endpoint: LLM_ENDPOINT,
          error: connectErr.message,
        },
        { status: 503 }
      );
    }

    // Stream the workflow
    console.log(`[${Date.now()}] Starting workflow stream...`);
    const streamStartTime = Date.now();

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
    console.log(`[${Date.now()}] Stream started successfully in ${Date.now() - streamStartTime}ms`);

    // Convert to SSE format
    const encoder = new TextEncoder();
    const streamStream = new ReadableStream({
      async start(controller) {
        console.log(`[${Date.now()}] SSE stream started`);
        let chunkCount = 0;
        try {
          for await (const chunk of stream) {
            chunkCount++;
            console.log(`[${Date.now()}] Received chunk ${chunkCount}`);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
          }
          console.log(`[${Date.now()}] Stream completed, total chunks: ${chunkCount}`);
        } catch (streamError) {
          console.error(`[${Date.now()}] Stream error:`, streamError);
          const streamErr = streamError as Error;
          if (streamErr.message.includes('ECONNREFUSED') || streamErr.message.includes('fetch failed')) {
            controller.error(new Error('LLM endpoint connection lost during processing'));
          } else {
            controller.error(streamError);
          }
          throw streamError;
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    console.log(`[${Date.now()}] Returning response`);
    return new Response(streamStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const errorTime = Date.now();
    console.error(`[${errorTime}] Graph execution error!`);
    console.error(`[${errorTime}] Error type:`, error?.constructor?.name);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[${errorTime}] Error message:`, errorMessage);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes("Connection") || error.message.includes("ECONNREFUSED")) {
        console.error(`[${errorTime}] CONNECTION ERROR - LLM endpoint is not accessible`);
        return NextResponse.json(
          {
            error: "LLM endpoint not available",
            details: `Cannot connect to the LLM service at ${LLM_ENDPOINT}. The DGX Spark server may not be running or is not accessible from this network.`,
            endpoint: LLM_ENDPOINT,
            suggestion: "Please ensure the DGX Spark is running and accessible on your network.",
          },
          { status: 503 }
        );
      }
      if (error.message.includes("timeout")) {
        console.error(`[${errorTime}] TIMEOUT ERROR`);
        return NextResponse.json(
          {
            error: "Request timeout",
            details: "The LLM request timed out. Please try again.",
          },
          { status: 504 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to execute workflow",
        details: errorMessage,
        errorType: error?.constructor?.name,
        timestamp: new Date().toISOString()
      },
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
