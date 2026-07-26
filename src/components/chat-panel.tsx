"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { useSSEStream, StreamMessage } from "@/lib/hooks/use-sse-stream";

/**
 * Chat message in the conversation history.
 */
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

/**
 * Props for the ChatPanel component.
 */
interface ChatPanelProps {
  /** Course ID for context */
  courseId: string;
  /** Workflow thread ID for the conversation */
  threadId: string;
}

/**
 * Interactive chat panel for providing feedback and receiving AI responses.
 * Supports streaming responses from the workflow API.
 *
 * @param courseId - Course identifier
 * @param threadId - Workflow thread identifier
 */
export function ChatPanel({ courseId, threadId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isLoading, streamRequest } = useSSEStream();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    let assistantContent = "";

    await streamRequest(
      "/api/graph",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          userFeedback: input,
          isResume: true,
        }),
      },
      (data: StreamMessage) => {
        if (data.messages && data.messages.length > 0) {
          const lastMsg = data.messages[data.messages.length - 1];
          if (lastMsg.content) {
            assistantContent = lastMsg.content;
          }
        }
      },
      (error) => {
        console.error("Chat error:", error);
      },
      () => {
        if (assistantContent) {
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: assistantContent,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      }
    );
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-card">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Start the conversation by providing feedback or asking questions.
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-2 rounded-lg bg-muted flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your feedback or questions..."
            className="flex-1 px-4 py-2 border rounded-lg"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </div>
  );
}
