(() => {
  "use strict";

  const DEFAULT_COLOR = "#3b82f6";
  const HEX_COLOR = /^#[0-9a-f]{6}$/i;
  const colorInput = document.querySelector("#highlightColor");
  const colorValue = document.querySelector("#colorValue");
  const saveButton = document.querySelector("#saveColor");
  const saveMessage = document.querySelector("#saveMessage");
  const refreshButton = document.querySelector("#refreshScan");
  const refreshMessage = document.querySelector("#refreshMessage");

  const setColor = (value) => {
    const color = typeof value === "string" && HEX_COLOR.test(value)
      ? value.toLowerCase()
      : DEFAULT_COLOR;

    colorInput.value = color;
    colorValue.textContent = color.toUpperCase();
    document.documentElement.style.setProperty("--popup-accent", color);
  };

  chrome.storage.local.get({ highlightColor: DEFAULT_COLOR }, ({ highlightColor }) => {
    setColor(highlightColor);
  });

  colorInput.addEventListener("input", () => setColor(colorInput.value));

  saveButton.addEventListener("click", () => {
    chrome.storage.local.set({ highlightColor: colorInput.value }, () => {
      saveMessage.textContent = "Warna tersimpan dan langsung diterapkan.";
      setTimeout(() => { saveMessage.textContent = ""; }, 2200);
    });
  });

  const finishRefresh = (message) => {
    refreshButton.disabled = false;
    refreshButton.classList.remove("is-loading");
    refreshMessage.textContent = message;
    setTimeout(() => { refreshMessage.textContent = ""; }, 2400);
  };

  refreshButton.addEventListener("click", () => {
    refreshButton.disabled = true;
    refreshButton.classList.add("is-loading");
    refreshMessage.textContent = "Memindai equation...";

    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const [tab] = tabs || [];
      if (!tab?.id) {
        finishRefresh("Tab aktif tidak ditemukan.");
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: "rescan-equations" }, () => {
        if (chrome.runtime.lastError) {
          finishRefresh("Buka ChatGPT lalu reload extension.");
          return;
        }
        finishRefresh("Equation selesai dipindai ulang.");
      });
    });
  });
})();
