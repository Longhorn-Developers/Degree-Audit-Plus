import { storage } from "wxt/utils/storage";

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

// One typed declaration per key — replaces the generic get/set pair.
// WXT storage.defineItem gives us typed get/set, versioning, and watch().
export const showSidebarItem = storage.defineItem<boolean>("sync:showSidebar", {
  defaultValue: DEFAULT_PREFERENCES.showSidebar,
});

export const luminosityItem = storage.defineItem<PreferredLuminosity>(
  "sync:luminosity",
  { defaultValue: DEFAULT_PREFERENCES.luminosity },
);

export const viewModeItem = storage.defineItem<ViewMode>("sync:viewMode", {
  defaultValue: DEFAULT_PREFERENCES.viewMode,
});

export const lastAuditIdItem = storage.defineItem<string | null>(
  "sync:lastAuditId",
  { defaultValue: DEFAULT_PREFERENCES.lastAuditId },
);

// Read all preferences at once for the initial provider load. Individual
// writes go straight through the typed items (e.g. luminosityItem.setValue).
export async function initPreferences(): Promise<Preferences> {
  const [showSidebar, luminosity, viewMode, lastAuditId] = await Promise.all([
    showSidebarItem.getValue(),
    luminosityItem.getValue(),
    viewModeItem.getValue(),
    lastAuditIdItem.getValue(),
  ]);
  return { showSidebar, luminosity, viewMode, lastAuditId };
}
