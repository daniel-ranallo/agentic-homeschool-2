/**
 * Unit tests for the CourseSettingsDropdown component
 *
 * These tests verify:
 * - Gear icon renders and is clickable
 * - Dropdown opens when gear icon is clicked
 * - Delete option appears in dropdown
 * - onDelete callback is called with courseId when delete is clicked
 */

import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CourseSettingsDropdown } from "../course-settings-dropdown";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Settings: ({ className, ...props }: { className?: string }) => (
    <span data-testid="settings-icon" className={className} {...props}>
      Settings
    </span>
  ),
  Trash2: ({ className, ...props }: { className?: string }) => (
    <span data-testid="trash-icon" className={className} {...props}>
      Trash
    </span>
  ),
}));

describe("CourseSettingsDropdown", () => {
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  describe("Basic rendering", () => {
    it("should render the settings gear button", () => {
      render(
        <CourseSettingsDropdown courseId="test-course-id" onDelete={mockOnDelete} />
      );

      const gearButton = screen.getByLabelText("Course settings");
      expect(gearButton).toBeInTheDocument();
    });

    it("should have the correct aria-label for accessibility", () => {
      render(
        <CourseSettingsDropdown courseId="test-course-id" onDelete={mockOnDelete} />
      );

      const gearButton = screen.getByLabelText("Course settings");
      expect(gearButton).toHaveAttribute("aria-label", "Course settings");
    });

    it("should render the settings icon", () => {
      render(
        <CourseSettingsDropdown courseId="test-course-id" onDelete={mockOnDelete} />
      );

      expect(screen.getByTestId("settings-icon")).toBeInTheDocument();
    });
  });

  describe("Dropdown behavior", () => {
    it("should NOT show delete option when dropdown is closed", () => {
      render(
        <CourseSettingsDropdown courseId="test-course-id" onDelete={mockOnDelete} />
      );

      expect(screen.queryByText("Delete Course")).not.toBeInTheDocument();
    });

    it("should open dropdown when gear icon is clicked", () => {
      render(
        <CourseSettingsDropdown courseId="test-course-id" onDelete={mockOnDelete} />
      );

      const gearButton = screen.getByLabelText("Course settings");
      fireEvent.click(gearButton);

      expect(screen.getByText("Delete Course")).toBeInTheDocument();
    });

    it("should toggle dropdown when gear icon is clicked multiple times", () => {
      render(
        <CourseSettingsDropdown courseId="test-course-id" onDelete={mockOnDelete} />
      );

      const gearButton = screen.getByLabelText("Course settings");

      // Open dropdown
      fireEvent.click(gearButton);
      expect(screen.getByText("Delete Course")).toBeInTheDocument();

      // Close dropdown
      fireEvent.click(gearButton);
      expect(screen.queryByText("Delete Course")).not.toBeInTheDocument();
    });
  });

  describe("Delete action", () => {
    it("should render the delete course button with trash icon", () => {
      render(
        <CourseSettingsDropdown courseId="test-course-id" onDelete={mockOnDelete} />
      );

      const gearButton = screen.getByLabelText("Course settings");
      fireEvent.click(gearButton);

      expect(screen.getByText("Delete Course")).toBeInTheDocument();
      expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
    });

    it("should call onDelete with courseId when delete option is clicked", () => {
      render(
        <CourseSettingsDropdown courseId="test-course-id" onDelete={mockOnDelete} />
      );

      const gearButton = screen.getByLabelText("Course settings");
      fireEvent.click(gearButton);
      fireEvent.click(screen.getByText("Delete Course"));

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith("test-course-id");
    });

    it("should close dropdown before calling onDelete", () => {
      render(
        <CourseSettingsDropdown courseId="test-course-id" onDelete={mockOnDelete} />
      );

      const gearButton = screen.getByLabelText("Course settings");
      fireEvent.click(gearButton);
      expect(screen.getByText("Delete Course")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Delete Course"));

      expect(screen.queryByText("Delete Course")).not.toBeInTheDocument();
    });
  });

  describe("Different course IDs", () => {
    it("should pass the correct courseId when multiple dropdowns exist", () => {
      const onDelete1 = jest.fn();
      const onDelete2 = jest.fn();

      render(
        <>
          <CourseSettingsDropdown courseId="course-1" onDelete={onDelete1} />
          <CourseSettingsDropdown courseId="course-2" onDelete={onDelete2} />
        </>
      );

      // Click first dropdown's delete
      const firstGear = screen.getAllByLabelText("Course settings")[0];
      fireEvent.click(firstGear);
      fireEvent.click(screen.getAllByText("Delete Course")[0]);
      expect(onDelete1).toHaveBeenCalledWith("course-1");
      expect(onDelete2).not.toHaveBeenCalled();
    });
  });
});
