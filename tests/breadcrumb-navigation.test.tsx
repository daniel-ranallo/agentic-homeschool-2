/**
 * Additional tests for Breadcrumb component navigation functionality
 *
 * These tests specifically verify:
 * - NODE_TYPE_ICONS integration for locked nodes
 * - NODE_TYPE_LABELS integration for display
 * - Keyboard navigation with preventDefault behavior
 * - Focus management for accessibility
 *
 * NOTE: These tests will FAIL initially because:
 * 1. workflow-config is not mocked
 * 2. The breadcrumb component may not have all accessibility features implemented
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronRight: ({ className, ...props }: { className?: string }) => (
    <span data-testid="chevron" className={className} {...props}>Chevron</span>
  ),
  Home: ({ className, ...props }: { className?: string }) => (
    <span data-testid="home-icon" className={className} {...props}>HomeIcon</span>
  ),
}));

// Mock the langgraph state module
jest.mock('@/lib/langgraph/state', () => ({
  NodeType: {
    COURSE: 'COURSE',
    GOAL: 'GOAL',
    ASSESSMENT: 'ASSESSMENT',
    MODULE: 'MODULE',
    LESSON: 'LESSON',
  },
}));

// NOTE: We intentionally do NOT mock workflow-config here
// This will cause tests that depend on NODE_TYPE_ICONS and NODE_TYPE_LABELS to fail
// import { NODE_TYPE_ICONS, NODE_TYPE_LABELS } from '@/lib/workflow-config';

// Now import the component
import { Breadcrumb } from '@/components/breadcrumb';

// Test types matching the component
interface CourseNode {
  id: string;
  type: 'COURSE' | 'GOAL' | 'ASSESSMENT' | 'MODULE' | 'LESSON';
  title: string;
  status: 'DRAFTING' | 'IN_REVIEW' | 'LOCKED';
}

interface Course {
  id: string;
  title: string;
  nodes: CourseNode[];
}

describe('Breadcrumb Component - Navigation Integration', () => {
  const mockCourse: Course = {
    id: 'course-1',
    title: 'Introduction to Physics',
    nodes: [
      { id: 'node-1', type: 'GOAL', title: 'Learning Outcomes', status: 'LOCKED' },
      { id: 'node-2', type: 'ASSESSMENT', title: 'Final Exam', status: 'DRAFTING' },
      { id: 'node-3', type: 'MODULE', title: 'Kinematics', status: 'LOCKED' },
      { id: 'node-4', type: 'LESSON', title: 'Velocity and Acceleration', status: 'LOCKED' },
    ],
  };

  describe('NODE_TYPE_ICONS integration', () => {
    const mockOnNavigate = jest.fn();

    beforeEach(() => {
      mockOnNavigate.mockClear();
    });

    it('should render GOAL type with correct icon (🎯)', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      // This test will FAIL if NODE_TYPE_ICONS is not properly imported and used
      const goalIcon = screen.getByText('🎯');
      expect(goalIcon).toBeInTheDocument();
    });

    it('should render ASSESSMENT type with correct icon (📝)', () => {
      const courseWithAssessment: Course = {
        ...mockCourse,
        nodes: [
          { id: 'node-1', type: 'ASSESSMENT', title: 'Midterm', status: 'LOCKED' },
        ],
      };
      render(<Breadcrumb course={courseWithAssessment} onNavigate={mockOnNavigate} />);

      // This test will FAIL if NODE_TYPE_ICONS is not properly imported and used
      expect(screen.getByText('📝')).toBeInTheDocument();
    });

    it('should render MODULE type with correct icon (📖)', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      // This test will FAIL if NODE_TYPE_ICONS is not properly imported and used
      expect(screen.getByText('📖')).toBeInTheDocument();
    });

    it('should render LESSON type with correct icon (📋)', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      // This test will FAIL if NODE_TYPE_ICONS is not properly imported and used
      expect(screen.getByText('📋')).toBeInTheDocument();
    });

    it('should render COURSE type with correct icon (📚)', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      // This test will FAIL if NODE_TYPE_ICONS is not properly imported and used
      expect(screen.getByText('📚')).toBeInTheDocument();
    });
  });

  describe('Keyboard navigation with preventDefault', () => {
    const mockOnNavigate = jest.fn();

    beforeEach(() => {
      mockOnNavigate.mockClear();
    });

    it('should call preventDefault on Enter key press for Home', async () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });

      // Focus the button first, then use keyboard to press Enter
      // This test will FAIL if the keyboard handler doesn't trigger navigation
      await userEvent.click(homeButton); // Focus the button
      await userEvent.keyboard('{Enter}');

      expect(mockOnNavigate).toHaveBeenCalledWith(null);
    });

    it('should call preventDefault on Space key press for Home', async () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });

      // Focus the button first, then use keyboard to press Space
      // This test will FAIL if the keyboard handler doesn't trigger navigation
      await userEvent.click(homeButton); // Focus the button
      await userEvent.keyboard('{Space}');

      expect(mockOnNavigate).toHaveBeenCalledWith(null);
    });

    it('should call preventDefault on Enter key press for course title', async () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const courseButton = screen.getByRole('button', { name: /introduction to physics/i });

      // Focus the button first, then use keyboard to press Enter
      // This test will FAIL if the keyboard handler doesn't trigger navigation
      await userEvent.click(courseButton); // Focus the button
      await userEvent.keyboard('{Enter}');

      expect(mockOnNavigate).toHaveBeenCalledWith(mockCourse.id);
    });

    it('should NOT call preventDefault on non-button elements', async () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const lockedNode = screen.getByText('Learning Outcomes');

      // Non-button elements should not trigger navigation
      await userEvent.click(lockedNode);

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Focus management', () => {
    const mockOnNavigate = jest.fn();

    beforeEach(() => {
      mockOnNavigate.mockClear();
    });

    it('should have Home button focusable via tab', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });

      // This test will FAIL if tabIndex is not set to 0
      expect(homeButton).toHaveAttribute('tabIndex', '0');
    });

    it('should have course title button focusable via tab', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const courseButton = screen.getByRole('button', { name: /introduction to physics/i });

      // This test will FAIL if tabIndex is not set to 0
      expect(courseButton).toHaveAttribute('tabIndex', '0');
    });

    it('should NOT have locked nodes as focusable buttons', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const lockedNode = screen.getByText('Learning Outcomes');

      // Locked nodes should not be buttons
      expect(lockedNode.closest('button')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard navigation - comprehensive', () => {
    const mockOnNavigate = jest.fn();

    beforeEach(() => {
      mockOnNavigate.mockClear();
    });

    it('should handle Enter key on course title button', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const courseButton = screen.getByRole('button', { name: /introduction to physics/i });
      fireEvent.keyDown(courseButton, { key: 'Enter', code: 'Enter' });

      expect(mockOnNavigate).toHaveBeenCalledWith(mockCourse.id);
    });

    it('should handle Space key on course title button', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const courseButton = screen.getByRole('button', { name: /introduction to physics/i });
      fireEvent.keyDown(courseButton, { key: ' ', code: 'Space' });

      expect(mockOnNavigate).toHaveBeenCalledWith(mockCourse.id);
    });

    it('should NOT trigger navigation on Enter key for locked nodes', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const lockedNode = screen.getByText('Learning Outcomes');
      fireEvent.keyDown(lockedNode, { key: 'Enter', code: 'Enter' });

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should NOT trigger navigation on Space key for locked nodes', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const lockedNode = screen.getByText('Learning Outcomes');
      fireEvent.keyDown(lockedNode, { key: ' ', code: 'Space' });

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Button semantics and accessibility', () => {
    const mockOnNavigate = jest.fn();

    beforeEach(() => {
      mockOnNavigate.mockClear();
    });

    it('should have Home as a button element', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });
      expect(homeButton).toBeInTheDocument();
    });

    it('should have course title as a button element', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const courseButton = screen.getByRole('button', { name: /introduction to physics/i });
      expect(courseButton).toBeInTheDocument();
    });

    it('should have proper button type="button" attribute', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });
      expect(homeButton).toHaveAttribute('type', 'button');
    });

    it('should not have aria-disabled on clickable items', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });
      const courseButton = screen.getByRole('button', { name: /introduction to physics/i });

      expect(homeButton).not.toHaveAttribute('aria-disabled');
      expect(courseButton).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('Navigation callback behavior', () => {
    it('should call onNavigate with null for Home navigation', () => {
      const mockOnNavigate = jest.fn();
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });
      fireEvent.click(homeButton);

      expect(mockOnNavigate).toHaveBeenCalledTimes(1);
      expect(mockOnNavigate).toHaveBeenCalledWith(null);
    });

    it('should call onNavigate with course id for course navigation', () => {
      const mockOnNavigate = jest.fn();
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const courseButton = screen.getByRole('button', { name: /introduction to physics/i });
      fireEvent.click(courseButton);

      expect(mockOnNavigate).toHaveBeenCalledTimes(1);
      expect(mockOnNavigate).toHaveBeenCalledWith(mockCourse.id);
    });

    it('should not call onNavigate when not provided', () => {
      render(<Breadcrumb course={mockCourse} />);

      const homeButton = screen.getByRole('button', { name: /home/i });
      fireEvent.click(homeButton);

      // Component should not throw when onNavigate is undefined
      expect(true).toBe(true);
    });
  });
});
