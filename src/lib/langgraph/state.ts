import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Course Design Workflow State
 * Tracks the entire backward design process from course title to lesson plans
 */

export type NodeStatus = "DRAFTING" | "IN_REVIEW" | "LOCKED";

export type NodeType = "COURSE" | "GOAL" | "ASSESSMENT" | "MODULE" | "LESSON";

export interface CLO {
  id: string;
  text: string;
  bloomLevel: string;
  approved: boolean;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  type: string;
  closEvaluated: string[];
  approved: boolean;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  topics: string[];
  assessmentId: string;
  approved: boolean;
}

export interface LessonPlan {
  id: string;
  title: string;
  duration: number; // in minutes
  objectives: string[];
  hook: string;
  directInstruction: string;
  application: string;
  wrapUp: string;
  moduleId: string;
  approved: boolean;
}

export interface CourseDesignState {
  courseTitle: string;
  gradeLevel?: string;
  skills?: string;
  clos: CLO[];
  assessments: Assessment[];
  modules: Module[];
  dailyLessons: LessonPlan[];
  messages: BaseMessage[];
  currentThreadId: string;
  activeNodeId: string;
  status: NodeStatus;
  currentPhase: "title" | "goals" | "assessments" | "modules" | "lessons" | "synthesis";
  siblingContext?: {
    type: "assessments" | "modules";
    siblings: any[];
    currentId: string;
  };
}

export const CourseDesignAnnotation = Annotation.Root({
  courseTitle: Annotation<string>,
  gradeLevel: Annotation<string | undefined>,
  skills: Annotation<string | undefined>,
  clos: Annotation<CLO[]>({
    reducer: (oldVal, newVal) => newVal || oldVal || [],
    default: () => [],
  }),
  assessments: Annotation<Assessment[]>({
    reducer: (oldVal, newVal) => newVal || oldVal || [],
    default: () => [],
  }),
  modules: Annotation<Module[]>({
    reducer: (oldVal, newVal) => newVal || oldVal || [],
    default: () => [],
  }),
  dailyLessons: Annotation<LessonPlan[]>({
    reducer: (oldVal, newVal) => newVal || oldVal || [],
    default: () => [],
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  currentThreadId: Annotation<string>,
  activeNodeId: Annotation<string>,
  status: Annotation<NodeStatus>({
    reducer: (oldVal, newVal) => newVal || oldVal || "DRAFTING",
    default: () => "DRAFTING",
  }),
  currentPhase: Annotation<"title" | "goals" | "assessments" | "modules" | "lessons" | "synthesis">({
    reducer: (oldVal, newVal) => newVal || oldVal || "title",
    default: () => "title",
  }),
  siblingContext: Annotation<any | undefined>({
    reducer: (oldVal, newVal) => newVal !== undefined ? newVal : oldVal,
    default: () => undefined,
  }),
});
