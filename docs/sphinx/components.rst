Components
==========

scitex-ui provides 11 reusable UI components organized into two categories:

Shell Components
----------------

Components that form the workspace frame (layout, navigation, chrome).

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Component
     - Description
   * - **AppShell**
     - Workspace layout with collapsible sidebar, accent colors
   * - **ThemeProvider**
     - Light/dark theme manager with semantic color tokens
   * - **StatusBar**
     - Bottom bar with left/center/right sections, optional theme toggle
   * - **Resizer**
     - Draggable panel divider with snap, collapse, and localStorage persistence

App Components
--------------

Components used within app content areas.

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Component
     - Description
   * - **FileBrowser**
     - Tree view for file navigation with extension filter and image badges
   * - **FileTabs**
     - Open file tab bar with drag reorder, rename, and dirty indicators
   * - **MediaViewer**
     - Display images (zoom/pan), PDFs, and diagrams
   * - **ConfirmModal**
     - Modern confirmation dialog replacing ``window.confirm()``
   * - **Dropdown**
     - Context menu with items, icons, separators, and click-outside-to-close
   * - **Tooltip**
     - Auto-positioned tooltips via ``data-tooltip`` attributes
   * - **PackageDocsSidebar**
     - Navigable sidebar for SciTeX package documentation

Usage (TypeScript)
------------------

Each component follows the same pattern:

.. code-block:: typescript

   // Import from the component's index
   import { FileBrowser } from 'scitex_ui/ts/app/file-browser';

   const browser = new FileBrowser({
     container: '#sidebar',
     onFileSelect: (node) => openFile(node.path),
     extensions: ['.yaml', '.yml'],
     showFileCount: true,
   });

   browser.setData(treeData);

CSS
---

Each component has a corresponding CSS file using BEM naming:

- Shell components: ``stx-shell-*`` (e.g., ``stx-shell-resizer``)
- App components: ``stx-app-*`` (e.g., ``stx-app-file-browser``)

All components use CSS custom properties from ``theme.css`` for consistent
light/dark theme support.
