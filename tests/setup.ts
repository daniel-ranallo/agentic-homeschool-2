/**
 * Jest setup file for React Testing Library
 * This file is automatically run before each test file
 */

import '@testing-library/jest-dom';

// Mock next/router for Next.js components
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    isFallback: false,
    isReady: true,
    isPreview: false,
  }),
}));

// Mock next/navigation for Next.js App Router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => ({
    get: jest.fn(),
    has: jest.fn(),
    forEach: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    toString: () => '',
  }),
}));

// Global test matchers
expect.extend({
  toBeClickable(received) {
    const isClickable =
      received.tagName === 'BUTTON' ||
      received.hasAttribute('onClick') ||
      received.hasAttribute('role') && received.getAttribute('role') === 'button';

    if (isClickable) {
      return {
        pass: true,
        message: () => `Expected element to not be clickable`,
      };
    }

    return {
      pass: false,
      message: () => `Expected element to be clickable (button or has onClick)`,
    };
  },
});
