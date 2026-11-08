// Popup toolbar: links to the full game and the daily-reminder switch (stored in chrome.storage.sync).
const bar = document.getElementById("ext-bar");
const toggle = document.getElementById("ext-remind");
const open = (path, medium) => chrome.tabs.create({ url: `https://onemoregame.me${path}${path.includes("?") ? "&" : "?"}utm_source=chrome_ext&utm_medium=${medium}` });
document.getElementById("ext-daily").addEventListener("click", () => open("/play", "popup_daily"));
chrome.storage.sync.get("reminders").then(({ reminders = true }) => { toggle.checked = reminders; bar.hidden = false; });
toggle.addEventListener("change", () => chrome.storage.sync.set({ reminders: toggle.checked }));
