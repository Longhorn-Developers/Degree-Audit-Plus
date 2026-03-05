import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { OptionsStore } from "../../../lib/backend/sync-storage-wrapper";
import { ExpandOut } from "../../../lib/general-types";
import LoadingPage from "../components/loading-page";

export type StoredPreferenceValue<T> = {
  value: T;
  key: string;
};

/**
 * All the "user settings" style information. Basically stuff that is not real data but should survive a page refresh.
 */
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

  lastAuditId: string | null;
  updateLastAuditId: (value: string) => void;
};

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
  lastAuditId: StoredPreferenceValue<string | null> & {
    updateLastAuditId: (value: string) => void;
  };
};

export const DEFAULT_PREFERENCES: ExpandOut<StoredPreferences> = {
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
  lastAuditId: {
    value: null,
    key: "current-audit-id",
    updateLastAuditId: () => null,
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
  const [lastAuditId, setLastAuditId] = useState<string | null>(
    DEFAULT_PREFERENCES.lastAuditId.value,
  );
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
    lastAuditId,
    updateLastAuditId: async (value: string) => {
      setLastAuditId(value);
      await OptionsStore.set("lastAuditId", value);
    },
  };

  if (!isMounted) {
    return <LoadingPage />;
  }

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
