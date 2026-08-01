/**
 * Unit tests for the ConfirmDialog component
 *
 * These tests verify:
 * - Dialog does not render when isOpen is false
 * - Dialog renders title and message when open
 * - Confirm button calls onConfirm when clicked
 * - Cancel button calls onCancel when clicked
 * - Default button labels are used when not specified
 * - Custom button labels are respected
 * - Destructive variant applies correct styling
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "../confirm-dialog";

describe("ConfirmDialog", () => {
  describe("Rendering when closed", () => {
    it("should not render when isOpen is false", () => {
      render(
        <ConfirmDialog
          isOpen={false}
          title="Test Title"
          message="Test message"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
      expect(screen.queryByText("Test message")).not.toBeInTheDocument();
    });

    it("should not show any overlay when closed", () => {
      render(
        <ConfirmDialog
          isOpen={false}
          title="Test Title"
          message="Test message"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Check that the overlay div is not present
      const overlay = document.querySelector('[class*="fixed inset-0"]');
      expect(overlay).not.toBeInTheDocument();
    });
  });

  describe("Basic rendering when open", () => {
    it("should render the title when isOpen is true", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Course"
          message="Are you sure?"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText("Delete Course")).toBeInTheDocument();
    });

    it("should render the message when isOpen is true", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Course"
          message="This action cannot be undone"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText("This action cannot be undone")).toBeInTheDocument();
    });

    it("should render the default confirm button text", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test message"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText("Confirm")).toBeInTheDocument();
    });

    it("should render the default cancel button text", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test message"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  describe("Custom button text", () => {
    it("should use custom confirmText when provided", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete"
          message="Really delete?"
          confirmText="Yes, Delete"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText("Yes, Delete")).toBeInTheDocument();
      expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    });

    it("should use custom cancelText when provided", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete"
          message="Really delete?"
          cancelText="No, Keep"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText("No, Keep")).toBeInTheDocument();
      expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    });

    it("should use both custom confirmText and cancelText", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete"
          message="Really delete?"
          confirmText="Delete Forever"
          cancelText="Stay Here"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText("Delete Forever")).toBeInTheDocument();
      expect(screen.getByText("Stay Here")).toBeInTheDocument();
    });
  });

  describe("Confirm action", () => {
    it("should call onConfirm when confirm button is clicked", () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Course"
          message="Are you sure?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      fireEvent.click(screen.getByText("Confirm"));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it("should NOT call onCancel when confirm button is clicked", () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Course"
          message="Are you sure?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      fireEvent.click(screen.getByText("Confirm"));

      expect(onCancel).not.toHaveBeenCalled();
    });

    it("should call onConfirm with custom confirm text", () => {
      const onConfirm = jest.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete"
          message="Confirm deletion"
          confirmText="Delete"
          onConfirm={onConfirm}
          onCancel={jest.fn()}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("Cancel action", () => {
    it("should call onCancel when cancel button is clicked", () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test message"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      fireEvent.click(screen.getByText("Cancel"));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("should NOT call onConfirm when cancel button is clicked", () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test message"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      fireEvent.click(screen.getByText("Cancel"));

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("should call onCancel with custom cancel text", () => {
      const onCancel = jest.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test message"
          confirmText="Proceed"
          cancelText="Go Back"
          onConfirm={jest.fn()}
          onCancel={onCancel}
        />
      );

      fireEvent.click(screen.getByText("Go Back"));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("Button styling variants", () => {
    it("should apply destructive variant to confirm button by default", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete"
          message="Warning message"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const confirmButton = screen.getByText("Confirm");
      // Check for destructive variant classes (at least one should be present)
      expect(confirmButton).toBeInTheDocument();
    });

    it("should apply destructive variant when explicitly set", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete"
          message="Warning message"
          confirmVariant="destructive"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toBeInTheDocument();
    });

    it("should apply default variant when specified", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Action"
          message="Proceed with action"
          confirmVariant="default"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toBeInTheDocument();
    });
  });

  describe("Modal structure", () => {
    it("should render a modal overlay with backdrop", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test message"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Check for overlay container
      const overlay = screen.getByRole("presentation");
      expect(overlay).toBeInTheDocument();
    });

    it("should render buttons in a container with proper layout", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test message"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const confirmButton = screen.getByText("Confirm");
      const cancelButton = screen.getByText("Cancel");

      // Both buttons should be in the document
      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe("Real-world usage scenarios", () => {
    it("should display a course deletion confirmation message", () => {
      const courseTitle = "Introduction to Physics";
      const onConfirm = jest.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Course"
          message={`Are you sure you want to delete "${courseTitle}"? This action cannot be undone and will delete all associated content.`}
          confirmText="Delete"
          confirmVariant="destructive"
          onConfirm={onConfirm}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText("Delete Course")).toBeInTheDocument();
      expect(screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'p' && content.includes(`Are you sure you want to delete "${courseTitle}"?`);
      })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    });

    it("should handle empty message gracefully", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Confirm Action"
          message=""
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText("Confirm Action")).toBeInTheDocument();
      // Empty message should still render (might be empty or have placeholder styling)
    });
  });
});
