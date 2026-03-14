/**
 * PackageDocsSidebar — shared component for navigating SciTeX package docs.
 *
 * Usage:
 *   import { PackageDocsSidebar } from 'scitex_ui/ts/components/package-docs-sidebar';
 *   const sidebar = new PackageDocsSidebar({ container: '#my-sidebar' });
 */

import type {
  ApiResponse,
  PackageDocsSidebarConfig,
  PackageInfo,
} from "./types";
import {
  renderError,
  renderLoading,
  renderSidebar,
  setActive,
} from "./_PackageSidebarRenderer";

const DEFAULT_API_URL = "/apps/docs/api/packages/";

export class PackageDocsSidebar {
  private container: HTMLElement;
  private config: PackageDocsSidebarConfig;
  private packages: PackageInfo[] = [];

  constructor(config: PackageDocsSidebarConfig) {
    this.config = config;
    const el =
      typeof config.container === "string"
        ? document.querySelector<HTMLElement>(config.container)
        : config.container;

    if (!el) {
      throw new Error(
        `PackageDocsSidebar: container not found: ${config.container}`,
      );
    }
    this.container = el;
    this.init();
  }

  private async init(): Promise<void> {
    renderLoading(this.container);

    try {
      const url = this.config.apiUrl ?? DEFAULT_API_URL;
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      const data: ApiResponse = await resp.json();

      // Flatten for quick lookup
      this.packages = data.groups.flatMap((g) => g.packages);

      renderSidebar(this.container, data.groups, this.config, (pkg) => {
        this.config.onPackageSelect?.(pkg);
        this.container.dispatchEvent(
          new CustomEvent("package-select", { detail: pkg, bubbles: true }),
        );
      });
    } catch (err) {
      renderError(
        this.container,
        err instanceof Error ? err.message : "Failed to load packages",
      );
    }
  }

  /** Programmatically select a package by pip name. */
  select(pipName: string): void {
    setActive(this.container, pipName);
    const pkg = this.packages.find((p) => p.pip_name === pipName);
    if (pkg) {
      this.config.onPackageSelect?.(pkg);
    }
  }

  /** Get all loaded packages. */
  getPackages(): PackageInfo[] {
    return [...this.packages];
  }

  /** Destroy the component and clean up. */
  destroy(): void {
    this.container.innerHTML = "";
    this.packages = [];
  }
}
