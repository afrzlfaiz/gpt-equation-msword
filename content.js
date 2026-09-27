(() => {
  "use strict";

  const SELECTOR = "[data-math-source], .katex, .MathJax, mjx-container, math";
  const DELIMITED_MATH = /\\{1,2}\([\s\S]*?\\{1,2}\)|\\{1,2}\[[\s\S]*?\\{1,2}\]|\$\$[\s\S]*?\$\$|(?:^|[^\\])\$[^$\n]+\$/;
  const BLOCK_TAGS = new Set([
    "ADDRESS", "ARTICLE", "BLOCKQUOTE", "DIV", "DL", "FIELDSET", "FIGURE",
    "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER",
    "HR", "LI", "OL", "P", "PRE", "SECTION", "TABLE", "TD", "TH", "TR", "UL"
  ]);
  const EQUATION_CLASS = "tm-click-copy-unicode";
  const COPIED_CLASS = "tm-unicode-copied";
  const DEFAULT_HIGHLIGHT = "#3b82f6";
  const HEX_COLOR = /^#[0-9a-f]{6}$/i;

  const readSource = (element) =>
    element.getAttribute("data-math-source") ||
    element.querySelector(
      'annotation[encoding="application/x-tex"], annotation[encoding="LaTeX"]'
    )?.textContent ||
    "";

  const formatUnicode = (source) => {
    let mathText = source
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim()
      .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
      .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
      .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
      .replace(/^\$([\s\S]*)\$$/, "$1")
      .trim()
      .replace(/\s*\n\s*/g, " ")
      .replace(/\\frac\s*(\d)\s*(\d)/g, "\\frac{$1}{$2}")
      .replace(/\\_/g, "_");

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

  let toastTimeout;
  const showCopiedToast = () => {
    let toast = document.getElementById("tm-unicode-copy-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "tm-unicode-copy-toast";
      toast.textContent = "Copied!";
      document.body.appendChild(toast);
    }

    clearTimeout(toastTimeout);
    toast.classList.add("tm-visible");
    toastTimeout = setTimeout(() => toast.classList.remove("tm-visible"), 1400);
  };

  const copyWithTextarea = (text) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
    document.body.appendChild(textarea);
    textarea.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    } finally {
      textarea.remove();
    }
    return copied;
  };

  const copyText = async (text) => {
    if (copyWithTextarea(text)) return;
    await navigator.clipboard.writeText(text);
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

    copyText(unicodeMath)
      .then(() => {
        showCopied(host);
        showCopiedToast();
      })
      .catch((error) => console.error("Gagal menyalin equation:", error));
  };

  const isEditable = (node) => {
    const element = node instanceof Element ? node : node?.parentElement;
    return Boolean(element?.closest("input, textarea, [contenteditable='true'], [contenteditable='plaintext-only']"));
  };

  const serializeClipboardNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
      return "";
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === "BR") return "\n";

      if (node.matches(SELECTOR)) {
        const source = readSource(node);
        if (source) return formatUnicode(source);
      }
    }

    const content = [...node.childNodes].map(serializeClipboardNode).join("");
    return node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.tagName)
      ? content + "\n"
      : content;
  };

  const normalizeCopiedText = (text) =>
    text
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const formatDelimitedMath = (text) => text
    .replace(/\\{1,2}\[([\s\S]*?)\\{1,2}\]/g, (_, source) => formatUnicode(source))
    .replace(/\\{1,2}\(([\s\S]*?)\\{1,2}\)/g, (_, source) => formatUnicode(source))
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, source) => formatUnicode(source))
    .replace(/\$([^$\n]+)\$/g, (_, source) => formatUnicode(source));

  const escapeHtml = (text) => text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));

  const handleCopy = (event) => {
    if (!event.clipboardData) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || isEditable(selection.anchorNode)) return;

    const rawText = selection.toString();
    const fragment = selection.getRangeAt(0).cloneContents();
    const hasRenderedMath = [...fragment.querySelectorAll(SELECTOR)].some((node) => readSource(node));
    if (!hasRenderedMath && !DELIMITED_MATH.test(rawText)) return;

    const copiedText = formatDelimitedMath(
      normalizeCopiedText(serializeClipboardNode(fragment) || rawText)
    );
    if (!copiedText) return;

    event.clipboardData.setData("text/plain", copiedText);
    event.clipboardData.setData("text/html", escapeHtml(copiedText).replace(/\n/g, "<br>"));
    event.preventDefault();
    event.stopPropagation();
    showCopiedToast();
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

    #tm-unicode-copy-toast {
      position: fixed;
      left: 50%;
      bottom: 24px;
      z-index: 2147483647;
      padding: 8px 14px;
      border-radius: 8px;
      background: var(--tm-highlight, #3b82f6);
      color: white;
      font: 700 12px/1.2 sans-serif;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transform: translate(-50%, 8px);
      transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s ease;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.22);
    }

    #tm-unicode-copy-toast.tm-visible {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, 0);
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
  document.addEventListener("copy", handleCopy, true);
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
