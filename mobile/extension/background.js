// ONE MORE extension: an optional once-a-day reminder that a new Daily Arena is live (on by default, one tap to turn
// off in the popup). No browsing data is read, collected or sent anywhere.
const ALARM = "om-daily";
const PLAY = "https://onemoregame.me/play?utm_source=chrome_ext&utm_medium=reminder";

function nextAt(hour) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= Date.now() + 60_000) d.setDate(d.getDate() + 1);
  return d.getTime();
}

async function schedule() {
  const { reminders = true, hour = 19 } = await chrome.storage.sync.get(["reminders", "hour"]);
  await chrome.alarms.clear(ALARM);
  if (reminders) chrome.alarms.create(ALARM, { when: nextAt(hour), periodInMinutes: 24 * 60 });
}

chrome.runtime.onInstalled.addListener(() => { void schedule(); });
chrome.runtime.onStartup.addListener(() => { void schedule(); });
chrome.storage.onChanged.addListener((changes) => { if (changes.reminders || changes.hour) void schedule(); });

chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== ALARM) return;
  const { reminders = true } = await chrome.storage.sync.get("reminders");
  if (!reminders) return;
  chrome.notifications.create("om-daily", {
    type: "basic", iconUrl: "icons/icon-128.png", priority: 0,
    title: "Today's arena is live",
    message: "One 60-second run. Can you beat yesterday's score?",
  });
});

chrome.notifications.onClicked.addListener((id) => {
  if (id !== "om-daily") return;
  chrome.tabs.create({ url: PLAY });
  chrome.notifications.clear(id);
});
