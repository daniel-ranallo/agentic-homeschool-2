"use client";

import { ChevronRight, Home } from "lucide-react";
import { NodeType } from "@/lib/langgraph/state";
import { NODE_TYPE_LABELS, NODE_TYPE_ICONS } from "@/lib/workflow-config";

/**
 * Course node within the course hierarchy.
 */
interface CourseNode {
  id: string;
  type: NodeType;
  title: string;
  status: "DRAFTING" | "IN_REVIEW" | "LOCKED";
}

/**
 * Course with its associated nodes.
 */
interface Course {
  id: string;
  title: string;
  nodes: CourseNode[];
}

/**
 * Props for the Breadcrumb component.
 */
interface BreadcrumbProps {
  /** Course to display in the breadcrumb */
  course: Course;
  /** Callback when navigating to home or course */
  onNavigate?: (courseId: string | null) => void;
}

type BreadcrumbItemType = "home" | "course" | NodeType;

/**
 * Displays a navigation breadcrumb showing the current course context.
 * Shows the path from home through the course and any locked nodes.
 *
 * @param course - The course to display
 * @param onNavigate - Callback for navigation events
 */
export function Breadcrumb({ course, onNavigate }: BreadcrumbProps) {
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
        icon: NODE_TYPE_ICONS[node.type],
      });
    }
  });

  return (
    <nav className="flex items-center gap-2 text-sm">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const isHome = item.type === "home";
        const isCourse = item.type === "course";
        const isClickable = isHome || isCourse;

        const handleClick = () => {
          if (onNavigate) {
            onNavigate(isHome ? null : course.id);
          }
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        };

        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            {isClickable ? (
              <button
                type="button"
                tabIndex={0}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <span>{item.icon}</span>
                <span className={isLast ? "font-medium" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </button>
            ) : (
              <span className="flex items-center gap-1">
                <span>{item.icon}</span>
                <span className={isLast ? "font-medium" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
