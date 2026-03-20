/**
 * Config Mode — Settings panel for the AI chat shell.
 *
 * Renders MCP tool toggles, skills, and settings in the config tab.
 * Ported from scitex-cloud's config-mode.ts with ConfigAdapter for
 * backend abstraction.
 */

/** Adapter for loading/saving config data. */
export interface ConfigAdapter {
  /** Fetch MCP tool groups with enabled states. */
  fetchMcpPrefs?(): Promise<McpPrefsGroup[]>;
  /** Save MCP preferences. */
  saveMcpPrefs?(prefs: Record<string, boolean>): Promise<void>;
  /** Fetch skills info. */
  fetchSkills?(): Promise<Record<string, SkillInfo>>;
}

export interface McpPrefsGroup {
  name: string;
  display: string;
  icon: string;
  desc: string;
  enabled: boolean;
  tool_count: number;
}

export interface SkillInfo {
  name: string;
  description: string;
  icon?: string;
  enabled?: boolean;
}

export class ConfigMode {
  private adapter: ConfigAdapter;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(adapter: ConfigAdapter = {}) {
    this.adapter = adapter;
  }

  /** Populate the config panel container. */
  async populate(container: HTMLElement): Promise<void> {
    try {
      let html = "";

      // MCP Tools section
      if (this.adapter.fetchMcpPrefs) {
        const groups = await this.adapter.fetchMcpPrefs();
        html += this.renderMcpGroups(groups);
      }

      // Skills section
      if (this.adapter.fetchSkills) {
        const skills = await this.adapter.fetchSkills();
        html += this.renderSkills(skills);
      }

      if (!html) {
        html =
          '<div class="stx-shell-config-empty">No configuration available</div>';
      }

      // Toast element for save feedback
      html +=
        '<div id="stx-shell-config-toast" class="stx-shell-config-toast">Saved</div>';

      container.innerHTML = html;
      this.bindToggles(container);
    } catch (err) {
      container.innerHTML = `<div class="stx-shell-config-error"><i class="fas fa-exclamation-triangle"></i> Failed to load config: ${err instanceof Error ? err.message : "unknown"}</div>`;
    }
  }

  private renderMcpGroups(groups: McpPrefsGroup[]): string {
    if (groups.length === 0) return "";
    const onCount = groups.filter((g) => g.enabled).length;
    let html = `<div class="stx-shell-config-category" data-cat="MCP Tools">`;
    html += `<div class="stx-shell-config-header" style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-bottom:1px solid var(--border-default,#30363d);">`;
    html += `<i class="fas fa-chevron-right stx-shell-config-chevron" style="transition:transform 0.2s;font-size:10px;"></i>`;
    html += `<span style="font-weight:600;font-size:12px;">MCP Tools</span>`;
    html += `<span style="font-size:11px;color:var(--fg-muted,#8b949e);margin-left:auto;">${onCount}/${groups.length} enabled</span>`;
    html += `</div><div class="stx-shell-config-grid" style="display:none;padding:8px;gap:6px;">`;

    for (const g of groups) {
      const cls = g.enabled ? "enabled" : "";
      html += `<label class="stx-shell-config-card ${cls}" data-group="${g.name}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;border:1px solid var(--border-default,#30363d);cursor:pointer;">`;
      html += `<i class="fas ${g.icon || "fa-puzzle-piece"}" style="width:16px;text-align:center;color:var(--fg-muted,#8b949e);"></i>`;
      html += `<div style="flex:1;min-width:0;">`;
      html += `<div style="font-size:12px;font-weight:500;">${g.display || g.name}</div>`;
      html += `<div style="font-size:10px;color:var(--fg-muted,#8b949e);">${g.desc || ""} (${g.tool_count} tools)</div>`;
      html += `</div>`;
      html += `<input type="checkbox" ${g.enabled ? "checked" : ""} style="cursor:pointer;" />`;
      html += `</label>`;
    }

    html += `</div></div>`;
    return html;
  }

