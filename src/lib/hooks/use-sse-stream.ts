/**
 * SSE Stream Hook
 *
 * Reusable hook for handling Server-Sent Events (SSE) streams.
 * Centralizes the SSE parsing logic used across components.
 */

import { useState, useCallback } from "react";

/**
 * Message structure from SSE stream.
 */
export interface StreamMessage {
  messages?: Array<{
    role?: string;
    content?: string;
  }>;
  [key: string]: unknown;
}

/**
 * Callback type for handling stream events.
 */
export type StreamCallback = (data: StreamMessage) => void;

/**
 * Error callback type.
 */
export type ErrorCallback = (error: Error) => void;

/**
 * Hook for managing SSE streams.
 *
 * @returns Object with stream control methods and state
 */
export function useSSEStream() {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Parses SSE-formatted text and extracts message data.
   *
   * @param line - Raw line from SSE stream
   * @returns Parsed data or null if not a data line
   */
  const parseSSELine = useCallback((line: string): StreamMessage | null => {
    if (!line.startsWith("data: ")) {
      return null;
    }

    const data = line.slice(6);

    // Check for completion marker
    if (data === "[DONE]") {
      return { __done: true };
    }

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }, []);

  /**
   * Extracts the latest assistant content from stream data.
   *
   * @param data - Stream message data
   * @returns Latest assistant content or empty string
   */
  const extractAssistantContent = useCallback((data: StreamMessage): string => {
    if (data.messages && data.messages.length > 0) {
      const lastMsg = data.messages[data.messages.length - 1];
      return lastMsg.content || "";
    }
    return "";
  }, []);

  /**
   * Sends a request to the specified endpoint and processes the SSE stream.
   *
   * @param url - API endpoint URL
   * @param options - Fetch options
   * @param onData - Callback for each parsed message
   * @param onError - Callback for errors
   * @param onComplete - Callback when stream completes
   */
  const streamRequest = useCallback(
    async (
      url: string,
      options: RequestInit,
      onData: StreamCallback,
      onError?: ErrorCallback,
      onComplete?: () => void
    ) => {
      setIsLoading(true);

      try {
        const response = await fetch(url, options);

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            const parsed = parseSSELine(line);
            if (parsed) {
              if (parsed.__done) {
                continue;
              }
              onData(parsed);
              const content = extractAssistantContent(parsed);
              if (content) {
                accumulatedContent = content;
              }
            }
          }
        }

        onComplete?.();
      } catch (error) {
        onError?.(error as Error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [parseSSELine, extractAssistantContent]
  );

  return {
    isLoading,
    streamRequest,
    parseSSELine,
    extractAssistantContent,
  };
}
