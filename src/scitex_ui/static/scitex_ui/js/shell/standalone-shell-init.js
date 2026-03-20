/** Standalone shell initialization.
 *  Loaded by standalone_shell.html after DOM is ready.
 *
 *  Wires:
 *  - Console/Chat mode toggle
 *  - Toolbar buttons (camera, sketch, mic) → custom DOM events
 *  - Config popover gear toggle (direct, like scitex-cloud)
 *  - Sidebar header double-click → collapse
 *
 *  Apps listen for these events to implement actual functionality:
 *    window.addEventListener("stx-shell:camera", handler)
 *    window.addEventListener("stx-shell:sketch", handler)
 *    window.addEventListener("stx-shell:mic-toggle", handler)
 *    window.addEventListener("stx-shell:settings", handler)
 */

(function () {
  "use strict";

  /* ── Console/Chat mode toggle ─────────────────────── */
  document.querySelectorAll(".stx-shell-ai-mode-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.dataset.mode;
      document.querySelectorAll(".stx-shell-ai-mode-btn").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      document.querySelectorAll(".stx-shell-ai-view").forEach(function (v) {
        v.classList.remove("active");
      });
      var target = document.getElementById(
        mode === "chat"
          ? "stx-shell-ai-chat-view"
          : "stx-shell-ai-console-view",
      );
      if (target) target.classList.add("active");
    });
  });

  /* ── Config popover gear toggle ────────────────────── */
  var gearBtn = document.querySelector(".stx-shell-ai-gear-btn");
  var configPopover = document.getElementById("stx-shell-ai-console-config");

  if (gearBtn && configPopover) {
    gearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      // Close all other popovers first
      document
        .querySelectorAll(".stx-shell-ai-config-popover")
        .forEach(function (p) {
          if (p !== configPopover) p.classList.add("stx-hidden");
        });
      // Toggle this popover
      configPopover.classList.toggle("stx-hidden");
      // Also dispatch event for app-level handlers (e.g., populate skills)
      window.dispatchEvent(new CustomEvent("stx-shell:settings"));
    });

    // Click-outside to close
    document.addEventListener("mousedown", function (e) {
      if (
        configPopover &&
        !configPopover.classList.contains("stx-hidden") &&
        !configPopover.contains(e.target) &&
        !gearBtn.contains(e.target)
      ) {
        configPopover.classList.add("stx-hidden");
      }
    });
  }

  /* ── Toolbar buttons → custom events ──────────────── */
  var toolbarBtns = document.querySelectorAll(".stx-shell-ai-input-btn");
  toolbarBtns.forEach(function (btn) {
    if (btn.disabled) return;
    var title = (btn.getAttribute("title") || "").toLowerCase();
    var eventName = null;

    if (title.indexOf("webcam") >= 0 || title.indexOf("camera") >= 0) {
      eventName = "stx-shell:camera";
    } else if (title.indexOf("sketch") >= 0 || title.indexOf("draw") >= 0) {
      eventName = "stx-shell:sketch";
    } else if (title.indexOf("voice") >= 0 || title.indexOf("mic") >= 0) {
      eventName = "stx-shell:mic-toggle";
    }
    // Settings/config handled by gear toggle above — skip

    if (eventName) {
      btn.addEventListener("click", function () {
        window.dispatchEvent(new CustomEvent(eventName));
      });
    }
  });

  /* ── Keyboard shortcuts button → toggle modal ────────── */
  var shortcutsBtn = document.getElementById("stx-shell-shortcuts-btn");
  if (shortcutsBtn) {
    shortcutsBtn.addEventListener("click", function () {
      if (typeof window.toggleShortcutsModal === "function") {
        window.toggleShortcutsModal();
      }
    });
  }
})();
