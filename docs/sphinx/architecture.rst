Architecture
============

scitex-ui components are organized into two categories:

Shell Components (``stx-shell-*``)
-----------------------------------

Workspace-level framing that wraps the entire application.

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Component
     - Description
   * - **ThemeProvider**
     - Manages ``data-theme`` attribute on ``<html>``, persists to localStorage. Provides ``toggle()``, ``setTheme()``, ``getTheme()`` API.
   * - **AppShell**
     - Creates the workspace layout: collapsible sidebar + main content area. Supports preset and custom app accent colors via ``--stx-app-accent`` CSS variable.
   * - **StatusBar**
     - Bottom bar with three sections (left, center, right). Items can have icons and click handlers.

App Components (``stx-app-*``)
-------------------------------

Reusable in-app widgets that live inside the content area.

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Component
     - Description
   * - **FileBrowser**
     - Tree view for navigating file hierarchies. Supports expand/collapse directories, file-type icons, and selection callbacks.
   * - **PackageDocsSidebar**
     - Navigable sidebar for browsing SciTeX package documentation. Fetches from API and renders grouped, clickable items.

BaseComponent
-------------

All components (except ThemeProvider) extend ``BaseComponent``, which provides:

- **Container resolution** — accepts CSS selector or HTMLElement
- **Event dispatch** — ``emit(name, detail)`` fires CustomEvents on the container
- **Lifecycle** — ``destroy()`` cleans up DOM

CSS Naming Convention
---------------------

- Shell: ``stx-shell-{component}__{element}--{modifier}``
- App: ``stx-app-{component}__{element}--{modifier}``

CSS custom properties (``--stx-app-accent``, ``--text-primary``, etc.) are shared across both categories via ``theme.css``.
