/**
 * LangGraph Workflow Assembly
 * Combines all nodes into a complete course design workflow
 */

import { StateGraph, END, Send } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Pool } from "pg";
import { CourseDesignAnnotation, CourseDesignState } from "./state";
import {
  generateGoalsNode,
  generateAssessmentsNode,
  generateModulesNode,
  generateLessonsNode,
  synthesisNode,
} from "./nodes";

// Database pool for PostgresSaver
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const checkpointer = new PostgresSaver(pool);

/**
 * Conditional edge to determine next phase
 */
function determineNextPhase(state: CourseDesignState): string {
  switch (state.currentPhase) {
    case "goals":
      return "generateAssessmentsNode";
    case "assessments":
      // Fan-out to modules for each assessment
      return "fanoutModules";
    case "modules":
      // Fan-out to lessons for each module
      return "fanoutLessons";
    case "lessons":
      return "synthesisNode";
    case "synthesis":
      return END;
    default:
      return "generateGoalsNode";
  }
}

/**
 * Check if all assessments have locked modules
 */
function allAssessmentsHaveLockedModules(state: CourseDesignState): boolean {
  return state.assessments.every(assessment =>
    state.modules.some(m => m.assessmentId === assessment.id && m.approved)
  );
}

/**
 * Check if all modules have locked lessons
 */
function allModulesHaveLockedLessons(state: CourseDesignState): boolean {
  return state.modules.every(module =>
    state.dailyLessons.some(l => l.moduleId === module.id && l.approved)
  );
}

// Build the workflow
const workflow = new StateGraph(CourseDesignAnnotation)
  // Phase 1: Course Title & Goals
  .addNode("generateGoalsNode", generateGoalsNode)
  .addNode("generateAssessmentsNode", generateAssessmentsNode)

  // Phase 3: Modules (parallel per assessment)
  .addNode("generateModulesNode", async (state, config) => {
    // config contains assessmentId
    return generateModulesNode(state, config as { assessmentId: string });
  })

  // Phase 4: Lessons (parallel per module)
  .addNode("generateLessonsNode", async (state, config) => {
    // config contains moduleId
    return generateLessonsNode(state, config as { moduleId: string });
  })

  // Phase 5: Synthesis
  .addNode("synthesisNode", synthesisNode)

  // Entry point
  .addEdge("__start__", "generateGoalsNode")

  // Conditional edges based on phase
  .addConditionalEdges("generateGoalsNode", determineNextPhase)
  .addConditionalEdges("generateAssessmentsNode", (state) => {
    // Fan-out to modules for each assessment using Send
    const sends = state.assessments.map(assessment =>
      new Send("generateModulesNode", { ...state, currentPhase: "modules" as const, assessmentId: assessment.id })
    );
    return sends;
  })
  .addConditionalEdges("generateModulesNode", (state) => {
    // After modules, check if we should fan out to lessons or wait for all modules
    if (allAssessmentsHaveLockedModules(state as CourseDesignState)) {
      const sends = state.modules.map(module =>
        new Send("generateLessonsNode", { ...state, currentPhase: "lessons" as const, moduleId: module.id })
      );
      return sends;
    }
    return "generateModulesNode"; // Stay in modules until all are done
  })
  .addConditionalEdges("generateLessonsNode", (state) => {
    // After lessons, check if we should do synthesis
    if (allModulesHaveLockedLessons(state as CourseDesignState)) {
      return "synthesisNode";
    }
    return "generateLessonsNode"; // Stay in lessons until all are done
  })
  .addConditionalEdges("synthesisNode", () => END);

// Compile with checkpointer
export const courseWorkflow = workflow.compile({ checkpointer });

// Export checkpointer for setup
export async function setupCheckpointer() {
  await checkpointer.setup();
  return checkpointer;
}

// Export workflow configuration for API routes
export interface WorkflowConfig {
  configurable: {
    thread_id: string;
  };
}

export function createWorkflowConfig(threadId: string): WorkflowConfig {
  return {
    configurable: {
      thread_id: threadId,
    },
  };
}
