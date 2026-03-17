/**
 * PaneLayout — thin React wrapper around PaneLayoutHandler.
 *
 * Renders a flex container with data-pane-layout attribute.
 * The pure TS PaneLayoutHandler takes over after mount — no React
 * state for widths, no re-renders during drag. Smooth.
 */

import React, { useEffect, useRef } from "react";
import { PaneLayoutHandler } from "../../../ts/app/pane-layout/PaneLayoutHandler";

interface PaneLayoutProps {
  storagePrefix: string;
  direction?: "horizontal" | "vertical";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function PaneLayout({
  storagePrefix,
  direction = "horizontal",
  className,
  style,
  children,
}: PaneLayoutProps): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const handlerRef = useRef<PaneLayoutHandler | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Small delay to let children render their data-pane attributes
    const timer = requestAnimationFrame(() => {
      if (ref.current && !handlerRef.current) {
        handlerRef.current = new PaneLayoutHandler(ref.current);
      }
    });
    return () => {
      cancelAnimationFrame(timer);
      handlerRef.current?.destroy();
      handlerRef.current = null;
    };
  }, []);

  return (
    <div
      ref={ref}
      data-pane-layout={storagePrefix}
      data-direction={direction}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    >
      {children}
    </div>
  );
}
