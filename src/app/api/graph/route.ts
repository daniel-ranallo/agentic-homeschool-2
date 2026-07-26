/**
 * Graph Execution API
 *
 * Handles starting, streaming, and resuming course design workflows.
 * This endpoint manages the full lifecycle of LangGraph workflow execution,
 * including input validation, LLM connectivity checks, and SSE streaming.
 *
 * Endpoints:
 * - POST: Start or resume a workflow with user feedback
 * - GET: Retrieve current workflow state
 * - OPTIONS: CORS preflight handling
 */

import { NextRequest, NextResponse } from "next/server";
import { courseWorkflow, createWorkflowConfig } from "@/lib/langgraph/graph";
import { v4 as uuidv4 } from "uuid";
import { HumanMessage } from "@langchain/core/messages";
import { prisma } from "@/lib/db";
import { createChatModelConfigured } from "@/lib/llm-adapter";
import {
  validateInput,
  sanitizeForLLM,
  workflowRateLimiter,
  sanitizeErrorMessage,
  MAX_INPUT_LENGTHS,
  isValidThreadId,
} from "@/lib/security";
import { errorResponse, LLM_ENDPOINT } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log(`[${startTime}] Graph POST request received`);

  // Rate limiting check
  const rateLimitResponse = checkRateLimit(req, workflowRateLimiter, 20);
  if (rateLimitResponse) {
    console.warn(`[${Date.now()}] Rate limit exceeded for ${getRateLimitKey(req)}`);
    return rateLimitResponse;
  }

  try {
    const body = await req.json();
    console.log(`[${Date.now()}] Request body parsed`);

    const { action, courseTitle, gradeLevel, skills, userFeedback, isResume, threadId: existingThreadId } = body;

    // Validate inputs
    const titleValidation = validateInput(courseTitle, "courseTitle", MAX_INPUT_LENGTHS.title);
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

    if (userFeedback) {
      const feedbackValidation = validateInput(userFeedback, "userFeedback", MAX_INPUT_LENGTHS.userFeedback);
      if (!feedbackValidation.valid) {
        return NextResponse.json(
          { error: "Invalid input", details: feedbackValidation.error },
          { status: 400 }
        );
      }
    }

    // Sanitize inputs to prevent prompt injection
    const sanitizedCourseTitle = sanitizeForLLM(titleValidation.sanitized!);
    const sanitizedGradeLevel = sanitizeForLLM(gradeValidation.sanitized || gradeLevel || "");
    const sanitizedSkills = sanitizeForLLM(skillsValidation.sanitized || skills || "");
    const sanitizedUserFeedback = userFeedback ? sanitizeForLLM(validateInput(userFeedback, "userFeedback", MAX_INPUT_LENGTHS.userFeedback).sanitized || userFeedback) : undefined;

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
          title: sanitizedCourseTitle || "New Course",
          userId: user?.id || "default-user",
          gradeLevel: sanitizedGradeLevel || "",
          skills: sanitizedSkills || "",
        },
      });
      console.log(`[${Date.now()}] Course created: ${course.id}`);

      const node = await prisma.courseNode.create({
        data: {
          threadId,
          courseId: course.id,
          type: "COURSE",
          title: sanitizedCourseTitle || "New Course",
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
        console.log(`[${Date.now()}] Found existing node: ${courseNode.id}`);
      }
    }

    // Test LLM connectivity before starting the workflow
    console.log(`[${Date.now()}] Testing LLM endpoint connectivity...`);
    try {
      const testResponse = await fetch(`${LLM_ENDPOINT}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (!testResponse.ok) {
        console.warn(`[${Date.now()}] LLM endpoint returned non-OK status: ${testResponse.status}`);
      } else {
        console.log(`[${Date.now()}] LLM endpoint is reachable`);
      }
    } catch (connectError) {
      console.error(`[${Date.now()}] LLM endpoint connection failed:`, connectError);
      return NextResponse.json(
        {
          error: "Service temporarily unavailable",
          message: "The AI service is currently unavailable. Please ensure the DGX Spark server is running.",
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
            messages: [new HumanMessage(sanitizedUserFeedback || "Continue")],
          }
        : {
            courseTitle: sanitizedCourseTitle || "New Course",
            gradeLevel: sanitizedGradeLevel,
            skills: sanitizedSkills,
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
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    const errorTime = Date.now();
    console.error(`[${errorTime}] Graph execution error!`);

    const { publicMessage, logDetails } = sanitizeErrorMessage(error);
    console.error(`[${errorTime}] Error details:`, logDetails);

    // Check for specific error types and provide appropriate responses
    if (error instanceof Error) {
      if (error.message.includes("Connection") || error.message.includes("ECONNREFUSED")) {
        console.error(`[${errorTime}] CONNECTION ERROR - LLM endpoint is not accessible`);
        return errorResponse("Service temporarily unavailable", "The AI service is currently unavailable.", 503);
      }
      if (error.message.includes("timeout")) {
        console.error(`[${errorTime}] TIMEOUT ERROR`);
        return errorResponse("Request timeout", "The request took too long to process.", 504);
      }
    }

    return errorResponse("Failed to execute workflow", publicMessage, 500);
  }
}

import { CORS_HEADERS } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return NextResponse.json({ error: "threadId required" }, { status: 400, headers: CORS_HEADERS });
    }

    // Validate thread ID format
    if (!isValidThreadId(threadId)) {
      return NextResponse.json(
        { error: "Invalid thread ID format" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const config = createWorkflowConfig(threadId);
    const state = await courseWorkflow.getState(config);

    return NextResponse.json({
      threadId,
      state: state.values,
      next: state.next,
    }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("Get state error:", error);
    const { publicMessage } = sanitizeErrorMessage(error);
    return NextResponse.json(
      { error: "Failed to get workflow state", message: publicMessage },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    headers: CORS_HEADERS,
  });
}
