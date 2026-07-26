/**
 * Unit tests for the Breadcrumb component navigation functionality
 *
 * These tests verify that:
 * - Home and course breadcrumb items are clickable and trigger navigation
 * - ChevronRight separators remain non-clickable visual elements
 * - Locked node labels remain non-clickable (status indicators only)
 * - Keyboard navigation is supported for accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock all dependencies before importing the component
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

// Now import the component after mocks are set up
import { Breadcrumb } from '@/components/breadcrumb';

// Test types
interface CourseNode {
  id: string;
  type: 'COURSE' | 'GOAL' | 'ASSESSMENT' | 'MODULE' | 'LESSON';
  title: string;
  status: 'DRAFTING' | 'IN_REVIEW' | 'LOCKED';
}

interface Course {
  id: string;
  title: string;
  gradeLevel: string;
  skills: string;
  nodes: CourseNode[];
  threadId: string;
}

describe('Breadcrumb Component', () => {
  const mockCourse: Course = {
    id: 'course-1',
    title: 'Introduction to Physics',
    gradeLevel: 'High School',
    skills: 'Problem-solving, Critical thinking',
    threadId: 'thread-1',
    nodes: [
      { id: 'node-1', type: 'GOAL', title: 'Learning Outcomes', status: 'LOCKED' },
      { id: 'node-2', type: 'ASSESSMENT', title: 'Final Exam', status: 'DRAFTING' },
      { id: 'node-3', type: 'MODULE', title: 'Kinematics', status: 'LOCKED' },
    ],
  };

  describe('Basic rendering', () => {
    it('should render the breadcrumb with Home and course title', () => {
      render(<Breadcrumb course={mockCourse} />);

      // Home should be rendered
      expect(screen.getByTestId('home-icon')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();

      // Course title should be rendered
      expect(screen.getByText('Introduction to Physics')).toBeInTheDocument();
    });

    it('should render locked nodes in the breadcrumb', () => {
      render(<Breadcrumb course={mockCourse} />);

      // Locked nodes should appear
      expect(screen.getByText('Learning Outcomes')).toBeInTheDocument();
      expect(screen.getByText('Kinematics')).toBeInTheDocument();

      // Non-locked node should NOT appear
      expect(screen.queryByText('Final Exam')).not.toBeInTheDocument();
    });

    it('should render ChevronRight separators between items', () => {
      render(<Breadcrumb course={mockCourse} />);

      // Should have 3 chevrons (between 4 items: Home, Course, Learning Outcomes, Kinematics)
      const chevrons = screen.getAllByTestId('chevron');
      expect(chevrons).toHaveLength(3);
    });
  });

  describe('Navigation functionality', () => {
    const mockOnNavigate = jest.fn();

    beforeEach(() => {
      mockOnNavigate.mockClear();
    });

    it('should accept onNavigate callback prop', () => {
      // This test will FAIL initially because the Breadcrumb component
      // doesn't accept an onNavigate prop yet
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should call onNavigate when Home is clicked', () => {
      // This test will FAIL initially because Home is not clickable
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });
      fireEvent.click(homeButton);

      expect(mockOnNavigate).toHaveBeenCalledWith(null);
    });

    it('should call onNavigate with null when Home is clicked to return to course list', () => {
      // This test will FAIL initially because the navigation logic doesn't exist
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });
      fireEvent.click(homeButton);

      // Should pass null to indicate returning to the course list
      expect(mockOnNavigate).toHaveBeenCalledWith(null);
    });

    it('should call onNavigate with course id when course title is clicked', () => {
      // This test will FAIL initially because course title is not clickable
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const courseButton = screen.getByRole('button', { name: /introduction to physics/i });
      fireEvent.click(courseButton);

      // Should pass the course id to maintain the current course view
      expect(mockOnNavigate).toHaveBeenCalledWith(mockCourse.id);
    });
  });

  describe('Non-clickable elements', () => {
    const mockOnNavigate = jest.fn();

    beforeEach(() => {
      mockOnNavigate.mockClear();
    });

    it('should NOT have ChevronRight as clickable buttons', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const chevrons = screen.getAllByTestId('chevron');
      chevrons.forEach((chevron) => {
        // Chevrons should not be buttons
        expect(chevron.closest('button')).not.toBeInTheDocument();
      });
    });

    it('should NOT call onNavigate when clicking on locked node labels', () => {
      // Locked nodes should be status indicators, not navigation targets
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const learningOutcomes = screen.getByText('Learning Outcomes');
      fireEvent.click(learningOutcomes);

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should NOT call onNavigate when clicking on locked node icon', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      // Click on the emoji icon for GOAL type
      const goalIcon = screen.getByText('🎯');
      fireEvent.click(goalIcon);

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    const mockOnNavigate = jest.fn();

    beforeEach(() => {
      mockOnNavigate.mockClear();
    });

    it('should have tabIndex on Home button for keyboard navigation', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });
      expect(homeButton).toHaveAttribute('tabIndex', '0');
    });

    it('should have tabIndex on course title button for keyboard navigation', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const courseButton = screen.getByRole('button', { name: /introduction to physics/i });
      expect(courseButton).toHaveAttribute('tabIndex', '0');
    });

    it('should handle Enter key press on Home button', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });
      fireEvent.keyDown(homeButton, { key: 'Enter', code: 'Enter' });

      expect(mockOnNavigate).toHaveBeenCalledWith(null);
    });

    it('should handle Space key press on Home button', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });
      fireEvent.keyDown(homeButton, { key: ' ', code: 'Space' });

      expect(mockOnNavigate).toHaveBeenCalledWith(null);
    });

    it('should handle Enter key press on course title button', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const courseButton = screen.getByRole('button', { name: /introduction to physics/i });
      fireEvent.keyDown(courseButton, { key: 'Enter', code: 'Enter' });

      expect(mockOnNavigate).toHaveBeenCalledWith(mockCourse.id);
    });

    it('should NOT have keyboard handlers on locked node labels', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const learningOutcomes = screen.getByText('Learning Outcomes');
      fireEvent.keyDown(learningOutcomes, { key: 'Enter', code: 'Enter' });

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Visual styling', () => {
    const mockOnNavigate = jest.fn();

    it('should apply hover styles to clickable items', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button', { name: /home/i });
      fireEvent.mouseEnter(homeButton);

      // Should have hover class applied (we check for the button being interactive)
      expect(homeButton).toBeEnabled();
    });

    it('should not have hover styles on non-clickable items', () => {
      render(<Breadcrumb course={mockCourse} onNavigate={mockOnNavigate} />);

      const learningOutcomes = screen.getByText('Learning Outcomes');
      fireEvent.mouseEnter(learningOutcomes);

      // Locked nodes should not be interactive
      expect(learningOutcomes.closest('button')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    const mockOnNavigate = jest.fn();

    beforeEach(() => {
      mockOnNavigate.mockClear();
    });

    it('should handle empty nodes array', () => {
      const courseWithNoNodes: Course = {
        ...mockCourse,
        nodes: [],
      };

      render(<Breadcrumb course={courseWithNoNodes} onNavigate={mockOnNavigate} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Introduction to Physics')).toBeInTheDocument();
      expect(screen.queryByText('Learning Outcomes')).not.toBeInTheDocument();
    });

    it('should handle only non-locked nodes', () => {
      const courseWithNoLockedNodes: Course = {
        ...mockCourse,
        nodes: [
          { id: 'node-1', type: 'GOAL', title: 'Learning Outcomes', status: 'DRAFTING' },
          { id: 'node-2', type: 'MODULE', title: 'Kinematics', status: 'IN_REVIEW' },
        ],
      };

      render(<Breadcrumb course={courseWithNoLockedNodes} onNavigate={mockOnNavigate} />);

      // Only Home and course should appear
      expect(screen.getAllByTestId('chevron')).toHaveLength(1);
      expect(screen.queryByText('Learning Outcomes')).not.toBeInTheDocument();
      expect(screen.queryByText('Kinematics')).not.toBeInTheDocument();
    });

    it('should handle multiple locked nodes', () => {
      const courseWithMultipleLocked: Course = {
        ...mockCourse,
        nodes: [
          { id: 'node-1', type: 'GOAL', title: 'Learning Outcomes', status: 'LOCKED' },
          { id: 'node-2', type: 'ASSESSMENT', title: 'Midterm', status: 'LOCKED' },
          { id: 'node-3', type: 'MODULE', title: 'Kinematics', status: 'LOCKED' },
        ],
      };

      render(<Breadcrumb course={courseWithMultipleLocked} onNavigate={mockOnNavigate} />);

      expect(screen.getByText('Learning Outcomes')).toBeInTheDocument();
      expect(screen.getByText('Midterm')).toBeInTheDocument();
      expect(screen.getByText('Kinematics')).toBeInTheDocument();
    });
  });
});
