/**
 * LangGraph Workflow Assembly
 *
 * Combines all nodes into a complete course design workflow using LangGraph's
 * state machine. The workflow implements Backward Design methodology with
 * human-in-the-loop approval at each stage.
 *
 * Workflow Flow:
 * 1. generateGoalsNode → 2. generateAssessmentsNode → 3. generateModulesNode (parallel)
 *    → 4. generateLessonsNode (parallel) → 5. synthesisNode → END
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
import { allParentsHaveApprovedChildren, createWorkflowConfig as createConfig } from "./workflow-helpers";

/**
 * Database connection pool for PostgresSaver checkpointing.
 * Reuses connections for efficiency.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * LangGraph checkpointer for persisting workflow state.
 * Enables workflow resumption after interruptions or failures.
 */
export const checkpointer = new PostgresSaver(pool);

/**
 * Determines the next workflow phase based on current state.
 * Used for conditional routing after goals generation.
 *
 * @param state - Current workflow state
 * @returns Next node name or END
 */
function determineNextPhase(state: CourseDesignState): string {
  switch (state.currentPhase) {
    case "goals":
      return "generateAssessmentsNode";
    case "assessments":
      return "fanoutModules";
    case "modules":
      return "fanoutLessons";
    case "lessons":
      return "synthesisNode";
    case "synthesis":
      return END;
    default:
      return "generateGoalsNode";
  }
}

// Re-exported from workflow-helpers for backward compatibility
const allAssessmentsHaveLockedModules = (state: CourseDesignState) =>
  allParentsHaveApprovedChildren(state, "assessmentId", state.modules);

const allModulesHaveLockedLessons = (state: CourseDesignState) =>
  allParentsHaveApprovedChildren(state, "moduleId", state.dailyLessons);

/**
 * Creates and configures the complete course design workflow.
 *
 * The workflow uses a state machine pattern with:
 * - Sequential phases for goals and assessments
 * - Parallel fan-out for modules (one per assessment)
 * - Parallel fan-out for lessons (one per module)
 * - Global synthesis at the end
 */
const workflow = new StateGraph(CourseDesignAnnotation)
  // Phase 1: Course Title & Goals
  .addNode("generateGoalsNode", generateGoalsNode)
  .addNode("generateAssessmentsNode", generateAssessmentsNode)

  // Phase 3: Modules (parallel per assessment)
  .addNode("generateModulesNode", async (state, config) =>
    generateModulesNode(state, config as { assessmentId: string })
  )

  // Phase 4: Lessons (parallel per module)
  .addNode("generateLessonsNode", async (state, config) =>
    generateLessonsNode(state, config as { moduleId: string })
  )

  // Phase 5: Global Synthesis
  .addNode("synthesisNode", synthesisNode)

  // Entry point: Start with goals generation
  .addEdge("__start__", "generateGoalsNode")

  // Conditional edge: Determine next phase after goals
  .addConditionalEdges("generateGoalsNode", determineNextPhase)

  // Fan-out: Create modules for each assessment (parallel)
  .addConditionalEdges("generateAssessmentsNode", (state) =>
    state.assessments.map(assessment =>
      new Send("generateModulesNode", {
        ...state,
        currentPhase: "modules" as const,
        assessmentId: assessment.id,
      })
    )
  )

  // After modules: Check if ready for lessons or stay in modules
  .addConditionalEdges("generateModulesNode", (state) => {
    if (allAssessmentsHaveLockedModules(state as CourseDesignState)) {
      return state.modules.map(module =>
        new Send("generateLessonsNode", {
          ...state,
          currentPhase: "lessons" as const,
          moduleId: module.id,
        })
      );
    }
    return "generateModulesNode"; // Wait for all modules to complete
  })

  // After lessons: Check if ready for synthesis or stay in lessons
  .addConditionalEdges("generateLessonsNode", (state) => {
    if (allModulesHaveLockedLessons(state as CourseDesignState)) {
      return "synthesisNode";
    }
    return "generateLessonsNode"; // Wait for all lessons to complete
  })

  // End after synthesis
  .addConditionalEdges("synthesisNode", () => END);

/**
 * Compiled workflow ready for execution.
 * Includes checkpointer for state persistence.
 */
export const courseWorkflow = workflow.compile({ checkpointer });

/**
 * Initializes the checkpointer database tables.
 * Call this once during application startup.
 *
 * @returns The configured checkpointer instance
 */
export async function setupCheckpointer(): Promise<PostgresSaver> {
  await checkpointer.setup();
  return checkpointer;
}

/**
 * Workflow configuration interface for LangGraph.
 * Contains the thread ID for checkpoint lookup.
 */
export interface WorkflowConfig {
  configurable: {
    /** Unique thread identifier for workflow state persistence */
    thread_id: string;
  };
}

// Re-exported from workflow-helpers for backward compatibility and centralized config creation
export { createWorkflowConfig } from "./workflow-helpers";
