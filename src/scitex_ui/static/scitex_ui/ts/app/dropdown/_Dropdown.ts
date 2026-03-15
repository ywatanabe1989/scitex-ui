/**
 * Dropdown — context menu attached to a trigger element.
 *
 * Usage:
 *   import { Dropdown } from 'scitex_ui/ts/app/dropdown';
 *   const menu = new Dropdown({
 *     container: '#menu-container',
 *     trigger: '#menu-btn',
 *     items: [
 *       { id: 'copy', label: 'Copy', icon: 'fas fa-copy' },
 *       { id: 'sep', label: '', separator: true },
 *       { id: 'delete', label: 'Delete', icon: 'fas fa-trash' },
 *     ],
 *     onSelect: (item) => console.log(item.id),
 *   });
 */

import { BaseComponent } from "../../_base/BaseComponent";
import type { DropdownConfig, DropdownItem } from "./types";

const CLS = "stx-app-dropdown";

export class Dropdown extends BaseComponent<DropdownConfig> {
  private triggerEl: HTMLElement;
  private menuEl: HTMLElement | null = null;
  private open = false;
  private outsideClickHandler: (e: MouseEvent) => void;

  constructor(config: DropdownConfig) {
    super(config);

    this.triggerEl =
      typeof config.trigger === "string"
        ? (document.querySelector<HTMLElement>(config.trigger) as HTMLElement)
        : config.trigger;

    if (!this.triggerEl) {
      throw new Error(`Dropdown: trigger not found: ${config.trigger}`);
    }

    this.outsideClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        this.open &&
        !this.container.contains(target) &&
        !this.triggerEl.contains(target)
      ) {
        this.close();
      }
    };

    this.triggerEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    document.addEventListener("click", this.outsideClickHandler);
  }

  /** Open the dropdown. */
  show(): void {
    if (this.open) return;
    this.open = true;
    this.renderMenu();
    this.container.style.display = "block";
    this.positionMenu();
  }

  /** Close the dropdown. */
  close(): void {
    if (!this.open) return;
    this.open = false;
    this.container.style.display = "none";
  }

  /** Toggle open/close. */
  toggle(): void {
    this.open ? this.close() : this.show();
  }

  /** Update items dynamically. */
  setItems(items: DropdownItem[]): void {
    this.config.items = items;
    if (this.open) this.renderMenu();
  }

  override destroy(): void {
    document.removeEventListener("click", this.outsideClickHandler);
    super.destroy();
  }

  private renderMenu(): void {
    this.container.innerHTML = "";
    this.container.className = CLS;

    const menu = document.createElement("ul");
    menu.className = `${CLS}__menu`;

    for (const item of this.config.items) {
      if (item.separator) {
        const sep = document.createElement("li");
        sep.className = `${CLS}__separator`;
        menu.appendChild(sep);
        continue;
      }

      const li = document.createElement("li");
      li.className = `${CLS}__item`;
      if (item.disabled) li.classList.add(`${CLS}__item--disabled`);

      if (item.icon) {
        const icon = document.createElement("i");
        icon.className = item.icon;
        li.appendChild(icon);
      }

      const label = document.createElement("span");
      label.textContent = item.label;
      li.appendChild(label);

      if (!item.disabled) {
        li.addEventListener("click", (e) => {
          e.stopPropagation();
          this.close();
          item.onClick?.();
          this.config.onSelect?.(item);
        });
      }

      menu.appendChild(li);
    }

    this.container.appendChild(menu);
    this.menuEl = menu;
  }

  private positionMenu(): void {
    const rect = this.triggerEl.getBoundingClientRect();
    this.container.style.position = "absolute";
    this.container.style.top = `${rect.bottom + window.scrollY}px`;

    if (this.config.align === "right") {
      this.container.style.right = `${window.innerWidth - rect.right}px`;
      this.container.style.left = "auto";
    } else {
      this.container.style.left = `${rect.left + window.scrollX}px`;
      this.container.style.right = "auto";
    }

    this.container.style.zIndex = "100";
  }
}
