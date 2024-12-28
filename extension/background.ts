import type { ActivityData } from "../app/components/activity-monitor";

chrome.runtime.onInstalled.addListener((): void => {
  void chrome.storage.local.set({ activities: [] });
});

chrome.tabs.onActivated.addListener((activeInfo): void => {
  void (async (): Promise<void> => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await trackActivity({
      url: tab.url,
      title: tab.title,
      timestamp: new Date(),
      type: 'browser'
    } as unknown as ActivityData);
  })();
});

async function trackActivity(data: ActivityData): Promise<void> {
  const { activities } = await chrome.storage.local.get('activities');
  await chrome.storage.local.set({
    activities: [...activities, data]
  });
} 