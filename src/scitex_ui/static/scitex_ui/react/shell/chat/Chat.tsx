/**
 * Chat — AI chat panel with streaming responses.
 * Uses stx-shell-ai-* CSS classes matching scitex-cloud global_ai_panel.html DOM.
 *
 * Renders as a fragment (no wrapper div). The parent (Workspace) supplies
 * the .stx-shell-ai-view wrapper so there is no nested duplication.
 *
 * Usage:
 *   import { Chat } from '@scitex/ui/react/shell/chat';
 *   <Chat backend={directChatBackend} />
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import type { ChatProps } from "./types";
import type { ChatMessage } from "../workspace/types";

export const Chat: React.FC<ChatProps> = ({
  backend,
  placeholder = "Ask anything",
  initialMessages,
  storageKey,
  className: _className,
  style: _style,
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

  // Render as fragment — parent (Workspace) provides the .stx-shell-ai-view wrapper
  return (
    <>
      {/* Sessions bar — new chat button + session chips + actions */}
      <div className="stx-shell-ai-sessions-bar">
        <button className="stx-shell-ai-new-chat" title="New chat">
          <i className="fas fa-plus" />
        </button>
        <div className="stx-shell-ai-sessions-list">
          <div className="stx-shell-ai-session-item active">
            <span>C1</span>
          </div>
        </div>
        <div className="stx-shell-ai-panel-actions">
          <button
            className="stx-shell-ai-action-btn"
            onClick={clearMessages}
            title="Clear chat"
          >
            <i className="fas fa-trash-alt" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="stx-shell-ai-messages">
        {messages.length === 0 && (
          <div className="stx-shell-ai-empty">
            <i className="fas fa-robot" />
            <span>Ask anything about SciTeX.</span>
            <span>
              I can take actions: stats, plots, literature, and your current
              work.
            </span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`stx-shell-ai-msg ${msg.role === "user" ? "user" : "assistant"}`}
          >
            {msg.content ||
              (streaming && i === messages.length - 1 ? (
                <span className="stx-shell-ai-typing">Thinking</span>
              ) : (
                ""
              ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="stx-shell-ai-input-area" style={{ position: "relative" }}>
        <span className="stx-shell-ai-model-badge" />
        <div className="stx-shell-ai-image-previews" />
        <div className="stx-shell-ai-input-wrap">
          <textarea
            ref={inputRef}
            className="stx-shell-ai-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={streaming}
          />
          {/* Camera — placeholder, non-functional */}
          <button
            className="stx-shell-ai-input-btn"
            title="Attach image"
            disabled
            aria-disabled="true"
          >
            <i className="fas fa-camera" />
          </button>
          {/* Sketch — placeholder, non-functional */}
          <button
            className="stx-shell-ai-input-btn"
            title="Draw sketch"
            disabled
            aria-disabled="true"
          >
            <i className="fas fa-pen" />
          </button>
          {/* Mic — placeholder, non-functional */}
          <button
            className="stx-shell-ai-mic"
            title="Voice input"
            disabled
            aria-disabled="true"
          >
            <i className="fas fa-microphone" />
          </button>
          {/* Gear / settings — placeholder */}
          <button
            className="stx-shell-ai-input-btn stx-shell-ai-gear-btn"
            title="Chat settings"
            disabled
            aria-disabled="true"
          >
            <i className="fas fa-cog" />
          </button>
        </div>
        {/* Hidden send button (kept for JS compatibility) */}
        <button
          className="stx-shell-ai-send"
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
        />
      </div>
    </>
  );
};
