const DEFAULT_POSITION = "left";
const previousActiveTabByWindow = new Map();

async function getPosition() {
  const { tabPosition = DEFAULT_POSITION } =
    await chrome.storage.sync.get("tabPosition");
  return tabPosition;
}

async function rememberCurrentActiveTabs() {
  const tabs = await chrome.tabs.query({ active: true });
  for (const tab of tabs) {
    if (tab.windowId !== undefined && tab.id !== undefined) {
      previousActiveTabByWindow.set(tab.windowId, tab.id);
    }
  }
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const { tabPosition } = await chrome.storage.sync.get("tabPosition");
  if (!tabPosition) {
    await chrome.storage.sync.set({ tabPosition: DEFAULT_POSITION });
  }
  await rememberCurrentActiveTabs();

  if (reason === "install") {
    await chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onStartup.addListener(rememberCurrentActiveTabs);

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  previousActiveTabByWindow.set(windowId, tabId);
});

chrome.windows.onRemoved.addListener((windowId) => {
  previousActiveTabByWindow.delete(windowId);
});

chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.id === undefined || tab.windowId === undefined) return;

  // Capture this before the newly created tab becomes active.
  const referenceTabId =
    tab.openerTabId ?? previousActiveTabByWindow.get(tab.windowId);

  try {
    const window = await chrome.windows.get(tab.windowId);
    if (window.type !== "normal") return;

    const position = await getPosition();
    const tabs = await chrome.tabs.query({ windowId: tab.windowId });
    const pinnedCount = tabs.filter((item) => item.pinned).length;

    let targetIndex;
    if (position === "left") {
      targetIndex = pinnedCount;
    } else if (position === "right") {
      targetIndex = -1;
    } else {
      const opener = tabs.find((item) => item.id === referenceTabId);
      if (!opener) return;

      targetIndex =
        position === "before-current" ? opener.index : opener.index + 1;
      targetIndex = Math.max(targetIndex, pinnedCount);
    }

    await chrome.tabs.move(tab.id, { index: targetIndex });
  } catch (error) {
    // The tab may have been closed or moved to another window meanwhile.
    console.debug("tab-position: tab could not be moved.", error);
  }
});
