#!/usr/bin/env python3
"""Django app configuration for scitex-ui."""

from django.apps import AppConfig


class ScitexUiConfig(AppConfig):
    name = "scitex_ui"
    verbose_name = "SciTeX UI Components"
    default_auto_field = "django.db.models.BigAutoField"
