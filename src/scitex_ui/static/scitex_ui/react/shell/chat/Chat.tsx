/**
 * Chat — AI chat panel with streaming responses.
 *
 * Usage:
 *   import { Chat } from '@scitex/ui/react/shell/chat';
 *   <Chat backend={directChatBackend} />
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import type { ChatProps } from "./types";
import type { ChatMessage } from "../workspace/types";

const CLS = "stx-shell-chat";

export const Chat: React.FC<ChatProps> = ({
  backend,
  placeholder = "Ask AI agent...",
  initialMessages,
  storageKey,
  className,
  style,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (initialMessages) return initialMessages;
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persist messages
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch {
        /* noop */
      }
    }
  }, [messages, storageKey]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    let assistantText = "";
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      for await (const chunk of backend.sendMessage(text)) {
        if (chunk.type === "text" && chunk.text) {
          assistantText += chunk.text;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: assistantText,
            };
            return updated;
          });
        } else if (chunk.type === "error") {
          assistantText += `\n[Error: ${chunk.text}]`;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: assistantText,
            };
            return updated;
          });
        }
      }
    } catch (e) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: assistantText || `Error: ${e}`,
        };
        return updated;
      });
    }

    setStreaming(false);
    inputRef.current?.focus();
  }, [input, streaming, backend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <div className={`${CLS} ${className ?? ""}`} style={style}>
      <div className={`${CLS}__header`}>
        <span>AI Chat</span>
        <button
          className={`${CLS}__clear`}
          onClick={clearMessages}
          title="Clear chat"
        >
          <i className="fas fa-trash" />
        </button>
      </div>

      <div className={`${CLS}__messages`}>
        {messages.length === 0 && (
          <div className={`${CLS}__empty`}>
            <i className="fas fa-robot" />
            <p>Ask anything about your project</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${CLS}__message ${CLS}__message--${msg.role}`}
          >
            <div className={`${CLS}__message-content`}>
              {msg.content ||
                (streaming && i === messages.length - 1 ? "..." : "")}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={`${CLS}__input-area`}>
        <textarea
          ref={inputRef}
          className={`${CLS}__input`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={streaming}
        />
        <button
          className={`${CLS}__send`}
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
          title="Send (Enter)"
        >
          <i
            className={
              streaming ? "fas fa-spinner fa-spin" : "fas fa-paper-plane"
            }
          />
        </button>
      </div>
    </div>
  );
};
