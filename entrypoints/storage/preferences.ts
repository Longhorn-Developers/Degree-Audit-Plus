import { createSyncStore, debugStore } from "chrome-extension-toolkit";
import { PREFERENCE_PreferredLuminosity } from "../providers/main-page";

/**
 * A store that is used for storing user options
 */
export interface IOptionsStore {
	showSidebar: boolean;
	luminosity: PREFERENCE_PreferredLuminosity;
	sidebarSize: number;
}

export const OptionsStore = createSyncStore<IOptionsStore>({
	showSidebar: true,
	luminosity: "system",
	sidebarSize: 300,
});

/**
 * Initializes the settings by retrieving the values from the OptionsStore.
 *
 * @returns A promise that resolves to an object satisfying the IOptionsStore interface.
 */
export const initSettings = async () =>
	({
		showSidebar: await OptionsStore.get("showSidebar"),
		luminosity: await OptionsStore.get("luminosity"),
		sidebarSize: await OptionsStore.get("sidebarSize"),
	} satisfies IOptionsStore);

// Clothing retailer right

debugStore({ OptionsStore });
