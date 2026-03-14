Quick Start
===========

Installation
------------

.. code-block:: bash

   pip install scitex-ui

Django Setup
------------

Add ``scitex_ui`` to your ``INSTALLED_APPS``:

.. code-block:: python

   INSTALLED_APPS = [
       # ...
       "scitex_ui",
   ]

Static assets (TypeScript + CSS) are automatically discoverable by
Django's ``AppDirectoriesFinder``.

Python API
----------

List registered components:

.. code-block:: python

   import scitex_ui

   for name in scitex_ui.list_components():
       meta = scitex_ui.get_component(name)
       print(f"{name} v{meta.version}")
