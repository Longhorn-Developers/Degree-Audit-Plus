import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { OptionsStore } from "../storage/preferences";

type ExpandOut<T> = T extends infer R ? { [K in keyof R]: R[K] } : never;
type Shape = Record<string, { value: unknown }>;
export type StoredPreferenceValue<T> = {
	value: T;
	key: string;
};

export type EphemeralPrefernceValue<T> = {
	value: T;
};

// type PreferencesContext = {
// 	isMounted: boolean;
// } & FlattenedAndExpandedValues<EphemeralPreferences> &
// 	FlattenedAndExpandedValues<StoredPreferences>;

type PreferencesContext = {
	isMounted: boolean;

	luminosity: PREFERENCE_PreferredLuminosity;
	setLuminosity: (value: PREFERENCE_PreferredLuminosity) => void;
	toggleDarkMode: () => void;
	isDarkMode: () => boolean;

	sidebarIsOpen: boolean;
	setSidebarIsOpen: (value: boolean) => void;
	toggleSidebar: () => void;
	sidebarSize: number;
	isDraggingSidebar: boolean;
	setIsDraggingSidebar: (value: boolean) => void;
	ephemeralSetSidebarSize: (size: number) => void;
	setAndSaveSidebarSize: (size: number) => Promise<void>;
	saveSidebarSize: () => Promise<void>;
};

type AdditionalValues<T extends Record<string, { value: unknown }>> = {
	[K in keyof T as `${K & string}`]: {
		[k in keyof Omit<T[K], "key" | "value">]: T[K][k];
	};
};

type FlattenedAndExpandedValues<T extends Shape> = ExpandOut<
	{
		[K in keyof T]: T[K]["value"];
	} & {
		[K in keyof T as `set${Capitalize<K & string>}`]: (
			value: T[K]["value"]
		) => void;
	} & {
			[K in keyof AdditionalValues<T>]: AdditionalValues<T>[K] extends object
				? keyof AdditionalValues<T>[K] extends never
					? never
					: AdditionalValues<T>[K]
				: never;
		}[keyof AdditionalValues<T>] extends infer U
		? U extends object
			? { [K in keyof U]: U[K] }
			: never
		: never
>;

/** ---------------------------------------------------------------------------------------------------- **/

export type PREFERENCE_PreferredLuminosity = "system" | "dark" | "light";

export type StoredPreferences = {
	sidebarIsOpen: StoredPreferenceValue<boolean> & {
		toggleSidebar: () => void;
	};
	luminosity: StoredPreferenceValue<PREFERENCE_PreferredLuminosity> & {
		toggleDarkMode: () => void;
		isDarkMode: () => boolean;
	};
};

export type EphemeralPreferences = {};

export const DEFAULT_PREFERENCES: ExpandOut<
	StoredPreferences & EphemeralPreferences
> = {
	luminosity: {
		value: "system",
		key: "ui-theme",
		isDarkMode: () => false,
		toggleDarkMode: () => null,
	},
	sidebarIsOpen: {
		value: true,
		key: "sidebar-is-open",
		toggleSidebar: () => null,
	},
};

const PreferencesProviderContext = createContext<PreferencesContext>(
	Object.entries(DEFAULT_PREFERENCES).reduce(
		(acc, [key, value]) => {
			return {
				...acc,
				[key]: value.value,
			};
		},
		{
			isMounted: false,
		} as PreferencesContext
	)
);

function getPrefersDarkMode() {
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function PreferencesProvider(props: { children: React.ReactNode }) {
	const [isMounted, setIsMounted] = useState(false);
	const [sidebarSize, setSidebarSize] = useState(400);
	const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
	const [sidebarIsOpen, setSidebarIsOpen] = useState(
		DEFAULT_PREFERENCES.sidebarIsOpen.value
	);
	const [luminosity, setLuminosity] = useState<PREFERENCE_PreferredLuminosity>(
		DEFAULT_PREFERENCES.luminosity.value
	);
	const isInitialMountRef = useRef(true);

	const darkOrLightLuminosity = useCallback(() => {
		return luminosity === "system"
			? getPrefersDarkMode()
				? "dark"
				: "light"
			: luminosity;
	}, [luminosity]);

	useEffect(() => {
		OptionsStore.all().then((values) => {
			setSidebarIsOpen(values.showSidebar);
			setLuminosity(values.luminosity);
			console.log("sidebar size", values.sidebarSize);
			setSidebarSize(values.sidebarSize);
		});

		setIsMounted(true);
		isInitialMountRef.current = false;
	}, [darkOrLightLuminosity]);

	const value: PreferencesContext = useMemo(() => {
		return {
			isMounted: isMounted,
			luminosity,
			setLuminosity: async (value: PREFERENCE_PreferredLuminosity) => {
				setLuminosity(value);
				await OptionsStore.set("luminosity", value);
			},
			toggleDarkMode: async () => {
				const oppositeLuminosity =
					darkOrLightLuminosity() === "dark" ? "light" : "dark";
				setLuminosity(oppositeLuminosity);
				await OptionsStore.set("luminosity", oppositeLuminosity);
			},
			isDarkMode: () => darkOrLightLuminosity() === "dark",
			sidebarIsOpen,
			setSidebarIsOpen: async (value: boolean) => {
				setSidebarIsOpen(value);
				await OptionsStore.set("showSidebar", value);
			},
			toggleSidebar: async () => {
				setSidebarIsOpen(!sidebarIsOpen);
				await OptionsStore.set("showSidebar", !sidebarIsOpen);
			},
			sidebarSize,
			isDraggingSidebar,
			setIsDraggingSidebar,
			ephemeralSetSidebarSize: (size: number) => {
				setSidebarSize(size);
			},
			saveSidebarSize: async () => {
				console.log("saving sidebar size", sidebarSize);
				await OptionsStore.set("sidebarSize", sidebarSize);
			},
			setAndSaveSidebarSize: async (size: number) => {
				setSidebarSize(size);
				await OptionsStore.set("sidebarSize", size);
			},
		};
	}, [isMounted, luminosity, sidebarIsOpen, sidebarSize]);

	if (!isMounted) {
		return null;
	}

	return (
		<PreferencesProviderContext.Provider {...props} value={value}>
			<script
				dangerouslySetInnerHTML={{
					__html: `
					const storedTheme = localStorage.getItem("${DEFAULT_PREFERENCES.luminosity.key}");
					if (storedTheme) {
						document.documentElement.classList.add(storedTheme);
					}`,
				}}
			/>
			{props.children}
		</PreferencesProviderContext.Provider>
	);
}

export const usePreferences = () => {
	const context = useContext(PreferencesProviderContext);

	if (!context.isMounted)
		throw new Error("usePreferences must be used within a PreferencesProvider");

	return context;
};
