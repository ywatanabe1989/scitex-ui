/**
 * Pane — renders a div with data-pane attributes.
 *
 * PaneLayoutHandler reads these attributes to configure the layout.
 * This component is purely declarative — no resize logic.
 */

import React from "react";

interface PaneProps {
  id?: string;
  fixed?: boolean;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  canCollapse?: boolean;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function Pane({
  id,
  fixed,
  width,
  height,
  minWidth,
  minHeight,
  defaultWidth,
  defaultHeight,
  canCollapse,
  as: Tag = "div",
  className,
  style,
  children,
}: PaneProps): React.ReactElement {
  const attrs: Record<string, string | undefined> = {
    "data-pane": "",
    ...(id ? { "data-pane-id": id, id } : {}),
    ...(fixed ? { "data-fixed": "" } : {}),
    ...(width != null ? { "data-width": String(width) } : {}),
    ...(height != null ? { "data-height": String(height) } : {}),
    ...(minWidth != null ? { "data-min-width": String(minWidth) } : {}),
    ...(minHeight != null ? { "data-min-height": String(minHeight) } : {}),
    ...(defaultWidth != null
      ? { "data-default-width": String(defaultWidth) }
      : {}),
    ...(defaultHeight != null
      ? { "data-default-height": String(defaultHeight) }
      : {}),
    ...(canCollapse ? { "data-can-collapse": "" } : {}),
  };

  return (
    // @ts-expect-error — dynamic tag + data attributes
    <Tag {...attrs} className={className} style={style}>
      {children}
    </Tag>
  );
}
