/** Standalone shell initialization — console/chat mode toggle.
 *  Loaded by standalone_shell.html after DOM is ready. */

(function () {
  "use strict";

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
})();
