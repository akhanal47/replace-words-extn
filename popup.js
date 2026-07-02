const DEFAULT_SETTINGS = {
  enabled: true,
  replacements: []
};

const enabledToggle = document.querySelector("#enabled-toggle");
const form = document.querySelector("#replacement-form");
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
  enabledToggle.querySelector("strong").textContent = settings.enabled ? "ON" : "OFF";
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

enabledToggle.addEventListener("click", async () => {
  settings.enabled = !settings.enabled;
  await saveSettings();
  render();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const find = findInput.value.trim();
  if (!find) return;

  settings.replacements.push({
    find,
    replace: replaceInput.value
  });

  findInput.value = "";
  replaceInput.value = "";
  await saveSettings();
  render();
});

chrome.storage.sync.get(DEFAULT_SETTINGS, (savedSettings) => {
  settings = normalizeSettings(savedSettings);
  render();
});
