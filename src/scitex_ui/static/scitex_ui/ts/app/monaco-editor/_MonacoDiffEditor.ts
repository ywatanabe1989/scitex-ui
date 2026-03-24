/**
 * MonacoDiffEditor — scitex-ui
 * Side-by-side or inline diff visualization using Monaco's diff editor.
 */

import { BaseComponent } from "../../_base/BaseComponent";
import type { MonacoDiffEditorConfig } from "./types";
import { detectLanguage } from "./types";
import { MONACO_EDITOR_DEFAULTS } from "./_MonacoDefaults";
import {
  initializeMonacoThemes,
  setupMonacoThemeObserver,
  getCurrentThemeMode,
  getThemeForMode,
} from "./_MonacoTheme";
import { waitForMonaco } from "./_MonacoLoader";

export class MonacoDiffEditor extends BaseComponent<MonacoDiffEditorConfig> {
  private diffEditor: any = null;
  private monacoInstance: any = null;
  private originalModel: any = null;
  private modifiedModel: any = null;

  constructor(config: MonacoDiffEditorConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    this.monacoInstance = await waitForMonaco();
    const monaco = this.monacoInstance;

    initializeMonacoThemes(monaco);
    setupMonacoThemeObserver(monaco);

    const theme = this.config.theme || getThemeForMode(getCurrentThemeMode());

    const language = this.config.language || "plaintext";

    this.diffEditor = monaco.editor.createDiffEditor(this.container, {
      automaticLayout: MONACO_EDITOR_DEFAULTS.automaticLayout,
      fontSize: MONACO_EDITOR_DEFAULTS.fontSize,
      fontFamily: MONACO_EDITOR_DEFAULTS.fontFamily,
      readOnly: this.config.readOnly ?? true,
      theme,
      renderSideBySide: this.config.renderSideBySide ?? true,
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      glyphMargin: true,
      folding: true,
    });

    // Create models
    this.originalModel = monaco.editor.createModel(
      this.config.original || "",
      language,
    );
    this.modifiedModel = monaco.editor.createModel(
      this.config.modified || "",
      language,
    );

    this.diffEditor.setModel({
      original: this.originalModel,
      modified: this.modifiedModel,
    });

    this.emit("monaco-diff-editor:initialized", {
      diffEditor: this.diffEditor,
    });
  }

  getDiffEditor(): any {
    return this.diffEditor;
  }

  setOriginal(content: string): void {
    if (this.originalModel) {
      this.originalModel.setValue(content);
    }
  }

  setModified(content: string): void {
    if (this.modifiedModel) {
      this.modifiedModel.setValue(content);
    }
  }

  setLanguage(language: string): void {
    if (this.monacoInstance) {
      if (this.originalModel) {
        this.monacoInstance.editor.setModelLanguage(
          this.originalModel,
          language,
        );
      }
      if (this.modifiedModel) {
        this.monacoInstance.editor.setModelLanguage(
          this.modifiedModel,
          language,
        );
      }
    }
  }

  detectLanguage(filePath: string, content?: string): string {
    return detectLanguage(filePath, content);
  }

  toggleSideBySide(): void {
    if (!this.diffEditor) return;
    const current = this.diffEditor.getOption(
      this.monacoInstance.editor.EditorOption.renderSideBySide,
    );
    this.diffEditor.updateOptions({ renderSideBySide: !current });
  }

  destroy(): void {
    if (this.originalModel) {
      this.originalModel.dispose();
      this.originalModel = null;
    }
    if (this.modifiedModel) {
      this.modifiedModel.dispose();
      this.modifiedModel = null;
    }
    if (this.diffEditor) {
      this.diffEditor.dispose();
      this.diffEditor = null;
    }
    this.monacoInstance = null;
    super.destroy();
  }
}
