/**
 * Workflow Helper Utilities
 *
 * Reusable helpers for LangGraph workflow operations.
 * Reduces duplication in graph.ts and nodes.ts.
 */

import type { CourseDesignState } from "./state";

/**
 * Configuration for checking completion of parallel branches.
 */
export interface BranchCompletionConfig {
  items: Array<{ id: string }>;
  relatedItems: Array<{ id: string; approved: boolean }>;
  getId: (item: unknown) => string;
  getRelatedId: (item: unknown) => string;
}

/**
 * Generic function to check if all parent items have at least one approved child.
 * Used for checking completion of modules/lessons in parallel branches.
 *
 * @param state - Current workflow state
 * @param parentIdField - Field name for parent ID (e.g., "assessmentId", "moduleId")
 * @param itemsArray - Array of child items to check
 * @returns True if all parents have at least one approved child
 */
export function allParentsHaveApprovedChildren<T extends { id: string }>(
  state: CourseDesignState,
  parentIdField: keyof T,
  itemsArray: T[]
): boolean {
  const parentItems = getParentCollection(state, parentIdField);

  return parentItems.every((parent) =>
    itemsArray.some(
      (child) =>
        child[parentIdField] === parent.id && child.approved === true
    )
  );
}

/**
 * Gets the appropriate parent collection based on the parent ID field.
 *
 * @param state - Current workflow state
 * @param parentIdField - Field name for parent ID
 * @returns Array of parent items
 */
function getParentCollection(
  state: CourseDesignState,
  parentIdField: string
): Array<{ id: string }> {
  if (parentIdField === "assessmentId") {
    return state.assessments;
  }
  if (parentIdField === "moduleId") {
    return state.modules;
  }
  return [];
}

/**
 * Creates a workflow configuration for a specific thread.
 * Centralized to avoid duplication across the codebase.
 *
 * @param threadId - Unique identifier for the workflow instance
 * @returns Configuration object for LangGraph
 */
export function createWorkflowConfig(threadId: string): {
  configurable: { thread_id: string };
} {
  return {
    configurable: {
      thread_id: threadId,
    },
  };
}

/**
 * Workflow phases in execution order.
 * Single source of truth for phase ordering.
 */
export const WORKFLOW_PHASES = [
  "title",
  "goals",
  "assessments",
  "modules",
  "lessons",
  "synthesis",
] as const;

/**
 * Gets the next phase after the given phase.
 *
 * @param currentPhase - Current workflow phase
 * @returns Next phase or null if at the end
 */
export function getNextPhase(
  currentPhase: (typeof WORKFLOW_PHASES)[number]
): (typeof WORKFLOW_PHASES)[number] | null {
  const currentIndex = WORKFLOW_PHASES.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex >= WORKFLOW_PHASES.length - 1) {
    return null;
  }
  return WORKFLOW_PHASES[currentIndex + 1];
}

/**
 * Gets the previous phase before the given phase.
 *
 * @param currentPhase - Current workflow phase
 * @returns Previous phase or null if at the beginning
 */
export function getPreviousPhase(
  currentPhase: (typeof WORKFLOW_PHASES)[number]
): (typeof WORKFLOW_PHASES)[number] | null {
  const currentIndex = WORKFLOW_PHASES.indexOf(currentPhase);
  if (currentIndex <= 0) {
    return null;
  }
  return WORKFLOW_PHASES[currentIndex - 1];
}

/**
 * Checks if a phase is complete based on state conditions.
 *
 * @param state - Current workflow state
 * @param phase - Phase to check
 * @returns True if the phase is complete
 */
export function isPhaseComplete(
  state: CourseDesignState,
  phase: (typeof WORKFLOW_PHASES)[number]
): boolean {
  switch (phase) {
    case "title":
      return !!state.courseTitle;
    case "goals":
      return state.clos.length > 0 && state.clos.every((c) => c.approved);
    case "assessments":
      return (
        state.assessments.length > 0 &&
        state.assessments.every((a) => a.approved)
      );
    case "modules":
      return allParentsHaveApprovedChildren(state, "assessmentId", state.modules);
    case "lessons":
      return allParentsHaveApprovedChildren(state, "moduleId", state.dailyLessons);
    case "synthesis":
      return state.status === "LOCKED";
    default:
      return false;
  }
}
