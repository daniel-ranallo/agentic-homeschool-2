"use client";

import React, { useState } from "react";
import { Settings, Trash2 } from "lucide-react";

interface CourseSettingsDropdownProps {
  courseId: string;
  onDelete: (courseId: string) => void;
}

/**
 * Settings dropdown for course actions.
 * Currently supports delete action with confirmation.
 */
export function CourseSettingsDropdown({
  courseId,
  onDelete,
}: CourseSettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    setIsOpen(false);
    onDelete(courseId);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-muted rounded-lg transition-colors"
        aria-label="Course settings"
        type="button"
      >
        <Settings className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border rounded-lg shadow-lg z-10" role="menu">
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left hover:bg-destructive/10 flex items-center gap-2 text-destructive"
            type="button"
            role="menuitem"
          >
            <Trash2 className="h-4 w-4" />
            Delete Course
          </button>
        </div>
      )}
    </div>
  );
}
