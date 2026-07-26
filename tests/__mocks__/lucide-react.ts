/**
 * Mock for lucide-react icons for testing
 */
import React from 'react';

export const ChevronRight = ({ className, ...props }: { className?: string }) => (
  <span data-testid="chevron" className={className} {...props}>Chevron</span>
);

export const Home = ({ className, ...props }: { className?: string }) => (
  <span data-testid="home-icon" className={className} {...props}>HomeIcon</span>
);

export const BookOpen = ({ className, ...props }: { className?: string }) => (
  <span data-testid="book-icon" className={className} {...props}>Book</span>
);

export const Plus = ({ className, ...props }: { className?: string }) => (
  <span data-testid="plus-icon" className={className} {...props}>Plus</span>
);

export const Loader2 = ({ className, ...props }: { className?: string }) => (
  <span data-testid="loader-icon" className={className} {...props}>Loader</span>
);

// Re-export all other lucide-react icons as-is (or mock them)
export * from 'lucide-react';
