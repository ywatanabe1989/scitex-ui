/**
 * ModuleTabBar — vertical icon bar for switching between workspace modules.
 * Only rendered when the Workspace receives a `modules` prop.
 */

import React from "react";
import type { ModuleConfig } from "./types";

const CLS = "stx-workspace__module-tabs";

interface ModuleTabBarProps {
  modules: ModuleConfig[];
  activeModule?: string;
  onModuleChange?: (name: string) => void;
}

export const ModuleTabBar: React.FC<ModuleTabBarProps> = ({
  modules,
  activeModule,
  onModuleChange,
}) => {
  return (
    <nav className={CLS} role="tablist" aria-label="Workspace modules">
      {modules.map((mod) => {
        const isActive = mod.name === activeModule;
        return (
          <button
            key={mod.name}
            className={`${CLS}__tab${isActive ? ` ${CLS}__tab--active` : ""}`}
            role="tab"
            aria-selected={isActive}
            title={`${mod.label}${mod.shortcut ? ` (Alt+${mod.shortcut.toUpperCase()})` : ""}`}
            style={
              isActive && mod.accentColor
                ? ({ "--tab-accent": mod.accentColor } as React.CSSProperties)
                : undefined
            }
            onClick={() => onModuleChange?.(mod.name)}
          >
            <i className={mod.icon} />
            <span className={`${CLS}__label`}>{mod.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
