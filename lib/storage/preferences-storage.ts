import { browser } from "wxt/browser";

export type PreferredLuminosity = "system" | "dark" | "light";
export type ViewMode = "audit" | "planner";

export interface Preferences {
  showSidebar: boolean;
  luminosity: PreferredLuminosity;
  viewMode: ViewMode;
  lastAuditId: string | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  showSidebar: true,
  luminosity: "system",
  viewMode: "audit",
  lastAuditId: null,
};

export async function getPreference<K extends keyof Preferences>(
  key: K,
): Promise<Preferences[K]> {
  const stored = await browser.storage.sync.get(key);
  return (
    (stored[key] as Preferences[K] | undefined) ?? DEFAULT_PREFERENCES[key]
  );
}

export function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): Promise<void> {
  return browser.storage.sync.set({ [key]: value });
}

export async function initPreferences(): Promise<Preferences> {
  const [showSidebar, luminosity, viewMode, lastAuditId] = await Promise.all([
    getPreference("showSidebar"),
    getPreference("luminosity"),
    getPreference("viewMode"),
    getPreference("lastAuditId"),
  ]);
  return { showSidebar, luminosity, viewMode, lastAuditId };
}
