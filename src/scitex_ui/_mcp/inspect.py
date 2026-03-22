#!/usr/bin/env python3
"""Element Inspector MCP handlers — inspect DOM elements in the user's live browser.

These handlers are consumed by the scitex MCP server (scitex-python)
via `register_ui_tools()`. The JavaScript runs in the browser via
scitex.cloud.eval_js().
"""

from __future__ import annotations

import json


def _build_inspect_js(selector: str) -> str:
    """Build JS code to inspect a single element by CSS selector."""
    return f"""
(function() {{
  const selector = {json.dumps(selector)};
  const el = document.querySelector(selector);
  if (!el) return JSON.stringify({{error: 'Element not found: ' + selector}});

  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const info = {{
    url: location.href,
    timestamp: new Date().toISOString(),
    element: {{
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: (typeof el.className === 'string' ? el.className : '').split(/\\s+/).filter(c => c),
    }},
    attributes: {{}},
    computed: {{
      display: cs.display,
      position: cs.position,
      width: cs.width,
      height: cs.height,
      margin: cs.margin,
      padding: cs.padding,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      fontSize: cs.fontSize,
      zIndex: cs.zIndex,
      opacity: cs.opacity,
      visibility: cs.visibility,
      overflow: cs.overflow,
      cursor: cs.cursor,
      flexDirection: cs.flexDirection,
      flexGrow: cs.flexGrow,
      flexShrink: cs.flexShrink,
      flexBasis: cs.flexBasis,
      flex: cs.flex,
    }},
    inline: el.style.cssText || '',
    dimensions: {{ width: rect.width, height: rect.height, top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right }},
    scroll: {{ scrollTop: el.scrollTop, scrollLeft: el.scrollLeft }},
    content: (el.textContent || '').substring(0, 300),
    parentChain: [],
    matchingRules: [],
  }};

  for (let i = 0; i < el.attributes.length; i++) {{
    const a = el.attributes[i];
    info.attributes[a.name] = a.value;
  }}

  let p = el.parentElement;
  for (let d = 0; d < 5 && p; d++) {{
    let s = p.tagName.toLowerCase();
    if (p.id) s += '#' + p.id;
    if (p.className && typeof p.className === 'string') s += '.' + p.className.split(' ').filter(c=>c).join('.');
    info.parentChain.push(s);
    p = p.parentElement;
  }}

  try {{
    for (let i = 0; i < document.styleSheets.length; i++) {{
      try {{
        const sheet = document.styleSheets[i];
        if (!sheet.cssRules) continue;
        for (let j = 0; j < sheet.cssRules.length; j++) {{
          const rule = sheet.cssRules[j];
          if (rule instanceof CSSStyleRule) {{
            try {{
              if (el.matches(rule.selectorText)) {{
                info.matchingRules.push({{
                  selector: rule.selectorText,
                  css: rule.cssText.substring(0, 300),
                  source: sheet.href || '<inline>',
                }});
              }}
            }} catch(e) {{}}
          }}
        }}
      }} catch(e) {{}}
    }}
  }} catch(e) {{}}

  return JSON.stringify(info);
}})()
"""


def _build_inspect_multi_js(selector: str, limit: int = 10) -> str:
    """Build JS code to inspect multiple elements."""
    return f"""
(function() {{
  const els = document.querySelectorAll({json.dumps(selector)});
  const results = [];
  const limit = {limit};
  for (let i = 0; i < Math.min(els.length, limit); i++) {{
    const el = els[i];
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    results.push({{
      index: i,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: (typeof el.className === 'string' ? el.className : ''),
      computed: {{
        display: cs.display,
        position: cs.position,
        width: cs.width,
        height: cs.height,
        cursor: cs.cursor,
        flexDirection: cs.flexDirection,
      }},
      inline: el.style.cssText || '',
      rect: {{ width: rect.width, height: rect.height, top: rect.top, left: rect.left }},
      parent: el.parentElement ? (el.parentElement.tagName.toLowerCase() + (el.parentElement.id ? '#' + el.parentElement.id : '')) : null,
    }});
  }}
  return JSON.stringify({{ total: els.length, elements: results }});
}})()
"""


def inspect_element_handler(
    selector: str,
    timeout: int = 10,
) -> dict:
    """Inspect a single DOM element by CSS selector.

    Parameters
    ----------
    selector : str
        CSS selector (e.g., '#ws-worktree-resizer', '.panel-resizer').
    timeout : int
        JS evaluation timeout in seconds.

    Returns
    -------
    dict
        Element debug info including computed styles, dimensions,
        parent chain, inline styles, and matching CSS rules.
    """
    from scitex.cloud import eval_js

    js_code = _build_inspect_js(selector)
    result = eval_js(js_code, timeout=timeout)

    if not result.get("success"):
        return {
            "success": False,
            "error": result.get("error", "eval_js failed"),
            "hint": result.get("hint", ""),
        }

    try:
        data = json.loads(result.get("result", "{}"))
        if "error" in data:
            return {"success": False, "error": data["error"]}
        return {"success": True, "data": data}
    except (json.JSONDecodeError, TypeError) as e:
        return {
            "success": False,
            "error": f"Failed to parse: {e}",
            "raw": str(result.get("result", ""))[:500],
        }


def inspect_elements_handler(
    selector: str,
    limit: int = 10,
    timeout: int = 10,
) -> dict:
    """Inspect multiple DOM elements matching a CSS selector.

    Parameters
    ----------
    selector : str
        CSS selector (e.g., '.panel-resizer', '.stx-shell-sidebar').
    limit : int
        Maximum number of elements to return.
    timeout : int
        JS evaluation timeout in seconds.

    Returns
    -------
    dict
        Summary of each matching element with key properties.
    """
    from scitex.cloud import eval_js

    js_code = _build_inspect_multi_js(selector, limit)
    result = eval_js(js_code, timeout=timeout)

    if not result.get("success"):
        return {
            "success": False,
            "error": result.get("error", "eval_js failed"),
            "hint": result.get("hint", ""),
        }

    try:
        data = json.loads(result.get("result", "{}"))
        return {"success": True, "selector": selector, **data}
    except (json.JSONDecodeError, TypeError) as e:
        return {"success": False, "error": f"Failed to parse: {e}"}


# EOF
