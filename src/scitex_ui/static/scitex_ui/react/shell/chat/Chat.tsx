/**
 * Chat — AI chat panel with streaming responses and multi-tab sessions.
 * Uses stx-shell-ai-* CSS classes matching scitex-cloud global_ai_panel.html DOM.
 *
 * Renders as a fragment (no wrapper div). The parent (Workspace) supplies
 * the .stx-shell-ai-view wrapper so there is no nested duplication.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import type { ChatProps } from "./types";
import type { ChatMessage } from "../workspace/types";

interface ChatSession {
  id: string;
  label: string;
  messages: ChatMessage[];
}

let nextSessionId = 1;
function makeSession(): ChatSession {
  const id = `C${nextSessionId++}`;
  return { id, label: id, messages: [] };
}

export const Chat: React.FC<ChatProps> = ({
  backend,
  placeholder = "Ask anything",
  initialMessages,
  storageKey,
  onCameraClick,
  onSketchClick,
  onMicClick,
  micRecording,
}) => {
  // Multi-session state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey + ":sessions");
        if (stored) {
          const parsed = JSON.parse(stored) as ChatSession[];
          if (parsed.length > 0) {
            nextSessionId =
              Math.max(...parsed.map((s) => parseInt(s.id.slice(1)) || 0)) + 1;
            return parsed;
          }
        }
      } catch {
        /* noop */
      }
    }
    const first = makeSession();
    if (initialMessages) first.messages = initialMessages;
    return [first];
  });

  const [activeId, setActiveId] = useState<string>(() => {
    if (storageKey) {
      try {
        return (
          localStorage.getItem(storageKey + ":active") ||
          sessions[0]?.id ||
          "C1"
        );
      } catch {
        /* noop */
      }
    }
    return sessions[0]?.id || "C1";
  });

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeId) || sessions[0];
  const messages = activeSession?.messages || [];

  // Persist sessions
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(
          storageKey + ":sessions",
          JSON.stringify(sessions),
        );
        localStorage.setItem(storageKey + ":active", activeId);
      } catch {
        /* noop */
      }
    }
  }, [sessions, activeId, storageKey]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update messages for active session
  const updateMessages = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId ? { ...s, messages: updater(s.messages) } : s,
        ),
      );
    },
    [activeId],
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    updateMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    updateMessages((prev) => [...prev, assistantMsg]);

    let assistantText = "";
    try {
      for await (const chunk of backend.sendMessage(text)) {
        if (chunk.type === "text" && chunk.text) {
          assistantText += chunk.text;
          const finalText = assistantText;
          updateMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: finalText,
            };
            return updated;
          });
        } else if (chunk.type === "error") {
          assistantText += `\n[Error: ${chunk.text}]`;
          const finalText = assistantText;
          updateMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: finalText,
            };
            return updated;
          });
        }
      }
    } catch (e) {
      const errorText = assistantText || `Error: ${e}`;
      updateMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: errorText,
        };
        return updated;
      });
    }

    setStreaming(false);
    inputRef.current?.focus();
  }, [input, streaming, backend, updateMessages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const addSession = useCallback(() => {
    const session = makeSession();
    setSessions((prev) => [...prev, session]);
    setActiveId(session.id);
  }, []);

  const closeSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== id);
        if (remaining.length === 0) {
          const fresh = makeSession();
          setActiveId(fresh.id);
          return [fresh];
        }
        if (activeId === id) {
          setActiveId(remaining[remaining.length - 1].id);
        }
        return remaining;
      });
    },
    [activeId],
  );

  const clearActive = useCallback(() => {
    updateMessages(() => []);
  }, [updateMessages]);

  return (
    <>
      {/* Sessions bar — new chat + session tabs + actions */}
      <div className="stx-shell-ai-sessions-bar">
        <button
          className="stx-shell-ai-new-chat"
          title="New chat"
          onClick={addSession}
        >
          <i className="fas fa-plus" />
        </button>
        <div className="stx-shell-ai-sessions-list">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`stx-shell-ai-session-item${s.id === activeId ? " active" : ""}`}
              onClick={() => setActiveId(s.id)}
            >
              <span>{s.label}</span>
              {sessions.length > 1 && (
                <button
                  className="stx-shell-ai-session-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeSession(s.id);
                  }}
                  title="Close tab"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="stx-shell-ai-panel-actions">
          <button
            className="stx-shell-ai-action-btn"
            onClick={clearActive}
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
          <button
            className="stx-shell-ai-input-btn"
            title="Attach image"
            onClick={onCameraClick}
            disabled={!onCameraClick}
          >
            <i className="fas fa-camera" />
          </button>
          <button
            className="stx-shell-ai-input-btn"
            title="Draw sketch"
            onClick={onSketchClick}
            disabled={!onSketchClick}
          >
            <i className="fas fa-pen" />
          </button>
          <button
            className={`stx-shell-ai-mic${micRecording ? " recording" : ""}`}
            title={micRecording ? "Stop recording" : "Voice input"}
            onClick={onMicClick}
            disabled={!onMicClick}
          >
            <i className={`fas fa-microphone${micRecording ? "-slash" : ""}`} />
          </button>
          <button
            className="stx-shell-ai-input-btn stx-shell-ai-gear-btn"
            title="Chat settings"
            disabled
            aria-disabled="true"
          >
            <i className="fas fa-cog" />
          </button>
        </div>
        <button
          className="stx-shell-ai-send"
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
        />
      </div>
    </>
  );
};
