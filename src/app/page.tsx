"use client";

import { useState, useEffect } from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { ChatPanel } from "@/components/chat-panel";
import { DocumentPreview } from "@/components/document-preview";
import { ScopeWidget } from "@/components/scope-widget";
import { CourseSettingsDropdown } from "@/components/course-settings-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Loader2, Plus, BookOpen } from "lucide-react";

/**
 * Node processing status.
 */
type NodeStatus = "DRAFTING" | "IN_REVIEW" | "LOCKED";

/**
 * Types of nodes in the course design hierarchy.
 */
type NodeType = "COURSE" | "GOAL" | "ASSESSMENT" | "MODULE" | "LESSON";

/**
 * Course node in the hierarchy.
 */
interface CourseNode {
  id: string;
  type: NodeType;
  title: string;
  content: unknown;
  status: NodeStatus;
  children: CourseNode[];
}

/**
 * Course with full context.
 */
interface Course {
  id: string;
  title: string;
  gradeLevel: string;
  skills: string;
  nodes: CourseNode[];
  threadId: string;
}

/**
 * Home page - Main workbench interface for course design.
 * Provides split-screen layout with chat on the left and document preview on the right.
 */
export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>("title");
  const [isLoading, setIsLoading] = useState(false);
  const [showNewCourseForm, setShowNewCourseForm] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseGrade, setNewCourseGrade] = useState("");
  const [newCourseSkills, setNewCourseSkills] = useState("");
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch courses on mount
  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      setCourses(data);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    }
  }

  async function createCourse() {
    if (!newCourseTitle.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newCourseTitle,
          gradeLevel: newCourseGrade,
          skills: newCourseSkills,
        }),
      });
      const course = await res.json();
      setCourses([...courses, course]);
      setSelectedCourse(course);
      setShowNewCourseForm(false);
      setNewCourseTitle("");
      setNewCourseGrade("");
      setNewCourseSkills("");
    } catch (error) {
      console.error("Failed to create course:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteCourse(courseId: string) {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete course");
      }

      // Remove deleted course from list
      setCourses(courses.filter((c) => c.id !== courseId));

      // Deselect if currently selected
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
      }
    } catch (error) {
      console.error("Failed to delete course:", error);
      alert(error instanceof Error ? error.message : "Failed to delete course");
    } finally {
      setIsDeleting(false);
      setCourseToDelete(null);
    }
  }

  async function startCourseDesign(course: Course) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          threadId: course.threadId,
          courseTitle: course.title,
          gradeLevel: course.gradeLevel,
          skills: course.skills,
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log("Stream data:", data);
              // Update course state with new data
            } catch (e) {
              // Ignore empty or malformed lines
            }
          }
        }
      }

      await fetchCourses();
    } catch (error) {
      console.error("Failed to start course design:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Agentic Course Design Workbench</h1>
                <p className="text-sm text-muted-foreground">Backward Design Curriculum Builder</p>
              </div>
            </div>
            <button
              onClick={() => setShowNewCourseForm(!showNewCourseForm)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Course
            </button>
          </div>
        </div>
      </header>

      {/* New Course Form */}
      {showNewCourseForm && (
        <div className="border-b bg-card/50">
          <div className="container mx-auto px-4 py-6">
            <div className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Course Title</label>
                <input
                  type="text"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="e.g., Introduction to Physics"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Grade/Skill Level</label>
                <input
                  type="text"
                  value={newCourseGrade}
                  onChange={(e) => setNewCourseGrade(e.target.value)}
                  placeholder="e.g., High School, Undergraduate"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Skills Focus</label>
                <input
                  type="text"
                  value={newCourseSkills}
                  onChange={(e) => setNewCourseSkills(e.target.value)}
                  placeholder="e.g., Problem-solving, Critical thinking"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createCourse}
                  disabled={isLoading || !newCourseTitle.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </button>
                <button
                  onClick={() => setShowNewCourseForm(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {selectedCourse ? (
          <>
            <Breadcrumb
              course={selectedCourse}
              onNavigate={(courseId) => {
                if (courseId === null) {
                  setSelectedCourse(null);
                }
              }}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <ChatPanel courseId={selectedCourse.id} threadId={selectedCourse.threadId} />
              <div className="space-y-4">
                <DocumentPreview course={selectedCourse} />
                <ScopeWidget />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Welcome to the Course Design Workbench</h2>
            <p className="text-muted-foreground mb-6">
              Create a new course or select an existing one to begin the backward design process.
            </p>
            {courses.length === 0 ? (
              <p className="text-muted-foreground">No courses yet. Click "New Course" to get started.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mt-6">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-card/50 transition-colors relative"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">{course.title}</h3>
                        <p className="text-sm text-muted-foreground">{course.gradeLevel}</p>
                      </div>
                      <CourseSettingsDropdown
                        courseId={course.id}
                        onDelete={setCourseToDelete}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!courseToDelete}
        title="Delete Course"
        message={`Are you sure you want to delete "${
          courses.find((c) => c.id === courseToDelete)?.title
        }"? This action cannot be undone and will delete all associated content.`}
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={() => deleteCourse(courseToDelete!)}
        onCancel={() => setCourseToDelete(null)}
      />
    </div>
  );
}
