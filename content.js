const DEFAULT_SETTINGS = {
  enabled: true,
  replacements: []
};

let settings = DEFAULT_SETTINGS;
let observer = null;
const originalText = new WeakMap();
const touchedNodes = new Set();

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION"
]);

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createWholeWordRegExp(text) {
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(text)}(?![\\p{L}\\p{N}_])`, "giu");
}

function replaceText(text) {
  return settings.replacements.reduce((nextText, item) => {
    if (!item.find) return nextText;
    return nextText.replace(createWholeWordRegExp(item.find), item.replace);
  }, text);
}

function shouldSkipNode(node) {
  const parent = node.parentElement;
  return !parent || SKIP_TAGS.has(parent.tagName) || parent.isContentEditable;
}

function processTextNode(node) {
  if (shouldSkipNode(node)) return;

  if (!originalText.has(node)) {
    originalText.set(node, node.nodeValue);
  }

  const nextText = replaceText(originalText.get(node));
  if (node.nodeValue !== nextText) {
    node.nodeValue = nextText;
    touchedNodes.add(node);
  }
}

function walk(root) {
  if (!root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    processTextNode(root);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
    return;
  }

  if (SKIP_TAGS.has(root.tagName) || root.isContentEditable) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    processTextNode(node);
    node = walker.nextNode();
  }
}

function restoreText() {
  observer?.disconnect();
  observer = null;
  for (const node of touchedNodes) {
    const original = originalText.get(node);
    if (original !== undefined) {
      node.nodeValue = original;
    }
  }
  touchedNodes.clear();
  startObserver();
}

function applyReplacements() {
  observer?.disconnect();
  observer = null;
  walk(document.body);
  startObserver();
}

function startObserver() {
  if (observer || !document.body) return;

  observer = new MutationObserver((mutations) => {
    if (!settings.enabled) return;

    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        originalText.set(mutation.target, mutation.target.nodeValue);
        processTextNode(mutation.target);
      }

      for (const node of mutation.addedNodes) {
        walk(node);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true
  });
}

function updateSettings(nextSettings) {
  settings = {
    ...DEFAULT_SETTINGS,
    ...nextSettings,
    replacements: Array.isArray(nextSettings?.replacements) ? nextSettings.replacements : []
  };

  if (settings.enabled) {
    applyReplacements();
  } else {
    restoreText();
  }
}

chrome.storage.sync.get(DEFAULT_SETTINGS, updateSettings);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;

  updateSettings({
    ...settings,
    enabled: changes.enabled?.newValue ?? settings.enabled,
    replacements: changes.replacements?.newValue ?? settings.replacements
  });
});
