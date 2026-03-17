export { PaneLayoutHandler } from "./PaneLayoutHandler";

/** Auto-initialize all [data-pane-layout] containers on the page. */
export function autoInitPaneLayouts(): PaneLayoutHandler[] {
  const containers = document.querySelectorAll<HTMLElement>(
    "[data-pane-layout]:not([data-pane-layout-initialized])",
  );
  const handlers: PaneLayoutHandler[] = [];
  for (const el of containers) {
    el.setAttribute("data-pane-layout-initialized", "");
    handlers.push(new PaneLayoutHandler(el));
  }
  return handlers;
}
