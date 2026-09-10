(() => {
  "use strict";

  const SELECTOR = "[data-math-source], .katex";
  const EQUATION_CLASS = "tm-click-copy-unicode";
  const COPIED_CLASS = "tm-unicode-copied";
  const DEFAULT_HIGHLIGHT = "#3b82f6";
  const HEX_COLOR = /^#[0-9a-f]{6}$/i;

  const readSource = (element) =>
    element.getAttribute("data-math-source") ||
    element.querySelector('annotation[encoding="application/x-tex"]')?.textContent ||
    "";

  const formatUnicode = (source) => {
    let mathText = source
      .trim()
      .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
      .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
      .replace(/^\$([\s\S]*)\$$/, "$1")
      .trim()
      .replace(/\s*\n\s*/g, " ")
      .replace(/\\frac\s*(\d)\s*(\d)/g, "\\frac{$1}{$2}");

    mathText = mathText.replace(
      /\\(overrightarrow|overleftarrow)\s*\{([^}]+)\}\s*_(\{[^}]+\}|[a-zA-Z0-9]+)/g,
      "\\$1{$2_$3}"
    );

    return "$" + mathText.replace(/\\tag\{([^}]+)\}/g, "#($1)").trim() + "$";
  };

  const rgba = (hex, alpha) => {
    const channels = [0, 2, 4].map((start) =>
      Number.parseInt(hex.slice(1 + start, 3 + start), 16)
    );
    return `rgba(${channels.join(", ")}, ${alpha})`;
  };

  const applyHighlightColor = (value) => {
    const color = typeof value === "string" && HEX_COLOR.test(value)
      ? value
      : DEFAULT_HIGHLIGHT;
    const root = document.documentElement;

    root.style.setProperty("--tm-highlight", color);
    root.style.setProperty("--tm-highlight-soft", rgba(color, 0.10));
    root.style.setProperty("--tm-highlight-hover", rgba(color, 0.20));
    root.style.setProperty("--tm-highlight-active", rgba(color, 0.30));
    root.style.setProperty("--tm-highlight-copied", rgba(color, 0.32));
    root.style.setProperty("--tm-highlight-border", rgba(color, 0.35));
    root.style.setProperty("--tm-highlight-border-strong", rgba(color, 0.70));
  };

  const showCopied = (host) => {
    host.classList.add(COPIED_CLASS);
    setTimeout(() => host.classList.remove(COPIED_CLASS), 1200);
  };

  const handleClick = (event) => {
    const target = event.target instanceof Element
      ? event.target.closest(SELECTOR)
      : null;
    if (!target) return;

    const host = target.closest("[data-math-source]") || target;
    if (!host.dataset.tmClickCopyUnicode) return;

    event.preventDefault();
    event.stopPropagation();

    const unicodeMath = formatUnicode(readSource(host));
    if (!unicodeMath || unicodeMath === "$$") return;

    navigator.clipboard.writeText(unicodeMath)
      .then(() => showCopied(host))
      .catch((error) => console.error("Gagal menyalin equation:", error));
  };

  const markElement = (element) => {
    const host = element.closest("[data-math-source]") || element;
    if (host.dataset.tmClickCopyUnicode || !readSource(host)) return;

    host.dataset.tmClickCopyUnicode = "true";
    host.classList.add(EQUATION_CLASS);
    host.title = "Klik untuk menyalin ke Word";
  };

  const scan = (root) => {
    if (!(root instanceof Element) &&
        !(root instanceof Document) &&
        !(root instanceof DocumentFragment)) return;

    if (root instanceof Element && root.matches(SELECTOR)) markElement(root);
    root.querySelectorAll(SELECTOR).forEach(markElement);
  };

  const style = document.createElement("style");
  style.textContent = `
    .${EQUATION_CLASS} {
      background: var(--tm-highlight-soft, rgba(59, 130, 246, 0.10)) !important;
      border-radius: 5px;
      padding: 2px 4px;
      cursor: pointer;
      position: relative;
      transition: background 0.15s ease, box-shadow 0.15s ease;
    }

    .${EQUATION_CLASS}:hover {
      background: var(--tm-highlight-hover, rgba(59, 130, 246, 0.20)) !important;
      box-shadow: inset 0 0 0 1px var(--tm-highlight-border, rgba(59, 130, 246, 0.35));
    }

    .${EQUATION_CLASS}:active {
      background: var(--tm-highlight-active, rgba(59, 130, 246, 0.30)) !important;
    }

    .${EQUATION_CLASS}.${COPIED_CLASS} {
      background: var(--tm-highlight-copied, rgba(59, 130, 246, 0.32)) !important;
      box-shadow: inset 0 0 0 1px var(--tm-highlight-border-strong, rgba(59, 130, 246, 0.70));
    }

    .${EQUATION_CLASS}.${COPIED_CLASS}::after {
      content: "Copied!";
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--tm-highlight, #3b82f6);
      color: white;
      font-size: 12px;
      font-weight: bold;
      font-family: sans-serif;
      padding: 3px 8px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      margin-bottom: 4px;
      z-index: 9999;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      animation: tm-fade-in-up 0.2s ease-out forwards;
    }

    @keyframes tm-fade-in-up {
      from { opacity: 0; transform: translate(-50%, 5px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
  `;
  applyHighlightColor(DEFAULT_HIGHLIGHT);
  document.head.appendChild(style);

  if (globalThis.chrome?.storage) {
    chrome.storage.local.get({ highlightColor: DEFAULT_HIGHLIGHT }, ({ highlightColor }) => {
      applyHighlightColor(highlightColor);
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.highlightColor) {
        applyHighlightColor(changes.highlightColor.newValue);
      }
    });
  }

  document.addEventListener("click", handleClick, true);
  scan(document.body);

  let scanTimeout;
  const scheduleScan = (nodes) => {
    const uniqueNodes = [...new Set(nodes)].filter(Boolean);
    if (!uniqueNodes.length) return;

    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => uniqueNodes.forEach(scan), 100);
  };

  const observer = new MutationObserver((mutations) => {
    const nodes = [];

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        nodes.push(mutation.target, ...mutation.addedNodes);
      } else if (mutation.type === "attributes") {
        nodes.push(mutation.target);
      } else if (mutation.type === "characterData") {
        nodes.push(mutation.target.parentElement);
      }
    }

    scheduleScan(nodes);
  });

  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-math-source"],
    characterData: true
  });

  const rescanPage = () => {
    scheduleScan([document]);
    setTimeout(() => scheduleScan([document]), 250);
  };

  if (globalThis.chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type !== "rescan-equations") return;
      rescanPage();
      sendResponse({ ok: true });
    });
  }

  window.addEventListener("popstate", rescanPage);
  window.addEventListener("hashchange", rescanPage);
  window.addEventListener("focus", rescanPage);
  window.addEventListener("pageshow", rescanPage);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") rescanPage();
  });
})();
