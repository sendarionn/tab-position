const form = document.querySelector("#position-form");
const status = document.querySelector("#status");
let statusTimer;

async function loadSetting() {
  const { tabPosition = "left" } =
    await chrome.storage.sync.get("tabPosition");
  const allowedPositions = new Set([
    "left",
    "before-current",
    "after-current",
    "right",
  ]);
  form.elements.position.value = allowedPositions.has(tabPosition)
    ? tabPosition
    : "left";
}

form.addEventListener("change", async (event) => {
  if (event.target.name !== "position") return;

  await chrome.storage.sync.set({ tabPosition: event.target.value });
  status.textContent = "保存しました";
  status.classList.add("saved");

  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    status.textContent = "設定は自動で保存されます";
    status.classList.remove("saved");
  }, 1600);
});

loadSetting();
