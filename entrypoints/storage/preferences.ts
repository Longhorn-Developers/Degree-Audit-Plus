import {
	PREFERENCE_PreferredLuminosity,
	PREFERENCE_ViewMode,
} from "../providers/main-page";

/**
 * A store that is used for storing user options
 */
export interface IOptionsStore {
	showSidebar: boolean;
	luminosity: PREFERENCE_PreferredLuminosity;
	viewMode: PREFERENCE_ViewMode;
}

const defaultOptions: IOptionsStore = {
	showSidebar: true,
	luminosity: "system",
	viewMode: "audit",
};

type StorageKey = keyof IOptionsStore;

const syncStorage =
	typeof chrome !== "undefined" && chrome.storage?.sync
		? chrome.storage.sync
		: null;

const readLocalStorage = <T>(key: string): T | undefined => {
	if (typeof localStorage === "undefined") {
		return undefined;
	}

	const raw = localStorage.getItem(key);
	if (!raw) {
		return undefined;
	}

	try {
		return JSON.parse(raw) as T;
	} catch {
		return undefined;
	}
};

const writeLocalStorage = (key: string, value: unknown) => {
	if (typeof localStorage === "undefined") {
		return;
	}

	localStorage.setItem(key, JSON.stringify(value));
};

const readSyncStorage = async <T>(key: string): Promise<T | undefined> => {
	if (!syncStorage) {
		return readLocalStorage<T>(key);
	}

	return await new Promise((resolve, reject) => {
		syncStorage.get(key, (result) => {
			const error = chrome.runtime?.lastError;
			if (error) {
				reject(error);
				return;
			}
			resolve(result[key] as T | undefined);
		});
	});
};

const writeSyncStorage = async (key: string, value: unknown) => {
	if (!syncStorage) {
		writeLocalStorage(key, value);
		return;
	}

	return await new Promise<void>((resolve, reject) => {
		syncStorage.set({ [key]: value }, () => {
			const error = chrome.runtime?.lastError;
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
};

export const OptionsStore = {
	async get<K extends StorageKey>(key: K): Promise<IOptionsStore[K]> {
		const stored = await readSyncStorage<IOptionsStore[K]>(key);
		if (stored === undefined) {
			return defaultOptions[key];
		}
		return stored;
	},
	async set<K extends StorageKey>(key: K, value: IOptionsStore[K]) {
		await writeSyncStorage(key, value);
	},
};

/**
 * Initializes the settings by retrieving the values from the OptionsStore.
 *
 * @returns A promise that resolves to an object satisfying the IOptionsStore interface.
 */
export const initSettings = async () =>
	({
		showSidebar: await OptionsStore.get("showSidebar"),
		luminosity: await OptionsStore.get("luminosity"),
		viewMode: await OptionsStore.get("viewMode"),
	}) satisfies IOptionsStore;
