"use client";

import { Check, Lock, Edit2, Target, FileText, Layers, BookOpen, ChevronRight } from "lucide-react";
import { NodeStatus, NodeType } from "@/lib/langgraph/state";

interface CLO {
  id: string;
  text: string;
  bloomLevel: string;
  approved: boolean;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  type: string;
  closEvaluated: string[];
  approved: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string;
  topics: string[];
  assessmentId: string;
  approved: boolean;
}

interface LessonPlan {
  id: string;
  title: string;
  duration: number;
  objectives: string[];
  hook: string;
  directInstruction: string;
  application: string;
  wrapUp: string;
  moduleId: string;
  approved: boolean;
}

interface Course {
  id: string;
  title: string;
  gradeLevel: string;
  skills: string;
  nodes: any[];
  threadId: string;
}

interface DocumentPreviewProps {
  course: Course;
}

type Phase = "title" | "goals" | "assessments" | "modules" | "lessons" | "synthesis";

const phases: Array<{ key: Phase; title: string; icon: any; description: string }> = [
  { key: "title", title: "Course Title", icon: BookOpen, description: "Basic course information" },
  { key: "goals", title: "Learning Outcomes", icon: Target, description: "Course Learning Outcomes (CLOs)" },
  { key: "assessments", title: "Assessments", icon: FileText, description: "Summative Assessments & Capstones" },
  { key: "modules", title: "Modules", icon: Layers, description: "Module breakdown per assessment" },
  { key: "lessons", title: "Lesson Plans", icon: BookOpen, description: "Daily 50-minute lesson plans" },
];

export function DocumentPreview({ course }: DocumentPreviewProps) {
  // Current phase is determined by what we're actively working on
  // For MVP, we start at "goals" phase since title is already set
  const currentPhase: Phase = "goals";

  const getPhaseStatus = (phaseKey: Phase): "complete" | "active" | "pending" => {
    if (phaseKey === currentPhase) return "active";
    // Title is considered complete since course exists
    if (phaseKey === "title") return "complete";
    return "pending";
  };

  const handleApprove = async () => {
    console.log("Approving current phase for course:", course.id);
    alert("Approve & Lock button clicked - this would send approval to the workflow");
  };

  return (
    <div className="border rounded-lg bg-card p-6">
      {/* Phase Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Course Structure</h2>
          <p className="text-sm text-muted-foreground">
            Working on: <span className="font-medium text-primary">{phases.find(p => p.key === currentPhase)?.title}</span>
          </p>
        </div>
        <button
          onClick={handleApprove}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Check className="h-4 w-4" />
          Approve & Lock
        </button>
      </div>

      {/* Phase Progress Indicators */}
      <div className="flex items-center gap-2 mb-6 pb-4 border-b">
        {phases.map((phase, index) => {
          const status = getPhaseStatus(phase.key);
          const Icon = phase.icon;
          return (
            <div key={phase.key} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                  status === "active"
                    ? "bg-primary text-primary-foreground font-medium"
                    : status === "complete"
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{phase.title}</span>
              </div>
              {index < phases.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        {/* Course Title - Always visible and complete */}
        <div className={`p-4 rounded-lg border ${getPhaseStatus("title") === "complete" ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : ""}`}>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-medium">Course Title</h3>
          </div>
          <p className="text-lg font-semibold ml-6">{course.title}</p>
          {course.gradeLevel && (
            <p className="text-sm text-muted-foreground ml-6">Level: {course.gradeLevel}</p>
          )}
        </div>

        {/* Course Learning Outcomes - Active phase */}
        <div className={`p-4 rounded-lg border ${
          getPhaseStatus("goals") === "active"
            ? "bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 ring-2 ring-blue-400"
            : getPhaseStatus("goals") === "pending"
            ? "opacity-40 grayscale"
            : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Target className={`h-4 w-4 ${getPhaseStatus("goals") === "active" ? "text-blue-600" : "text-muted-foreground"}`} />
            <h3 className="text-sm font-medium">Course Learning Outcomes</h3>
            {getPhaseStatus("goals") === "active" && (
              <span className="ml-auto text-xs text-blue-600 font-medium animate-pulse">
                ● Currently editing
              </span>
            )}
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded border">
            <p className="text-sm text-muted-foreground">
              {getPhaseStatus("goals") === "active"
                ? "Chat on the left will generate and refine Course Learning Outcomes. Provide feedback to iterate until you're satisfied."
                : "CLOs will appear here after the goal generation phase completes."}
            </p>
          </div>
        </div>

        {/* Assessments - Pending */}
        <div className={`p-4 rounded-lg border ${
          getPhaseStatus("assessments") === "pending"
            ? "opacity-40 grayscale bg-muted"
            : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Summative Assessments</h3>
            {getPhaseStatus("assessments") === "pending" && (
              <span className="ml-auto text-xs text-muted-foreground">
                Locked until CLOs approved
              </span>
            )}
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded border">
            <p className="text-sm text-muted-foreground">
              Assessments will appear here after the assessment generation phase completes.
            </p>
          </div>
        </div>

        {/* Modules - Pending */}
        <div className={`p-4 rounded-lg border ${
          getPhaseStatus("modules") === "pending"
            ? "opacity-30 grayscale bg-muted"
            : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Modules</h3>
            {getPhaseStatus("modules") === "pending" && (
              <span className="ml-auto text-xs text-muted-foreground">
                Locked until assessments approved
              </span>
            )}
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded border">
            <p className="text-sm text-muted-foreground">
              Modules will appear here after the module generation phase completes.
            </p>
          </div>
        </div>

        {/* Lesson Plans - Pending */}
        <div className={`p-4 rounded-lg border ${
          getPhaseStatus("lessons") === "pending"
            ? "opacity-30 grayscale bg-muted"
            : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Lesson Plans</h3>
            {getPhaseStatus("lessons") === "pending" && (
              <span className="ml-auto text-xs text-muted-foreground">
                Locked until modules approved
              </span>
            )}
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded border">
            <p className="text-sm text-muted-foreground">
              Lesson plans will appear here after the lesson generation phase completes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
