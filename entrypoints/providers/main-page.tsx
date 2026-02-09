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

  viewMode: PREFERENCE_ViewMode;
  setViewMode: (value: PREFERENCE_ViewMode) => void;
  toggleViewMode: () => void;
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
      value: T[K]["value"],
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
export type PREFERENCE_ViewMode = "audit" | "planner";

export type StoredPreferences = {
  sidebarIsOpen: StoredPreferenceValue<boolean> & {
    toggleSidebar: () => void;
  };
  luminosity: StoredPreferenceValue<PREFERENCE_PreferredLuminosity> & {
    toggleDarkMode: () => void;
    isDarkMode: () => boolean;
  };
  viewMode: StoredPreferenceValue<PREFERENCE_ViewMode> & {
    toggleViewMode: () => void;
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
  viewMode: {
    value: "audit",
    key: "view-mode",
    toggleViewMode: () => null,
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
    } as PreferencesContext,
  ),
);

export function PreferencesProvider(props: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<PREFERENCE_ViewMode>(
    DEFAULT_PREFERENCES.viewMode.value,
  );
  const [sidebarIsOpen, setSidebarIsOpen] = useState(
    DEFAULT_PREFERENCES.sidebarIsOpen.value,
  );
  const [luminosity, setLuminosity] = useState<PREFERENCE_PreferredLuminosity>(
    DEFAULT_PREFERENCES.luminosity.value,
  );
  const isInitialMountRef = useRef(true);

  function getPrefersDarkMode() {
    const a = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return a;
  }

  const darkOrLightLuminosity = useCallback(() => {
    return luminosity === "system"
      ? getPrefersDarkMode()
        ? "dark"
        : "light"
      : luminosity;
  }, [luminosity]);

  useEffect(() => {
    OptionsStore.get("showSidebar").then((value) => {
      setSidebarIsOpen(value);
    });
    OptionsStore.get("luminosity").then((value) => {
      setLuminosity(value);
    });
    OptionsStore.get("viewMode").then((value) => {
      setViewMode(value);
    });
    setIsMounted(true);
    isInitialMountRef.current = false;
  }, [darkOrLightLuminosity]);

  const value: PreferencesContext = {
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
    viewMode,
    setViewMode: async (value: PREFERENCE_ViewMode) => {
      setViewMode(value);
      await OptionsStore.set("viewMode", value);
    },
    toggleViewMode: async () => {
      setViewMode(viewMode === "audit" ? "planner" : "audit");
      await OptionsStore.set(
        "viewMode",
        viewMode === "audit" ? "planner" : "audit",
      );
    },
  };

  if (!isMounted) {
    return null;
  }

  console.log("value", value);

  return (
    <PreferencesProviderContext.Provider {...props} value={value}>
      <script
        dangerouslySetInnerHTML={{
          __html: `
          const storedTheme = localStorage.getItem("${DEFAULT_PREFERENCES.luminosity.key}");
          if (storedTheme) {
            document.documentElement.classList.add(storedTheme);
          }
        `,
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
