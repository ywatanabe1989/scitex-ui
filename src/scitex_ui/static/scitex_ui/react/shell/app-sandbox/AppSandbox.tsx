/**
 * AppSandbox — Shadow DOM isolation for third-party apps.
 *
 * Creates a shadow root that prevents app CSS from leaking into the shell.
 * Theme variables are injected via :host CSS custom properties.
 *
 * Usage:
 *   <AppSandbox darkMode={true} onMount={(container) => mountMyApp(container)}>
 *     {/* children render inside shadow DOM *​/}
 *   </AppSandbox>
 */

import React, { useCallback, useEffect, useRef } from "react";

/** Theme variables injected into :host */
const THEME_VARS_DARK = {
  "--bg-primary": "#1e1e2e",
  "--bg-secondary": "#2a2a3e",
  "--bg-tertiary": "#313145",
  "--text-primary": "#e0e0e0",
  "--text-secondary": "#a0a0b0",
  "--text-muted": "#6c6c7c",
  "--border-color": "#3a3a4e",
  "--accent-primary": "#7c5cbf",
  "--accent-hover": "#9370db",
  "--error": "#e74c3c",
  "--success": "#2ecc71",
  "--warning": "#f39c12",
};

const THEME_VARS_LIGHT = {
  "--bg-primary": "#ffffff",
  "--bg-secondary": "#f5f5f5",
  "--bg-tertiary": "#e8e8e8",
  "--text-primary": "#1a1a2e",
  "--text-secondary": "#4a4a5e",
  "--text-muted": "#8a8a9e",
  "--border-color": "#d0d0d8",
  "--accent-primary": "#5b3d99",
  "--accent-hover": "#7c5cbf",
  "--error": "#c0392b",
  "--success": "#27ae60",
  "--warning": "#e67e22",
};

export interface AppSandboxProps {
  /** Dark mode theme */
  darkMode?: boolean;
  /** Called when the shadow container is ready for app mounting */
  onMount?: (container: HTMLDivElement) => void;
  /** Called on unmount for cleanup */
  onUnmount?: () => void;
  /** Optional CSS text to inject into the shadow DOM */
  appCss?: string;
  /** Optional CSS URLs to load into the shadow DOM */
  appCssUrls?: string[];
  /** Additional class on the host element */
  className?: string;
}

/**
 * Shadow DOM container for third-party apps.
 *
 * All app content renders inside a shadow root, completely
 * isolated from the workspace shell CSS.
 */
export function AppSandbox({
  darkMode = true,
  onMount,
  onUnmount,
  appCss,
  appCssUrls,
  className,
}: AppSandboxProps): React.ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  // Create shadow DOM on mount
  useEffect(() => {
    const host = hostRef.current;
    if (!host || shadowRef.current) return;

    // Attach shadow root
    const shadow = host.attachShadow({ mode: "open" });
    shadowRef.current = shadow;

    // Inject theme variables
    const themeVars = darkMode ? THEME_VARS_DARK : THEME_VARS_LIGHT;
    const themeStyle = document.createElement("style");
    themeStyle.textContent = `:host {
${Object.entries(themeVars)
  .map(([k, v]) => `  ${k}: ${v};`)
  .join("\n")}
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
* { box-sizing: border-box; }
`;
    shadow.appendChild(themeStyle);

    // Inject app CSS URLs
    if (appCssUrls) {
      for (const url of appCssUrls) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        shadow.appendChild(link);
      }
    }

    // Inject inline app CSS
    if (appCss) {
      const style = document.createElement("style");
      style.textContent = appCss;
      shadow.appendChild(style);
    }

    // Create mount container inside shadow
    const container = document.createElement("div");
    container.id = "app-root";
    container.style.width = "100%";
    container.style.height = "100%";
    shadow.appendChild(container);
    containerRef.current = container;

    // Set up MutationObserver to detect DOM escapes
    observerRef.current = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement && node !== host) {
            // Check if app added elements outside shadow DOM
            if (
              node.closest("[data-app-sandbox]") === null &&
              host.parentElement?.contains(node)
            ) {
              console.warn(
                "[AppSandbox] DOM escape detected: app added element outside shadow root",
                node,
              );
            }
          }
        }
      }
    });
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: false,
    });

    // Notify consumer
    if (onMount) {
      onMount(container);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (onUnmount) {
        onUnmount();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update theme when darkMode changes
  useEffect(() => {
    const shadow = shadowRef.current;
    if (!shadow) return;

    const themeVars = darkMode ? THEME_VARS_DARK : THEME_VARS_LIGHT;
    const styleEl = shadow.querySelector("style");
    if (styleEl) {
      styleEl.textContent = `:host {
${Object.entries(themeVars)
  .map(([k, v]) => `  ${k}: ${v};`)
  .join("\n")}
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
* { box-sizing: border-box; }
`;
    }
  }, [darkMode]);

  return (
    <div
      ref={hostRef}
      data-app-sandbox="true"
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

/**
 * Mount an app into an AppSandbox container.
 *
 * Generic mount function that works with any app following the SciTeX contract.
 */
export interface AppMountConfig {
  /** DOM container inside the shadow root */
  container: HTMLDivElement;
  /** Project working directory */
  workingDir?: string;
  /** Dark mode preference */
  darkMode?: boolean;
  /** API base URL for the app */
  apiBaseUrl?: string;
}

export type AppMountFunction = (config: AppMountConfig) => void;
export type AppUnmountFunction = () => void;

export default AppSandbox;
