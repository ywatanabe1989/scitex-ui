/**
 * DOM rendering logic for FileBrowser.
 */

import type { FileNode, FileBrowserConfig } from "./types";

const CLS = "stx-app-file-browser";

export function renderLoading(container: HTMLElement): void {
  container.innerHTML =
    `<div class="${CLS}__loading">` +
    `<i class="fas fa-spinner fa-spin"></i> Loading files...` +
    `</div>`;
}

export function renderError(container: HTMLElement, message: string): void {
  container.innerHTML =
    `<div class="${CLS}__error">` +
    `<i class="fas fa-exclamation-triangle"></i> ${message}` +
    `</div>`;
}

export function renderEmpty(container: HTMLElement): void {
  container.innerHTML = `<div class="${CLS}__empty">No files to display</div>`;
}

export function renderTree(
  container: HTMLElement,
  nodes: FileNode[],
  config: FileBrowserConfig,
  expandedDirs: Set<string>,
  onToggleDir: (path: string) => void,
): void {
  container.innerHTML = "";
  const nav = document.createElement("nav");
  nav.className = CLS;

  renderNodes(nav, nodes, 0, config, expandedDirs, onToggleDir);

  if (nav.children.length === 0) {
    renderEmpty(container);
    return;
  }
  container.appendChild(nav);
}

function renderNodes(
  parent: HTMLElement,
  nodes: FileNode[],
  depth: number,
  config: FileBrowserConfig,
  expandedDirs: Set<string>,
  onToggleDir: (path: string) => void,
): void {
  const sorted = [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const node of sorted) {
    if (!config.showHidden && node.name.startsWith(".")) continue;

    if (node.type === "file" && config.extensions) {
      const ext = "." + node.name.split(".").pop();
      if (!config.extensions.includes(ext)) continue;
    }

    const item = document.createElement("div");
    item.className = `${CLS}__item`;
    item.setAttribute("data-depth", String(Math.min(depth, 5)));
    item.setAttribute("data-path", node.path);

    if (node.type === "directory") {
      item.classList.add(`${CLS}__item--directory`);
      const expanded = expandedDirs.has(node.path);

      const chevron = document.createElement("i");
      chevron.className = `${CLS}__chevron fas fa-chevron-right`;
      if (expanded) chevron.classList.add(`${CLS}__chevron--expanded`);
      item.appendChild(chevron);

      const icon = document.createElement("i");
      icon.className = expanded ? "fas fa-folder-open" : "fas fa-folder";
      item.appendChild(icon);

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        onToggleDir(node.path);
      });
    } else {
      const icon = document.createElement("i");
      icon.className = getFileIcon(node.name);
      item.appendChild(icon);

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        parent
          .querySelectorAll(`.${CLS}__item`)
          .forEach((el) => el.classList.remove(`${CLS}__item--active`));
        item.classList.add(`${CLS}__item--active`);
        config.onFileSelect?.(node);
      });
    }

    const label = document.createElement("span");
    label.className = `${CLS}__label`;
    label.textContent = node.name;
    item.appendChild(label);
    parent.appendChild(item);

    if (
      node.type === "directory" &&
      expandedDirs.has(node.path) &&
      node.children
    ) {
      renderNodes(
        parent,
        node.children,
        depth + 1,
        config,
        expandedDirs,
        onToggleDir,
      );
    }
  }
}

function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    py: "fab fa-python",
    ts: "fas fa-code",
    js: "fab fa-js",
    css: "fab fa-css3-alt",
    html: "fab fa-html5",
    json: "fas fa-braces",
    yaml: "fas fa-file-code",
    yml: "fas fa-file-code",
    md: "fas fa-file-lines",
    png: "fas fa-image",
    jpg: "fas fa-image",
    svg: "fas fa-image",
    pdf: "fas fa-file-pdf",
  };
  return map[ext ?? ""] ?? "fas fa-file";
}

export function setActive(container: HTMLElement, path: string): void {
  const cls = `${CLS}__item--active`;
  container.querySelectorAll(`.${CLS}__item`).forEach((el) => {
    el.classList.toggle(
      cls,
      (el as HTMLElement).getAttribute("data-path") === path,
    );
  });
}