  private renderSkills(skills: Record<string, SkillInfo>): string {
    const entries = Object.entries(skills);
    if (entries.length === 0) return "";
    const onCount = entries.filter(([, s]) => s.enabled !== false).length;
    let html = `<div class="stx-shell-config-category" data-cat="Skills">`;
    html += `<div class="stx-shell-config-header" style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-bottom:1px solid var(--border-default,#30363d);">`;
    html += `<i class="fas fa-chevron-right stx-shell-config-chevron" style="transition:transform 0.2s;font-size:10px;"></i>`;
    html += `<span style="font-weight:600;font-size:12px;">Skills</span>`;
    html += `<span style="font-size:11px;color:var(--fg-muted,#8b949e);margin-left:auto;">${onCount}/${entries.length}</span>`;
    html += `</div><div class="stx-shell-config-grid" style="display:none;padding:8px;gap:6px;">`;

    for (const [name, skill] of entries) {
      const enabled = skill.enabled !== false;
      const cls = enabled ? "enabled" : "";
      html += `<label class="stx-shell-config-card stx-shell-config-skill ${cls}" data-skill="${name}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;border:1px solid var(--border-default,#30363d);cursor:pointer;">`;
      html += `<i class="fas ${skill.icon || "fa-bolt"}" style="width:16px;text-align:center;color:var(--fg-muted,#8b949e);"></i>`;
      html += `<div style="flex:1;min-width:0;">`;
      html += `<div style="font-size:12px;font-weight:500;">${skill.name || name}</div>`;
      html += `<div style="font-size:10px;color:var(--fg-muted,#8b949e);">${skill.description || ""}</div>`;
      html += `</div>`;
      html += `<input type="checkbox" ${enabled ? "checked" : ""} style="cursor:pointer;" />`;
      html += `</label>`;
    }

    html += `</div></div>`;
    return html;
  }

  private bindToggles(container: HTMLElement): void {
    // Category expand/collapse
    container
      .querySelectorAll<HTMLElement>(".stx-shell-config-header")
      .forEach((header) => {
        header.addEventListener("click", () => {
          const cat = header.closest(".stx-shell-config-category");
          if (!cat) return;
          const grid = cat.querySelector<HTMLElement>(".stx-shell-config-grid");
          const chevron = header.querySelector<HTMLElement>(
            ".stx-shell-config-chevron",
          );
          if (grid) {
            const visible = grid.style.display !== "none";
            grid.style.display = visible ? "none" : "grid";
            if (chevron)
              chevron.style.transform = visible ? "" : "rotate(90deg)";
          }
        });
      });

    // MCP group toggles
    container.querySelectorAll<HTMLElement>("[data-group]").forEach((card) => {
      const cb = card.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (!cb) return;
      cb.addEventListener("change", () => {
        card.classList.toggle("enabled", cb.checked);
        this.debouncedSaveMcp(container);
      });
    });

    // Skill toggles
    container.querySelectorAll<HTMLElement>("[data-skill]").forEach((card) => {
      const cb = card.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (!cb) return;
      cb.addEventListener("change", () => {
        card.classList.toggle("enabled", cb.checked);
        this.saveSkillPrefs(container);
        this.showToast();
      });
    });
  }

  private debouncedSaveMcp(container: HTMLElement): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(async () => {
      if (!this.adapter.saveMcpPrefs) return;
      const prefs: Record<string, boolean> = {};
      container
        .querySelectorAll<HTMLElement>("[data-group]")
        .forEach((card) => {
          const name = card.getAttribute("data-group");
          const cb = card.querySelector<HTMLInputElement>(
            'input[type="checkbox"]',
          );
          if (name && cb) prefs[name] = cb.checked;
        });
      try {
        await this.adapter.saveMcpPrefs(prefs);
        this.showToast();
      } catch {
        console.error("[ConfigMode] Failed to save MCP preferences");
      }
    }, 500);
  }

  private saveSkillPrefs(container: HTMLElement): void {
    const prefs: Record<string, boolean> = {};
    container.querySelectorAll<HTMLElement>("[data-skill]").forEach((card) => {
      const name = card.getAttribute("data-skill");
      const cb = card.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (name && cb) prefs[name] = cb.checked;
    });
    try {
      localStorage.setItem("stx-shell-skill-prefs", JSON.stringify(prefs));
    } catch {}
  }

  private showToast(): void {
    const toast = document.getElementById("stx-shell-config-toast");
    if (!toast) return;
    toast.style.cssText =
      "position:fixed;bottom:16px;right:16px;background:var(--color-accent-fg,#58a6ff);color:#fff;padding:6px 16px;border-radius:4px;font-size:12px;opacity:1;transition:opacity 0.3s;z-index:10000;";
    setTimeout(() => {
      toast.style.opacity = "0";
    }, 1500);
  }
}
