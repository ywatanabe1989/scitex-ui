scitex-ui
=========

Shared frontend UI components for the SciTeX ecosystem.

Role in SciTeX Ecosystem
------------------------

``scitex-ui`` is the **shared React/TypeScript component library** for all SciTeX web
applications. It provides shell components (workspace frame, sidebar, header) and app
components (data-table, file-browser, selector-nav) with Shadow DOM isolation via
``AppSandbox``.

.. code-block:: text

   scitex (orchestrator, templates, CLI, MCP)
     |-- scitex-app              -- runtime SDK for apps
     |-- scitex-ui (this package) -- React/TS component library
     +-- figrecipe               -- reference app (consumes scitex-ui)

- **scitex** (`docs <https://scitex-python.readthedocs.io/>`_): Orchestrator that re-exports ``scitex.ui``
- **scitex-app** (`docs <https://scitex-app.readthedocs.io/>`_): Runtime SDK for app backends
- **figrecipe** (`docs <https://figrecipe.readthedocs.io/>`_): Reference app that consumes these components

.. toctree::
   :maxdepth: 2
   :caption: Contents

   quickstart
   components
   architecture
   app_developer_guide
   api/scitex_ui
