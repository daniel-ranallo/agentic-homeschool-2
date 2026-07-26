"use client";

import { ChevronRight, Home } from "lucide-react";
import { NodeType } from "@/lib/langgraph/state";

interface CourseNode {
  id: string;
  type: NodeType;
  title: string;
  status: "DRAFTING" | "IN_REVIEW" | "LOCKED";
}

interface Course {
  id: string;
  title: string;
  nodes: CourseNode[];
}

interface BreadcrumbProps {
  course: Course;
}

const nodeTypeLabels: Record<NodeType, string> = {
  COURSE: "Course",
  GOAL: "Learning Outcomes",
  ASSESSMENT: "Assessment",
  MODULE: "Module",
  LESSON: "Lesson",
};

const nodeTypeIcons: Record<NodeType, string> = {
  COURSE: "📚",
  GOAL: "🎯",
  ASSESSMENT: "📝",
  MODULE: "📖",
  LESSON: "📋",
};

type BreadcrumbItemType = "home" | "course" | NodeType;

export function Breadcrumb({ course }: BreadcrumbProps) {
  // Build breadcrumb path from course nodes
  const breadcrumbs: Array<{ type: BreadcrumbItemType; label: string; icon: string | React.ReactNode }> = [
    {
      type: "home",
      label: "Home",
      icon: <Home className="h-4 w-4" />,
    },
    {
      type: "course",
      label: course.title,
      icon: "📚",
    },
  ];

  // Add any locked nodes to the breadcrumb
  (course.nodes || []).forEach((node) => {
    if (node.status === "LOCKED") {
      breadcrumbs.push({
        type: node.type,
        label: node.title,
        icon: nodeTypeIcons[node.type],
      });
    }
  });

  return (
    <nav className="flex items-center gap-2 text-sm">
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="flex items-center gap-1">
            <span>{item.icon}</span>
            <span className={index === breadcrumbs.length - 1 ? "font-medium" : "text-muted-foreground"}>
              {item.label}
            </span>
          </span>
        </div>
      ))}
    </nav>
  );
}
