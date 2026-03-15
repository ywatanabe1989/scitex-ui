/**
 * LocalTerminalBackend — connects to a local WebSocket pty server.
 *
 * For standalone apps. The Python server spawns bash via pty.fork()
 * and bridges I/O over WebSocket.
 *
 * Usage:
 *   const backend = new LocalTerminalBackend("ws://localhost:5050/ws/terminal/");
 *   <Terminal backend={backend} />
 */

import type { TerminalBackend } from "../../workspace/types";

export class LocalTerminalBackend implements TerminalBackend {
  private ws: WebSocket | null = null;
  private url: string;
  private dataCallback: ((data: string) => void) | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(config: { rows: number; cols: number }): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.connected = true;
      // Send initial size
      this.ws?.send(`resize:${config.rows}:${config.cols}`);
    };

    this.ws.onmessage = (event) => {
      this.dataCallback?.(event.data);
    };

    this.ws.onclose = () => {
      this.connected = false;
      // Auto-reconnect after 3s
      this.reconnectTimer = setTimeout(() => {
        if (!this.connected) this.connect(config);
      }, 3000);
    };

    this.ws.onerror = () => {
      // Will trigger onclose
    };
  }

  send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  resize(rows: number, cols: number): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(`resize:${rows}:${cols}`);
    }
  }

  onData(callback: (data: string) => void): void {
    this.dataCallback = callback;
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }
}
