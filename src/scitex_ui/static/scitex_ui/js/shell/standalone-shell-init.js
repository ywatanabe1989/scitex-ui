/** Standalone shell initialization.
 *  Loaded by standalone_shell.html after DOM is ready.
 *
 *  Wires:
 *  - Console/Chat mode toggle
 *  - Toolbar buttons (camera, sketch, mic) → custom DOM events
 *  - Sidebar header double-click → collapse
 *
 *  Apps listen for these events to implement actual functionality:
 *    window.addEventListener("stx-shell:camera", handler)
 *    window.addEventListener("stx-shell:sketch", handler)
 *    window.addEventListener("stx-shell:mic-toggle", handler)
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
    } else if (title.indexOf("settings") >= 0 || title.indexOf("config") >= 0) {
      eventName = "stx-shell:settings";
    }

    if (eventName) {
      btn.addEventListener("click", function () {
        window.dispatchEvent(new CustomEvent(eventName));
      });
    }
  });
})();
