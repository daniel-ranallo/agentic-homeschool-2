import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Course Design Workflow State
 *
 * Tracks the entire backward design process from course title through lesson plans.
 * This state is managed by LangGraph and persists across workflow steps using
 * PostgresSaver checkpointing.
 */

/**
 * Node processing status indicating its current state in the workflow.
 */
export type NodeStatus = "DRAFTING" | "IN_REVIEW" | "LOCKED";

/**
 * Types of nodes in the course design hierarchy.
 */
export type NodeType = "COURSE" | "GOAL" | "ASSESSMENT" | "MODULE" | "LESSON";

/**
 * Course Learning Outcome - a measurable learning goal using Bloom's Taxonomy.
 */
export interface CLO {
  /** Unique identifier for the CLO */
  id: string;
  /** The learning outcome text */
  text: string;
  /** Bloom's Taxonomy level (e.g., "Remember", "Apply", "Create") */
  bloomLevel: string;
  /** Whether the CLO has been approved by the user */
  approved: boolean;
}

/**
 * Summative assessment that evaluates one or more CLOs.
 */
export interface Assessment {
  /** Unique identifier */
  id: string;
  /** Assessment title */
  title: string;
  /** Detailed description of the assessment */
  description: string;
  /** Assessment type (e.g., "Project", "Exam", "Presentation") */
  type: string;
  /** IDs of CLOs that this assessment evaluates */
  closEvaluated: string[];
  /** Whether the assessment has been approved by the user */
  approved: boolean;
}

/**
 * Module - a coherent learning unit within an assessment.
 */
export interface Module {
  /** Unique identifier */
  id: string;
  /** Module title */
  title: string;
  /** Module description */
  description: string;
  /** List of topics covered in this module */
  topics: string[];
  /** ID of the parent assessment */
  assessmentId: string;
  /** Whether the module has been approved by the user */
  approved: boolean;
}

/**
 * Daily lesson plan - a 50-minute active learning session.
 */
export interface LessonPlan {
  /** Unique identifier */
  id: string;
  /** Lesson title */
  title: string;
  /** Duration in minutes */
  duration: number;
  /** Learning objectives for this lesson */
  objectives: string[];
  /** Opening hook/engagement activity (5-10 min) */
  hook: string;
  /** Direct instruction segment (15-20 min) */
  directInstruction: string;
  /** Application activity (15-20 min) */
  application: string;
  /** Closing/wrap-up activity (5 min) */
  wrapUp: string;
  /** ID of the parent module */
  moduleId: string;
  /** Whether the lesson has been approved by the user */
  approved: boolean;
}

/**
 * Workflow phase indicating the current stage of course design.
 */
export type WorkflowPhase = "title" | "goals" | "assessments" | "modules" | "lessons" | "synthesis";

/**
 * Context for sibling nodes during parallel generation.
 * Used to prevent scope creep when generating modules/lessons in parallel.
 */
export interface SiblingContext {
  /** Type of sibling relationship */
  type: "assessments" | "modules";
  /** List of sibling items (excludes current item) */
  siblings: Array<{ id: string; title: string; description?: string }>;
  /** ID of the current item being processed */
  currentId: string;
}

/**
 * Complete course design state for the LangGraph workflow.
 */
export interface CourseDesignState {
  /** Course title entered by the user */
  courseTitle: string;
  /** Optional grade or skill level */
  gradeLevel?: string;
  /** Optional skills focus area */
  skills?: string;
  /** Generated Course Learning Outcomes */
  clos: CLO[];
  /** Generated summative assessments */
  assessments: Assessment[];
  /** Generated modules */
  modules: Module[];
  /** Generated daily lesson plans */
  dailyLessons: LessonPlan[];
  /** Conversation history with the user */
  messages: BaseMessage[];
  /** Thread ID for LangGraph checkpointing */
  currentThreadId: string;
  /** Currently active node ID in the workflow */
  activeNodeId: string;
  /** Overall status of the course design */
  status: NodeStatus;
  /** Current workflow phase */
  currentPhase: WorkflowPhase;
  /** Optional context for sibling nodes during parallel processing */
  siblingContext?: SiblingContext;
}

/**
 * LangGraph annotation defining the state schema with reducers.
 * Each field specifies how new values merge with existing state.
 */
export const CourseDesignAnnotation = Annotation.Root({
  courseTitle: Annotation<string>,
  gradeLevel: Annotation<string | undefined>,
  skills: Annotation<string | undefined>,
  // Accumulate CLOs without overwriting previous values
  clos: Annotation<CLO[]>({
    reducer: (oldVal, newVal) => newVal || oldVal || [],
    default: () => [],
  }),
  // Accumulate assessments
  assessments: Annotation<Assessment[]>({
    reducer: (oldVal, newVal) => newVal || oldVal || [],
    default: () => [],
  }),
  // Accumulate modules
  modules: Annotation<Module[]>({
    reducer: (oldVal, newVal) => newVal || oldVal || [],
    default: () => [],
  }),
  // Accumulate lesson plans
  dailyLessons: Annotation<LessonPlan[]>({
    reducer: (oldVal, newVal) => newVal || oldVal || [],
    default: () => [],
  }),
  // Use LangGraph's built-in message state reducer
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  currentThreadId: Annotation<string>,
  activeNodeId: Annotation<string>,
  // Status can only transition forward (DRAFTING → IN_REVIEW → LOCKED)
  status: Annotation<NodeStatus>({
    reducer: (oldVal, newVal) => newVal || oldVal || "DRAFTING",
    default: () => "DRAFTING",
  }),
  // Phase progresses through the workflow stages
  currentPhase: Annotation<WorkflowPhase>({
    reducer: (oldVal, newVal) => newVal || oldVal || "title",
    default: () => "title",
  }),
  // Sibling context is set explicitly during parallel processing
  siblingContext: Annotation<SiblingContext | undefined>({
    reducer: (oldVal, newVal) => newVal !== undefined ? newVal : oldVal,
    default: () => undefined,
  }),
});
