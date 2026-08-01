/**
 * Workflow Configuration
 *
 * Centralized configuration for workflow phases, node types, and related constants.
 * Single source of truth to avoid duplication across components and nodes.
 */

import { WorkflowPhase, NodeType, NodeStatus } from "./langgraph/state";
import {
  BookOpen,
  Target,
  FileText,
  Layers,
  CheckCircle,
} from "lucide-react";

/**
 * Phase metadata with display information.
 */
export interface PhaseConfig {
  key: WorkflowPhase;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  order: number;
}

/**
 * Node type metadata with display information.
 */
export interface NodeTypeConfig {
  type: NodeType;
  label: string;
  icon: string;
  iconComponent?: React.ComponentType<{ className?: string }>;
}

/**
 * All workflow phases in execution order.
 */
export const WORKFLOW_PHASES: PhaseConfig[] = [
  {
    key: "title",
    title: "Course Title",
    description: "Basic course information",
    icon: BookOpen,
    order: 0,
  },
  {
    key: "goals",
    title: "Learning Outcomes",
    description: "Course Learning Outcomes (CLOs)",
    icon: Target,
    order: 1,
  },
  {
    key: "assessments",
    title: "Assessments",
    description: "Summative Assessments & Capstones",
    icon: FileText,
    order: 2,
  },
  {
    key: "modules",
    title: "Modules",
    description: "Module breakdown per assessment",
    icon: Layers,
    order: 3,
  },
  {
    key: "lessons",
    title: "Lesson Plans",
    description: "Daily 50-minute lesson plans",
    icon: BookOpen,
    order: 4,
  },
  {
    key: "synthesis",
    title: "Synthesis",
    description: "Global review and recommendations",
    icon: CheckCircle,
    order: 5,
  },
];

/**
 * Node type labels for display.
 */
export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  COURSE: "Course",
  GOAL: "Learning Outcomes",
  ASSESSMENT: "Assessment",
  MODULE: "Module",
  LESSON: "Lesson",
};

/**
 * Node type icons (emoji).
 */
export const NODE_TYPE_ICONS: Record<NodeType, string> = {
  COURSE: "📚",
  GOAL: "🎯",
  ASSESSMENT: "📝",
  MODULE: "📖",
  LESSON: "📋",
};

/**
 * Node status labels for display.
 */
export const NODE_STATUS_LABELS: Record<NodeStatus, string> = {
  DRAFTING: "Drafting",
  IN_REVIEW: "In Review",
  LOCKED: "Locked",
};

/**
 * Gets the phase configuration by key.
 *
 * @param key - Phase key
 * @returns Phase configuration or undefined
 */
export function getPhaseConfig(key: WorkflowPhase): PhaseConfig | undefined {
  return WORKFLOW_PHASES.find((p) => p.key === key);
}

/**
 * Gets the next phase after the given phase.
 *
 * @param currentPhase - Current phase
 * @returns Next phase or null if at the end
 */
export function getNextPhase(currentPhase: WorkflowPhase): WorkflowPhase | null {
  const currentIndex = WORKFLOW_PHASES.findIndex((p) => p.key === currentPhase);
  if (currentIndex === -1 || currentIndex >= WORKFLOW_PHASES.length - 1) {
    return null;
  }
  return WORKFLOW_PHASES[currentIndex + 1].key;
}

/**
 * Gets the previous phase before the given phase.
 *
 * @param currentPhase - Current phase
 * @returns Previous phase or null if at the beginning
 */
export function getPreviousPhase(currentPhase: WorkflowPhase): WorkflowPhase | null {
  const currentIndex = WORKFLOW_PHASES.findIndex((p) => p.key === currentPhase);
  if (currentIndex <= 0) {
    return null;
  }
  return WORKFLOW_PHASES[currentIndex - 1].key;
}

/**
 * Gets the node type label.
 *
 * @param type - Node type
 * @returns Human-readable label
 */
export function getNodeLabel(type: NodeType): string {
  return NODE_TYPE_LABELS[type];
}

/**
 * Gets the node type icon.
 *
 * @param type - Node type
 * @returns Icon character
 */
export function getNodeIcon(type: NodeType): string {
  return NODE_TYPE_ICONS[type];
}
