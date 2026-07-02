const DEFAULT_SETTINGS = {
  enabled: true,
  replacements: []
};

const enabledToggle = document.querySelector("#enabled-toggle");
const enabledStatus = document.querySelector("#enabled-status");
const enabledTrack = enabledToggle.querySelector(".track");
const form = document.querySelector("#replacement-form");
const bulkForm = document.querySelector("#bulk-form");
const bulkInput = document.querySelector("#bulk-replacements");
const findInput = document.querySelector("#find");
const replaceInput = document.querySelector("#replace");
const list = document.querySelector("#replacement-list");
const template = document.querySelector("#replacement-template");

let settings = DEFAULT_SETTINGS;

function saveSettings() {
  return chrome.storage.sync.set(settings);
}

function render() {
  enabledToggle.setAttribute("aria-pressed", String(settings.enabled));
  enabledToggle.setAttribute(
    "aria-label",
    settings.enabled ? "Turn word replacement off" : "Turn word replacement on"
  );
  enabledTrack.classList.toggle("on", settings.enabled);
  enabledStatus.textContent = settings.enabled ? "Replacement: ON" : "Replacement: OFF";
  list.replaceChildren();

  settings.replacements.forEach((item, index) => {
    const node = template.content.cloneNode(true);
    node.querySelector(".pair").textContent = `${item.find} -> ${item.replace}`;
    node.querySelector(".remove").addEventListener("click", async () => {
      settings.replacements.splice(index, 1);
      await saveSettings();
      render();
    });
    list.append(node);
  });
}

function normalizeSettings(savedSettings) {
  return {
    ...DEFAULT_SETTINGS,
    ...savedSettings,
    replacements: Array.isArray(savedSettings?.replacements) ? savedSettings.replacements : []
  };
}

function upsertReplacement(find, replace) {
  const existing = settings.replacements.find(
    (item) => item.find.toLowerCase() === find.toLowerCase()
  );

  if (existing) {
    existing.find = find;
    existing.replace = replace;
  } else {
    settings.replacements.push({ find, replace });
  }
}

enabledToggle.addEventListener("click", async () => {
  settings.enabled = !settings.enabled;
  await saveSettings();
  render();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const find = findInput.value.trim();
  if (!find) return;

  upsertReplacement(find, replaceInput.value);

  findInput.value = "";
  replaceInput.value = "";
  await saveSettings();
  render();
});

bulkForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  let importedCount = 0;

  bulkInput.value.split(/\r?\n/).forEach((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) return;

    const find = line.slice(0, separatorIndex).trim();
    const replace = line.slice(separatorIndex + 1).trim();
    if (!find) return;

    upsertReplacement(find, replace);
    importedCount += 1;
  });

  if (!importedCount) return;

  bulkInput.value = "";
  await saveSettings();
  render();
});

chrome.storage.sync.get(DEFAULT_SETTINGS, (savedSettings) => {
  settings = normalizeSettings(savedSettings);
  render();
});
