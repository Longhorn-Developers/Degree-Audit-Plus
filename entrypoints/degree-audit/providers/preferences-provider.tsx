import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { OptionsStore } from "../../../lib/backend/sync-storage-wrapper";
import { AuditId, ExpandOut, SetStateFn } from "../../../lib/general-types";
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
  setLuminosity: SetStateFn<PREFERENCE_PreferredLuminosity>;
  toggleDarkMode: () => void;
  isDarkMode: () => boolean;

  sidebarIsOpen: boolean;
  setSidebarIsOpen: SetStateFn<boolean>;
  toggleSidebar: () => void;

  viewMode: PREFERENCE_ViewMode;
  setViewMode: SetStateFn<PREFERENCE_ViewMode>;
  toggleViewMode: () => void;

  lastAuditId: AuditId | null;
  updateLastAuditId: SetStateFn<AuditId | null>;
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
    updateLastAuditId: SetStateFn<AuditId | null>;
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
  const [lastAuditId, setLastAuditId] = useState<AuditId | null>(
    DEFAULT_PREFERENCES.lastAuditId.value as AuditId | null,
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
  }, []);

  /** Keep <html class="dark"> in sync so @theme overrides and Tailwind `dark:` variants apply. */
  useEffect(() => {
    if (!isMounted) return;

    const applyDarkClassToDocument = () => {
      const isDark =
        luminosity === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
          : luminosity === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.remove("light", "system");
    };

    applyDarkClassToDocument();

    if (luminosity !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", applyDarkClassToDocument);
    return () => mq.removeEventListener("change", applyDarkClassToDocument);
  }, [isMounted, luminosity]);

  const value: PreferencesContext = {
    isMounted: isMounted,
    luminosity,
    setLuminosity: async (input) => {
      setLuminosity(input);
      await OptionsStore.set(
        "luminosity",
        typeof input === "function" ? input(luminosity) : input,
      );
    },
    toggleDarkMode: async () => {
      const oppositeLuminosity =
        darkOrLightLuminosity() === "dark" ? "light" : "dark";
      setLuminosity(oppositeLuminosity);
      await OptionsStore.set("luminosity", oppositeLuminosity);
    },
    isDarkMode: () => darkOrLightLuminosity() === "dark",
    sidebarIsOpen,
    setSidebarIsOpen: async (input) => {
      setSidebarIsOpen(input);
      await OptionsStore.set(
        "showSidebar",
        typeof input === "function" ? input(sidebarIsOpen) : input,
      );
    },
    toggleSidebar: async () => {
      setSidebarIsOpen(!sidebarIsOpen);
      await OptionsStore.set("showSidebar", !sidebarIsOpen);
    },
    viewMode,
    setViewMode: async (input) => {
      setViewMode(input);
      await OptionsStore.set(
        "viewMode",
        typeof input === "function" ? input(viewMode) : input,
      );
    },
    toggleViewMode: async () => {
      setViewMode(viewMode === "audit" ? "planner" : "audit");
      await OptionsStore.set(
        "viewMode",
        viewMode === "audit" ? "planner" : "audit",
      );
    },
    lastAuditId,
    updateLastAuditId: async (input) => {
      setLastAuditId(input);
      await OptionsStore.set(
        "lastAuditId",
        (typeof input === "function"
          ? input(lastAuditId)
          : input
        )?.toString() ?? null,
      );
    },
  };

  if (!isMounted) {
    return <LoadingPage />;
  }

  return (
    <PreferencesProviderContext.Provider {...props} value={value}>
      <div className="min-h-screen bg-background text-text">
        {props.children}
      </div>
    </PreferencesProviderContext.Provider>
  );
}

export const usePreferences = () => {
  const context = useContext(PreferencesProviderContext);

  if (!context.isMounted)
    throw new Error("usePreferences must be used within a PreferencesProvider");

  return context;
};
