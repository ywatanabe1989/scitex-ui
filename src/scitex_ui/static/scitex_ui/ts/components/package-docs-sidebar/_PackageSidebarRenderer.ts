/**
 * DOM rendering logic for PackageDocsSidebar.
 * Separated to keep main class under file size limits.
 */

import type {
  PackageGroup,
  PackageInfo,
  PackageDocsSidebarConfig,
} from "./types";

const CLS = "stx-pkg-sidebar";

export function renderLoading(container: HTMLElement): void {
  container.innerHTML =
    `<div class="${CLS}__loading">` +
    `<i class="fas fa-spinner fa-spin"></i> Loading packages...` +
    `</div>`;
}

export function renderError(container: HTMLElement, message: string): void {
  container.innerHTML =
    `<div class="${CLS}__error">` +
    `<i class="fas fa-exclamation-triangle"></i> ${message}` +
    `</div>`;
}

export function renderSidebar(
  container: HTMLElement,
  groups: PackageGroup[],
  config: PackageDocsSidebarConfig,
  onClick: (pkg: PackageInfo) => void,
): void {
  container.innerHTML = "";
  const nav = document.createElement("nav");
  nav.className = `${CLS}`;

  for (const group of groups) {
    if (config.showGroups !== false) {
      const header = document.createElement("div");
      header.className = `${CLS}__group-header`;
      header.textContent = group.label;
      nav.appendChild(header);
    }

    for (const pkg of group.packages) {
      const item = document.createElement("a");
      item.href = "#";
      item.className = `${CLS}__item`;
      item.dataset.pipName = pkg.pip_name;

      const icon = document.createElement("i");
      icon.className = pkg.has_sphinx ? "fas fa-book" : "fas fa-cube";

      const label = document.createElement("span");
      label.className = `${CLS}__label`;
      label.textContent = pkg.pip_name;

      item.appendChild(icon);
      item.appendChild(label);

      if (config.showVersions !== false && pkg.version) {
        const badge = document.createElement("span");
        badge.className = `${CLS}__version`;
        badge.textContent = `v${pkg.version}`;
        item.appendChild(badge);
      }

      item.addEventListener("click", (e) => {
        e.preventDefault();
        // Update active state
        nav
          .querySelectorAll(`.${CLS}__item`)
          .forEach((el) => el.classList.remove(`${CLS}__item--active`));
        item.classList.add(`${CLS}__item--active`);
        onClick(pkg);
      });

      nav.appendChild(item);
    }
  }

  container.appendChild(nav);
}

export function setActive(container: HTMLElement, pipName: string): void {
  const cls = `${CLS}__item--active`;
  container.querySelectorAll(`.${CLS}__item`).forEach((el) => {
    el.classList.toggle(cls, (el as HTMLElement).dataset.pipName === pipName);
  });
}
